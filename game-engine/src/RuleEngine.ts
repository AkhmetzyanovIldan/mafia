import { ActionType, PlayerStatus, RoleName, RoleTeam, WinCondition } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';
import type { Player } from './Player';
import type { NightActionCollection } from './NightActionCollection';
import type { VoteCollection } from './VoteCollection';

export interface NightResolution {
  killed: string[];
  healed: string[];
  investigations: Map<string, RoleTeam>;
  donChecks: Map<string, boolean>;
  advocateChecks: Map<string, RoleName | null>;
  journalistChecks: Map<string, boolean>;
  blockedPlayers: string[];
}

export interface VotingResolution {
  eliminated: string | null;
  tally: Map<string, number>;
}

export interface WinCheckResult {
  isOver: boolean;
  winner: WinCondition | null;
}

export class RuleEngine {
  /**
   * Validates a single night action against live player state.
   * Returns null if valid, or an error string if invalid.
   * Invalid actions are silently skipped — the night never throws.
   */
  private validateNightAction(
    action: IPlayerAction,
    playerMap: Map<string, Player>,
    nightNumber: number,
    blockedActors: Set<string>,
  ): string | null {
    const actor = playerMap.get(action.playerId);
    if (!actor) return `Unknown actor ${action.playerId}`;
    if (actor.status !== PlayerStatus.ALIVE) return `Actor ${action.playerId} is not alive`;
    if (!actor.role?.canActAtNight) return `Actor ${action.playerId} has no night action`;
    if (blockedActors.has(action.playerId)) return `Actor ${action.playerId} is blocked`;

    const target = playerMap.get(action.targetId);
    if (!target) return `Unknown target ${action.targetId}`;
    if (target.status !== PlayerStatus.ALIVE) return `Target ${action.targetId} is not alive`;

    switch (action.type) {
      case ActionType.KILL:
        if (actor.role.name !== RoleName.MAFIA && actor.role.name !== RoleName.DON)
          return `Actor ${action.playerId} cannot KILL`;
        if (action.playerId === action.targetId)
          return `Actor ${action.playerId} cannot kill themselves`;
        break;

      case ActionType.SHOOT:
        if (actor.role.name !== RoleName.SERGEANT)
          return `Actor ${action.playerId} cannot SHOOT`;
        if (actor.hasShot)
          return `Actor ${action.playerId} has already used their shot`;
        if (nightNumber === 0)
          return `Sergeant cannot act on the first night`;
        if (action.playerId === action.targetId)
          return `Actor ${action.playerId} cannot shoot themselves`;
        break;

      case ActionType.HEAL:
        if (actor.role.name !== RoleName.DOCTOR)
          return `Actor ${action.playerId} cannot HEAL`;
        break;

      case ActionType.BLOCK:
        if (actor.role.name !== RoleName.LOVER)
          return `Actor ${action.playerId} cannot BLOCK`;
        break;

      case ActionType.INVESTIGATE:
        if (
          actor.role.name !== RoleName.DETECTIVE &&
          actor.role.name !== RoleName.COMMISSIONER &&
          actor.role.name !== RoleName.DON &&
          actor.role.name !== RoleName.ADVOCATE &&
          actor.role.name !== RoleName.JOURNALIST
        ) return `Actor ${action.playerId} cannot INVESTIGATE`;
        if (actor.role.name === RoleName.ADVOCATE && nightNumber === 0)
          return `Advocate cannot act on the first night`;
        if (actor.role.name === RoleName.JOURNALIST) {
          if (!action.secondaryTargetId)
            return `Journalist requires two targets`;
          const secondary = playerMap.get(action.secondaryTargetId);
          if (!secondary) return `Unknown secondary target ${action.secondaryTargetId}`;
          if (secondary.status !== PlayerStatus.ALIVE)
            return `Secondary target ${action.secondaryTargetId} is not alive`;
        }
        break;

      default:
        return `Action type ${action.type} is not valid at night`;
    }

    return null;
  }

  resolveNight(collection: NightActionCollection, players: Player[], nightNumber: number): NightResolution {
    const actions = collection.getAll();
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // First pass: collect BLOCK actions to know who is blocked before validating others
    const blockedActors = new Set<string>();
    for (const action of actions) {
      if (action.type === ActionType.BLOCK) {
        const actor = playerMap.get(action.playerId);
        const target = playerMap.get(action.targetId);
        if (
          actor &&
          actor.status === PlayerStatus.ALIVE &&
          actor.role?.name === RoleName.LOVER &&
          target &&
          target.status === PlayerStatus.ALIVE
        ) {
          blockedActors.add(action.targetId);
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
      const error = this.validateNightAction(action, playerMap, nightNumber, blockedActors);
      if (error) {
        console.warn(`[RuleEngine] Skipping invalid night action: ${error}`);
        continue;
      }

      const actor = playerMap.get(action.playerId)!;

      switch (action.type) {
        case ActionType.INVESTIGATE: {
          const target = playerMap.get(action.targetId)!;
          switch (actor.role!.name) {
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
              const secondary = playerMap.get(action.secondaryTargetId!)!;
              if (target.role && secondary.role) {
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
          mafiaKillTargets.add(action.targetId);
          break;
        case ActionType.SHOOT:
          sergeantShotTargets.add(action.targetId);
          actor.hasShot = true;
          break;
        // BLOCK already handled in first pass
      }
    }

    const protectedTargets = new Set<string>(healTargets);
    const killed: string[] = [];

    if (mafiaKillTargets.size > 0) {
      const targets = [...mafiaKillTargets];
      const targetId = targets[Math.floor(Math.random() * targets.length)];
      if (!protectedTargets.has(targetId)) {
        const target = playerMap.get(targetId);
        if (target && target.status === PlayerStatus.ALIVE) {
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
          if (!killed.includes(targetId)) killed.push(targetId);
        }
      }
    }

    const healed = [...healTargets].filter((id) => mafiaKillTargets.has(id) || sergeantShotTargets.has(id));

    collection.clear();

    return {
      killed,
      healed,
      investigations,
      donChecks,
      advocateChecks,
      journalistChecks,
      blockedPlayers: [...blockedActors],
    };
  }

  resolveVoting(collection: VoteCollection, players: Player[]): VotingResolution {
    const tally = new Map<string, number>();

    for (const targetId of collection.getAll().values()) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }

    let eliminated: string | null = null;

    if (tally.size > 0) {
      const maxVotes = Math.max(...tally.values());
      const leaders = [...tally.entries()].filter(([, v]) => v === maxVotes);

      if (leaders.length === 1) {
        const [targetId] = leaders[0];
        const target = players.find((p) => p.id === targetId);
        if (target && target.status === PlayerStatus.ALIVE) {
          target.status = PlayerStatus.DEAD;
          eliminated = targetId;
        }
      }
    }

    collection.clear();
    return { eliminated, tally };
  }

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
