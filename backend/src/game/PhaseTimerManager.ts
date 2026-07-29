import { PhaseTimer } from '@mafia/game-engine';
import type { GameEngine, Room } from '@mafia/game-engine';
import { GamePhase } from '@mafia/shared';

/**
 * Manages the single phase timer for one game session.
 * Subscribes to GameEngine.events.phaseChanged and automatically
 * starts/stops the timer on every phase transition.
 *
 * Calls the appropriate GameEngine completion method when the timer expires:
 *   NIGHT          → completeNight()
 *   VOTING         → completeVoting()
 *   CHECK_VICTORY  → completeCheckVictory()
 *   other phases   → completeCurrentPhase()
 *
 * PREPARING, WAITING and GAME_OVER never start a timer.
 */
export class PhaseTimerManager {
  private readonly timer = new PhaseTimer(0);
  private readonly engine: GameEngine;
  private readonly settings: Room['settings'];

  constructor(engine: GameEngine, room: Room) {
    this.engine = engine;
    this.settings = room.settings;

    engine.events.on('phaseChanged', ({ current }) => {
      this.onPhaseChanged(current);
    });
  }

  /** Immediately stops the running timer. Called by GameSessionManager.endGame(). */
  stop(): void {
    this.timer.stop();
  }

  // ── private ──────────────────────────────────────────────────────────────

  private onPhaseChanged(phase: GamePhase): void {
    const durationMs = this.durationFor(phase);
    if (durationMs === null) {
      this.timer.stop();
      return;
    }

    this.timer.reset(durationMs);
    this.timer.start(() => this.resolvePhase(phase));
    console.log(`[PhaseTimerManager] Timer started for ${phase}: ${durationMs}ms`);
  }

  private durationFor(phase: GamePhase): number | null {
    switch (phase) {
      case GamePhase.NIGHT:          return this.settings.nightDurationMs;
      case GamePhase.VOTING:         return this.settings.votingDurationMs;
      case GamePhase.MORNING:
      case GamePhase.DAY_SPEECH:
      case GamePhase.DAY_DISCUSSION:
      case GamePhase.LAST_WORD:      return this.settings.phaseDurationMs;
      case GamePhase.CHECK_VICTORY:  return 0; // immediate
      case GamePhase.PREPARING:
      case GamePhase.WAITING:
      case GamePhase.GAME_OVER:      return null;
    }
  }

  private resolvePhase(phase: GamePhase): void {
    console.log(`[PhaseTimerManager] Timer expired for ${phase} — resolving`);
    try {
      switch (phase) {
        case GamePhase.NIGHT:         this.engine.completeNight();         break;
        case GamePhase.VOTING:        this.engine.completeVoting();        break;
        case GamePhase.CHECK_VICTORY: this.engine.completeCheckVictory();  break;
        default:                      this.engine.completeCurrentPhase();  break;
      }
    } catch (err) {
      console.error(`[PhaseTimerManager] Error resolving phase ${phase}: ${toMessage(err)}`);
    }
  }
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
