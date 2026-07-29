import { GAME_CONSTANTS, GamePhase, GameSessionStatus, ActionType, RoleName } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';
import type { GameStateDto, GameSnapshotDto } from '@mafia/shared';
import { GameSession } from './GameSession';
import { GameEventBus } from './GameEvents';
import { StateMachine } from './StateMachine';
import { GameFlowController } from './GameFlowController';
import { NightActionCollection } from './NightActionCollection';
import { VoteCollection } from './VoteCollection';
import { RuleEngine } from './RuleEngine';
import type { NightResolution, VotingResolution } from './RuleEngine';
import { assignRoles } from './RoleFactory';
import { Room } from './Room';
import type { Player } from './Player';

const NIGHT_ACTION_TYPES = new Set<ActionType>([
  ActionType.KILL,
  ActionType.HEAL,
  ActionType.INVESTIGATE,
  ActionType.BLOCK,
  ActionType.SHOOT,
]);

const ROLE_ALLOWED_ACTIONS: Partial<Record<RoleName, ActionType[]>> = {
  [RoleName.MAFIA]:        [ActionType.KILL],
  [RoleName.DON]:          [ActionType.KILL, ActionType.INVESTIGATE],
  [RoleName.DOCTOR]:       [ActionType.HEAL],
  [RoleName.DETECTIVE]:    [ActionType.INVESTIGATE],
  [RoleName.COMMISSIONER]: [ActionType.INVESTIGATE],
  [RoleName.SERGEANT]:     [ActionType.SHOOT],
  [RoleName.LOVER]:        [ActionType.BLOCK],
  [RoleName.ADVOCATE]:     [ActionType.INVESTIGATE],
  [RoleName.JOURNALIST]:   [ActionType.INVESTIGATE],
};

export class GameEngine {
  private readonly session: GameSession;
  private readonly stateMachine: StateMachine;
  private readonly flowController: GameFlowController;
  private readonly nightActions: NightActionCollection;
  private readonly votes: VoteCollection;
  private readonly ruleEngine: RuleEngine;
  private nightNumber = 0;
  private readonly players: Player[];
  private readonly room: Room;
  readonly events: GameEventBus;

