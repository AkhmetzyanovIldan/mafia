import { GamePhase } from '@mafia/shared';

/**
 * GameFlowController is the sole authority over phase progression.
 *
 * It decides *which* phase comes next and delegates the actual transition
 * to GameEngine via the `applyTransition` callback.
 *
 * Rules:
 * - StateMachine only validates — it never decides.
 * - Backend never requests phase changes.
 * - Clients never request phase changes.
 * - No role logic. No timers. No player ordering.
 *
 * NIGHT is a concurrent window: all night-role players submit actions
 * simultaneously into NightActionCollection. When the window closes,
 * GameEngine calls completeNight(resolution) which drives NIGHT → MORNING.
 * GameFlowController has no knowledge of who acted or in what order.
 */
export class GameFlowController {
  constructor(
    private readonly getCurrentPhase: () => GamePhase,
    private readonly applyTransition: (to: GamePhase) => void,
  ) {}

  /**
   * Called once by GameEngine.start() after WAITING → PREPARING.
   * Drives PREPARING → NIGHT to open the first concurrent night window.
   */
  start(): void {
    this.advance();
  }

  /**
   * Advances from the current phase to its successor.
   * For branching phases (VOTING, CHECK_VICTORY) the caller must supply
   * the resolved target — GameFlowController never guesses.
   */
  advance(resolvedTarget?: GamePhase): void {
    const current = this.getCurrentPhase();
    const next = resolvedTarget ?? this.resolveLinear(current);

    if (next === null) {
      return; // GAME_OVER — terminal, nothing to do
    }

    this.applyTransition(next);
  }

  // ── private ──────────────────────────────────────────────────────────────

  /**
   * Returns the single unambiguous successor for linear phases.
   * Branching phases (VOTING, CHECK_VICTORY) return null here —
   * their callers must pass an explicit resolvedTarget to advance().
   */
  private resolveLinear(phase: GamePhase): GamePhase | null {
    switch (phase) {
      case GamePhase.WAITING:        return GamePhase.PREPARING;
      case GamePhase.PREPARING:      return GamePhase.NIGHT;
      case GamePhase.NIGHT:          return GamePhase.MORNING;
      case GamePhase.MORNING:        return GamePhase.DAY_SPEECH;
      case GamePhase.DAY_SPEECH:     return GamePhase.DAY_DISCUSSION;
      case GamePhase.DAY_DISCUSSION: return GamePhase.VOTING;
      case GamePhase.LAST_WORD:      return GamePhase.CHECK_VICTORY;
      case GamePhase.GAME_OVER:      return null;
      // Branching phases — caller must supply resolvedTarget explicitly
      case GamePhase.VOTING:         return null;
      case GamePhase.CHECK_VICTORY:  return null;
    }
  }
}
