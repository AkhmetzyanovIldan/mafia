import { ActionType, PlayerStatus, RoleName, RoleTeam, WinCondition } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';
import type { Player } from './Player';
import type { NightActionCollection } from './NightActionCollection';

export interface NightResolution {
  /** Players killed this night (after heal cancellation). */
  killed: string[];
  /** Players saved by the doctor. */
  healed: string[];
  /** Investigation results: investigatorId → target's team. */
  investigations: Map<string, RoleTeam>;
  /** Don checks whether a target is Commissioner or Sergeant. */
  donChecks: Map<string, boolean>;
  /** Advocate checks return the target role name. */
  advocateChecks: Map<string, RoleName | null>;
  /** Journalist checks return whether the two players are on the same team. */
  journalistChecks: Map<string, boolean>;
  /** Players blocked by Lover this night. */
  blockedPlayers: string[];
}

export interface WinCheckResult {
  isOver: boolean;
  winner: WinCondition | null;
}

export class RuleEngine {
  /**
   * Resolves all night actions simultaneously in a single pass.
   *
   * Pipeline:
   *   1. Validate each submitted action.
   *   2. Collect blocked actors and mark vote restrictions.
   *   3. Process informational actions.
   *   4. Resolve mafia/don kill randomly.
   *   5. Resolve sergeant shots.
   *   6. Apply heals.
   *   7. Update deaths and clear the collection.
   */
  resolveNight(collection: NightActionCollection, players: Player[], nightNumber: number): NightResolution {
    const actions = collection.getAll();
    const playerMap = new Map(players.map((player) => [player.id, player]));

    const validationErrors: string[] = [];
    const blockedTargets = new Set<string>();

    for (const action of actions) {
      const actor = playerMap.get(action.playerId);
      if (!actor) {
        validationErrors.push(`Unknown actor ${action.playerId}`);
        continue;
      }
      if (actor.status !== PlayerStatus.ALIVE) {
        validationErrors.push(`Player ${action.playerId} is not alive and cannot act at night`);
      }
      if (!actor.role?.canActAtNight) {
        validationErrors.push(`Player ${action.playerId} is not permitted to act at night`);
      }
      if (actor.role?.name === RoleName.SERGEANT && nightNumber === 0) {
        validationErrors.push(`Sergeant cannot act on the first night`);
      }
      if (actor.role?.name === RoleName.ADVOCATE && nightNumber === 0) {
        validationErrors.push(`Advocate cannot act on the first night`);
      }
      if (action.type === ActionType.KILL) {
        if (actor.role?.name !== RoleName.MAFIA && actor.role?.name !== RoleName.DON) {
          validationErrors.push(`Player ${action.playerId} is not permitted to kill at night`);
        }
      }
      if (action.type === ActionType.HEAL) {
        if (actor.role?.name !== RoleName.DOCTOR) {
          validationErrors.push(`Player ${action.playerId} is not permitted to heal at night`);
        }
      }
      if (action.type === ActionType.SHOOT) {
        if (actor.role?.name !== RoleName.SERGEANT) {
          validationErrors.push(`Player ${action.playerId} is not permitted to shoot at night`);
        }
        if (actor.hasShot) {
          validationErrors.push(`Player ${action.playerId} has already used their shot`);
        }
      }
      if (action.type === ActionType.BLOCK) {
        if (actor.role?.name !== RoleName.LOVER) {
          validationErrors.push(`Player ${action.playerId} is not permitted to block at night`);
        }
      }
      if (action.type === ActionType.INVESTIGATE) {
        if (
          actor.role?.name !== RoleName.DETECTIVE &&
          actor.role?.name !== RoleName.COMMISSIONER &&
          actor.role?.name !== RoleName.DON &&
          actor.role?.name !== RoleName.ADVOCATE &&
          actor.role?.name !== RoleName.JOURNALIST
        ) {
          validationErrors.push(`Player ${action.playerId} is not permitted to investigate at night`);
        }
        if (actor.role?.name === RoleName.JOURNALIST && !action.secondaryTargetId) {
          validationErrors.push(`Journalist action requires two targets`);
        }
      }
      const target = playerMap.get(action.targetId);
      if (!target) {
        validationErrors.push(`Invalid night action target ${action.targetId}`);
      }
      if (action.type === ActionType.INVESTIGATE && !action.targetId) {
        validationErrors.push(`Investigate action requires a targetId`);
      }
      if (action.type === ActionType.INVESTIGATE && action.secondaryTargetId) {
        const otherTarget = playerMap.get(action.secondaryTargetId);
        if (!otherTarget) {
          validationErrors.push(`Invalid second target ${action.secondaryTargetId}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Night action validation failed: ${validationErrors.join('; ')}`);
    }

    for (const action of actions) {
      if (action.type === ActionType.BLOCK) {
        blockedTargets.add(action.targetId);
        const target = playerMap.get(action.targetId);
        if (target) {
          target.blockedFromVoting = true;
        }
      }
    }

    const investigations = new Map<string, RoleTeam>();
    const donChecks = new Map<string, boolean>();
    const advocateChecks = new Map<string, RoleName | null>();
    const journalistChecks = new Map<string, boolean>();
    const healTargets = new Set<string>();
    const mafiaKillTargets = new Set<string>();
    const sergeantShotTargets = new Set<string>();

    for (const action of actions) {
      if (blockedTargets.has(action.playerId)) {
        continue;
      }
      const actor = playerMap.get(action.playerId);
      if (!actor) continue;

      switch (action.type) {
        case ActionType.INVESTIGATE: {
          const target = playerMap.get(action.targetId);
          if (!target) break;
          switch (actor.role?.name) {
            case RoleName.DETECTIVE:
            case RoleName.COMMISSIONER:
              if (target.role) investigations.set(action.playerId, target.role.team);
              break;
            case RoleName.DON:
              donChecks.set(
                action.playerId,
                target.role?.name === RoleName.COMMISSIONER || target.role?.name === RoleName.SERGEANT,
              );
              break;
            case RoleName.ADVOCATE:
              advocateChecks.set(action.playerId, target.role?.name ?? null);
              break;
            case RoleName.JOURNALIST: {
              const secondary = action.secondaryTargetId ? playerMap.get(action.secondaryTargetId) : null;
              if (secondary && target.role && secondary.role) {
                journalistChecks.set(action.playerId, target.role.team === secondary.role.team);
              }
              break;
            }
          }
          break;
        }
        case ActionType.HEAL:
          healTargets.add(action.targetId);
          break;
        case ActionType.KILL:
          if (actor.role?.name === RoleName.MAFIA || actor.role?.name === RoleName.DON) {
            mafiaKillTargets.add(action.targetId);
          }
          break;
        case ActionType.SHOOT:
          if (actor.role?.name === RoleName.SERGEANT) {
            sergeantShotTargets.add(action.targetId);
            actor.hasShot = true;
          }
          break;
      }
    }

    const protectedTargets = new Set<string>(healTargets);
    const killed: string[] = [];

    if (mafiaKillTargets.size > 0) {
      const targets = [...mafiaKillTargets];
      const randomIndex = Math.floor(Math.random() * targets.length);
      const targetId = targets[randomIndex];
      if (!protectedTargets.has(targetId)) {
        const target = playerMap.get(targetId);
        if (target) {
          target.status = PlayerStatus.DEAD;
          killed.push(targetId);
        }
      }
    }

    for (const targetId of sergeantShotTargets) {
      if (!protectedTargets.has(targetId)) {
        const target = playerMap.get(targetId);
        if (target && target.status === PlayerStatus.ALIVE) {
          target.status = PlayerStatus.DEAD;
          if (!killed.includes(targetId)) {
            killed.push(targetId);
          }
        }
      }
    }

    const healed = [...healTargets].filter((targetId) => killed.includes(targetId));

    collection.clear();

    return {
      killed,
      healed,
      investigations,
      donChecks,
      advocateChecks,
      journalistChecks,
      blockedPlayers: [...blockedTargets],
    };
  }

  /**
   * Evaluates win conditions against the current player list.
   * Called after night resolution and after voting resolution.
   */
  checkWinConditions(players: Player[]): WinCheckResult {
    const alive = players.filter((p) => p.status === PlayerStatus.ALIVE);
    const aliveMafia = alive.filter((p) => p.role?.team === RoleTeam.MAFIA);
    const aliveTown = alive.filter((p) => p.role?.team === RoleTeam.TOWN);

    if (aliveMafia.length === 0) {
      return { isOver: true, winner: WinCondition.TOWN_WINS };
    }
    if (aliveMafia.length >= aliveTown.length) {
      return { isOver: true, winner: WinCondition.MAFIA_WINS };
    }
    return { isOver: false, winner: null };
  }
}