  constructor(room: Room) {
    this.room = room;
    this.players = room.players.map((p) => p);
    const sessionPlayers = this.players.map((p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      status: p.status,
    }));
    this.session = new GameSession(room.id, sessionPlayers);
    this.stateMachine = new StateMachine(GamePhase.WAITING);
    this.events = new GameEventBus();
    this.nightActions = new NightActionCollection();
    this.votes = new VoteCollection();
    this.ruleEngine = new RuleEngine();
    this.flowController = new GameFlowController(
      () => this.stateMachine.currentState(),
      (to) => this.applyTransition(to),
    );
  }

  start(): void {
    if (this.session.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      throw new Error(
        `Cannot start: need at least ${GAME_CONSTANTS.MIN_PLAYERS} players, have ${this.session.players.length}`,
      );
    }
    if (this.session.status !== GameSessionStatus.WAITING) {
      throw new Error(`Cannot start game: current status is ${this.session.status}`);
    }
    assignRoles(this.players, this.room.settings.roleNames);
    this.session.syncPlayerRoles(this.players);
    this.session.start();
    this.applyTransition(GamePhase.PREPARING);
    this.flowController.start();
    console.log(`[GameEngine] Game ${this.session.gameId} started for room ${this.session.roomId}`);
  }

  submitNightAction(action: IPlayerAction): void {
    if (this.stateMachine.currentState() !== GamePhase.NIGHT) {
      throw new Error(
        `Night actions can only be submitted during NIGHT phase. Current: ${this.stateMachine.currentState()}`,
      );
    }

    if (!NIGHT_ACTION_TYPES.has(action.type)) {
      throw new Error(`Action type ${action.type} is not valid at night`);
    }

    const actor = this.players.find((p) => p.id === action.playerId);
    if (!actor) throw new Error(`Player ${action.playerId} not found`);
    if (!actor.isAlive()) throw new Error(`Player ${action.playerId} is not alive`);
    if (!actor.role?.canActAtNight) throw new Error(`Player ${action.playerId} has no night action`);
    if (actor.blockedFromVoting) throw new Error(`Player ${action.playerId} is blocked`);

    const allowedTypes = actor.role ? (ROLE_ALLOWED_ACTIONS[actor.role.name] ?? []) : [];
    if (!allowedTypes.includes(action.type)) {
      throw new Error(`Role ${actor.role?.name} cannot perform action ${action.type}`);
    }

    const target = this.players.find((p) => p.id === action.targetId);
    if (!target) throw new Error(`Target ${action.targetId} not found`);
    if (!target.isAlive()) throw new Error(`Target ${action.targetId} is not alive`);

    if (action.type === ActionType.KILL || action.type === ActionType.SHOOT) {
      if (action.playerId === action.targetId) {
        throw new Error(`Player ${action.playerId} cannot target themselves`);
      }
    }

    if (action.type === ActionType.SHOOT) {
      if (actor.hasShot) throw new Error(`Player ${action.playerId} has already used their shot`);
      if (this.nightNumber === 0) throw new Error(`Sergeant cannot act on the first night`);
    }

    if (actor.role.name === RoleName.ADVOCATE && this.nightNumber === 0) {
      throw new Error(`Advocate cannot act on the first night`);
    }

    if (actor.role.name === RoleName.JOURNALIST && !action.secondaryTargetId) {
      throw new Error(`Journalist requires two targets`);
    }

    if (action.secondaryTargetId) {
      const secondary = this.players.find((p) => p.id === action.secondaryTargetId);
      if (!secondary) throw new Error(`Secondary target ${action.secondaryTargetId} not found`);
      if (!secondary.isAlive()) throw new Error(`Secondary target ${action.secondaryTargetId} is not alive`);
    }

    this.nightActions.submit(action);
    console.log(`[GameEngine] Night action submitted by player ${action.playerId}: ${action.type} → ${action.targetId}`);
  }

  completeNight(): NightResolution {
    if (this.stateMachine.currentState() !== GamePhase.NIGHT) {
      throw new Error(`completeNight() called outside NIGHT phase. Current: ${this.stateMachine.currentState()}`);
    }

    const resolution = this.ruleEngine.resolveNight(this.nightActions, this.players, this.nightNumber);
    this.session.syncPlayerStatuses(this.players);
    this.events.emit('nightResolved', resolution);
    console.log(
      `[GameEngine] Night resolved — killed: [${resolution.killed.join(', ')}], ` +
      `healed: [${resolution.healed.join(', ')}], investigations: ${resolution.investigations.size}`,
    );

    this.nightNumber += 1;

    const winCheck = this.ruleEngine.checkWinConditions(this.players);
    if (winCheck.isOver) {
      this.flowController.advance(GamePhase.GAME_OVER);
    } else {
      this.flowController.advance(); // NIGHT → MORNING
    }

    return resolution;
  }

  completeCurrentPhase(): void {
    const current = this.stateMachine.currentState();
    if (current === GamePhase.NIGHT) {
      throw new Error('Use completeNight() to end the NIGHT phase.');
    }
    if (current === GamePhase.VOTING || current === GamePhase.CHECK_VICTORY) {
      throw new Error(`Phase ${current} has branches — use the dedicated completion method.`);
    }
    this.flowController.advance();
  }

  submitVote(voterId: string, targetId: string): void {
    if (this.stateMachine.currentState() !== GamePhase.VOTING) {
      throw new Error(
        `Votes can only be submitted during VOTING phase. Current: ${this.stateMachine.currentState()}`,
      );
    }

    if (voterId === targetId) {
      throw new Error(`Player ${voterId} cannot vote for themselves`);
    }

    const voter = this.players.find((p) => p.id === voterId);
    if (!voter) throw new Error(`Player ${voterId} not found`);
    if (!voter.isAlive()) throw new Error(`Player ${voterId} is not alive and cannot vote`);
    if (voter.blockedFromVoting) throw new Error(`Player ${voterId} is blocked from voting`);

    const target = this.players.find((p) => p.id === targetId);
    if (!target) throw new Error(`Target player ${targetId} not found`);
    if (!target.isAlive()) throw new Error(`Target player ${targetId} is not alive`);

    this.votes.submit(voterId, targetId);
    console.log(`[GameEngine] Vote submitted: ${voterId} → ${targetId}`);
  }

  completeVoting(): VotingResolution {
    if (this.stateMachine.currentState() !== GamePhase.VOTING) {
      throw new Error(`completeVoting() called outside VOTING phase. Current: ${this.stateMachine.currentState()}`);
    }
    const resolution = this.ruleEngine.resolveVoting(this.votes, this.players);
    this.session.syncPlayerStatuses(this.players);
    this.events.emit('votingResolved', resolution);
    console.log(`[GameEngine] Voting resolved — eliminated: ${resolution.eliminated ?? 'none'}`);

    // Check win immediately after elimination
    const winCheck = this.ruleEngine.checkWinConditions(this.players);
    if (winCheck.isOver) {
      this.flowController.advance(GamePhase.GAME_OVER);
    } else {
      const next = resolution.eliminated !== null ? GamePhase.LAST_WORD : GamePhase.CHECK_VICTORY;
      this.flowController.advance(next);
    }

    return resolution;
  }

  completeCheckVictory(): void {
    if (this.stateMachine.currentState() !== GamePhase.CHECK_VICTORY) {
      throw new Error(`completeCheckVictory() called outside CHECK_VICTORY phase. Current: ${this.stateMachine.currentState()}`);
    }
    const winCheck = this.ruleEngine.checkWinConditions(this.players);
    const next = winCheck.isOver ? GamePhase.GAME_OVER : GamePhase.NIGHT;
    this.flowController.advance(next);
  }

  /** Returns alive players eligible to vote — reads directly from live Player objects. */
  getEligibleVoters(): Player[] {
    return this.players.filter((p) => p.isAlive() && !p.blockedFromVoting);
  }

  voteCount(): number {
    return this.votes.count();
  }

  currentPhase(): GamePhase {
    return this.stateMachine.currentState();
  }

  getSession(): GameSession {
    return this.session;
  }

  getStateDto(): GameStateDto {
    return this.session.toDto();
  }

  exportSnapshot(): GameSnapshotDto {
    return this.session.toSnapshot();
  }

  checkWinConditions() {
    return this.ruleEngine.checkWinConditions(this.players);
  }

  private applyTransition(to: GamePhase): void {
    const previous = this.stateMachine.currentState();
    this.stateMachine.transitionTo(to);
    this.session.currentPhase = to;
    // Reset per-round player flags at the start of each new night
    if (to === GamePhase.NIGHT) {
      for (const player of this.players) {
        if (player.isAlive()) {
          player.blockedFromVoting = false;
        }
      }
    }
    this.session.syncPlayerStatuses(this.players);
    if (to === GamePhase.GAME_OVER) {
      const winCheck = this.ruleEngine.checkWinConditions(this.players);
      this.session.finish(winCheck.winner);
      this.events.emit('gameOver', { winner: winCheck.winner! });
    }
    this.events.emit('phaseChanged', { previous, current: to });
    console.log(`[GameEngine] Phase transition: ${previous} → ${to}`);
  }
}
