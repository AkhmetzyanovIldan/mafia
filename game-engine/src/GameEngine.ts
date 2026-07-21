import { GAME_CONSTANTS, GamePhase } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';
import type { GameStateDto, GameSnapshotDto } from '@mafia/shared';
import { GameState } from './GameState';
import { GameSession } from './GameSession';
import { GameEventBus } from './GameEvents';
import { StateMachine } from './StateMachine';
import { GameFlowController } from './GameFlowController';
import { NightActionCollection } from './NightActionCollection';
import { RuleEngine } from './RuleEngine';
import type { NightResolution } from './RuleEngine';
import type { Room } from './Room';
import type { Player } from './Player';

export class GameEngine {
  private readonly session: GameSession;
  private readonly legacyState: GameState;
  private readonly stateMachine: StateMachine;
  private readonly flowController: GameFlowController;
  private readonly nightActions: NightActionCollection;
  private readonly ruleEngine: RuleEngine;
  private nightNumber = 0;
  /** Live player list — mutated by RuleEngine.resolveNight(). */
  private readonly players: Player[];
  readonly events: GameEventBus;

  constructor(room: Room) {
    this.players = room.players.map((p) => p);
    const sessionPlayers = this.players.map((p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      status: p.status,
    }));
    this.session = new GameSession(room.id, sessionPlayers);
    this.legacyState = new GameState(room.id, this.players);
    this.stateMachine = new StateMachine(GamePhase.WAITING);
    this.events = new GameEventBus();
    this.nightActions = new NightActionCollection();
    this.ruleEngine = new RuleEngine();
    this.flowController = new GameFlowController(
      () => this.stateMachine.currentState(),
      (to) => this.applyTransition(to),
    );
  }

  /**
   * Start the game.
   * WAITING → PREPARING → NIGHT (via GameFlowController.start()).
   */
  start(): void {
    if (this.session.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      throw new Error(
        `Cannot start: need at least ${GAME_CONSTANTS.MIN_PLAYERS} players, have ${this.session.players.length}`,
      );
    }
    this.session.start();
    this.applyTransition(GamePhase.PREPARING);
    this.flowController.start(); // PREPARING → NIGHT
    console.log(`[GameEngine] Game ${this.session.gameId} started for room ${this.session.roomId}`);
  }

  /**
   * Submit a night action from a player.
   * Must be called during NIGHT phase only.
   * All submissions are concurrent — no role ordering.
   */
  submitNightAction(action: IPlayerAction): void {
    if (this.stateMachine.currentState() !== GamePhase.NIGHT) {
      throw new Error(
        `Night actions can only be submitted during NIGHT phase. Current: ${this.stateMachine.currentState()}`,
      );
    }
    this.nightActions.submit(action);
    console.log(`[GameEngine] Night action submitted by player ${action.playerId}: ${action.type} → ${action.targetId}`);
  }

  /**
   * Close the night window and resolve all collected actions simultaneously.
   *
   * Pipeline:
   *   1. RuleEngine.resolveNight() processes all actions in one pass
   *      (heals cancel kills, investigations return team info — no ordering)
   *   2. Emit nightResolved event with the resolution
   *   3. Check win conditions
   *   4. Advance: NIGHT → MORNING (or GAME_OVER if win condition met)
   *
   * Called by the timer module (future) or test harness — never by clients or backend.
   */
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

    const winCheck = this.ruleEngine.checkWinConditions(this.players);
    if (winCheck.isOver) {
      this.flowController.advance(GamePhase.GAME_OVER);
    } else {
      this.flowController.advance(); // NIGHT → MORNING (linear)
    }

    this.nightNumber += 1;

    return resolution;
  }

  /**
   * Complete any non-night phase and advance to its linear successor.
   * For branching phases (VOTING, CHECK_VICTORY) use the specific methods.
   * Called by the timer module (future) — never by clients or backend.
   */
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

  /**
   * Complete VOTING phase.
   * @param hasEliminated  true → VOTING → LAST_WORD; false → VOTING → CHECK_VICTORY
   */
  completeVoting(hasEliminated: boolean): void {
    if (this.stateMachine.currentState() !== GamePhase.VOTING) {
      throw new Error(`completeVoting() called outside VOTING phase. Current: ${this.stateMachine.currentState()}`);
    }
    const next = hasEliminated ? GamePhase.LAST_WORD : GamePhase.CHECK_VICTORY;
    this.flowController.advance(next);
  }

  /**
   * Complete CHECK_VICTORY phase.
   * Evaluates win conditions and advances to NIGHT or GAME_OVER.
   */
  completeCheckVictory(): void {
    if (this.stateMachine.currentState() !== GamePhase.CHECK_VICTORY) {
      throw new Error(`completeCheckVictory() called outside CHECK_VICTORY phase. Current: ${this.stateMachine.currentState()}`);
    }
    const winCheck = this.ruleEngine.checkWinConditions(this.players);
    const next = winCheck.isOver ? GamePhase.GAME_OVER : GamePhase.NIGHT;
    this.flowController.advance(next);
  }

  currentPhase(): GamePhase {
    return this.stateMachine.currentState();
  }

  /** Returns the current GameSession (authoritative state). */
  getSession(): GameSession {
    return this.session;
  }

  /** Returns the current GameStateDto for broadcasting. */
  getStateDto(): GameStateDto {
    return this.session.toDto();
  }

  /** Exports a full immutable snapshot of the current game state. */
  exportSnapshot(): GameSnapshotDto {
    return this.session.toSnapshot();
  }

  /** Restores engine state from a previously exported snapshot. */
  static restoreSnapshot(snapshot: GameSnapshotDto): GameEngine {
    const restoredSession = GameSession.fromSnapshot(snapshot);
    const engine = Object.create(GameEngine.prototype) as GameEngine;
    (engine as unknown as { session: GameSession }).session = restoredSession;
    (engine as unknown as { legacyState: GameState }).legacyState = new GameState(snapshot.roomId, []);
    (engine as unknown as { players: Player[] }).players = [];
    const sm = new StateMachine(snapshot.currentPhase);
    (engine as unknown as { stateMachine: StateMachine }).stateMachine = sm;
    (engine as unknown as { events: GameEventBus }).events = new GameEventBus();
    (engine as unknown as { nightActions: NightActionCollection }).nightActions = new NightActionCollection();
    (engine as unknown as { ruleEngine: RuleEngine }).ruleEngine = new RuleEngine();
    (engine as unknown as { flowController: GameFlowController }).flowController = new GameFlowController(
      () => sm.currentState(),
      (to) => (engine as unknown as { applyTransition: (to: GamePhase) => void }).applyTransition(to),
    );
    return engine;
  }

  /** Returns the legacy GameState (kept for backward compatibility). */
  getState(): GameState {
    return this.legacyState;
  }

  /** Evaluate win conditions — delegates to RuleEngine. */
  checkWinConditions() {
    return this.ruleEngine.checkWinConditions(this.players);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private applyTransition(to: GamePhase): void {
    const previous = this.stateMachine.currentState();
    this.stateMachine.transitionTo(to);
    this.session.currentPhase = to;
    this.events.emit('phaseChanged', { previous, current: to });
    console.log(`[GameEngine] Phase transition: ${previous} → ${to}`);
  }
}
