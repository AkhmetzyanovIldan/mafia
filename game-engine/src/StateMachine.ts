import { GamePhase } from '@mafia/shared';

/**
 * Allowed transitions: key → set of valid next states.
 *
 * WAITING      → PREPARING
 * PREPARING    → NIGHT
 * NIGHT        → MORNING
 * MORNING      → DAY_SPEECH
 * DAY_SPEECH   → DAY_DISCUSSION
 * DAY_DISCUSSION → VOTING
 * VOTING       → LAST_WORD | CHECK_VICTORY
 * LAST_WORD    → CHECK_VICTORY
 * CHECK_VICTORY → NIGHT | GAME_OVER
 * GAME_OVER    → (terminal — no transitions)
 */
const TRANSITIONS: ReadonlyMap<GamePhase, ReadonlySet<GamePhase>> = new Map([
  [GamePhase.WAITING,        new Set([GamePhase.PREPARING])],
  [GamePhase.PREPARING,      new Set([GamePhase.NIGHT])],
  [GamePhase.NIGHT,          new Set([GamePhase.MORNING, GamePhase.GAME_OVER])],
  [GamePhase.MORNING,        new Set([GamePhase.DAY_SPEECH])],
  [GamePhase.DAY_SPEECH,     new Set([GamePhase.DAY_DISCUSSION])],
  [GamePhase.DAY_DISCUSSION, new Set([GamePhase.VOTING])],
  [GamePhase.VOTING,         new Set([GamePhase.LAST_WORD, GamePhase.CHECK_VICTORY, GamePhase.GAME_OVER])],
  [GamePhase.LAST_WORD,      new Set([GamePhase.CHECK_VICTORY])],
  [GamePhase.CHECK_VICTORY,  new Set([GamePhase.NIGHT, GamePhase.GAME_OVER])],
  [GamePhase.GAME_OVER,      new Set()],
]);

export class StateMachine {
  private _current: GamePhase;
  private _history: GamePhase[] = [];

  constructor(initial: GamePhase = GamePhase.WAITING) {
    this._current = initial;
  }

  currentState(): GamePhase {
    return this._current;
  }

  previousState(): GamePhase | undefined {
    return this._history[this._history.length - 1];
  }

  history(): readonly GamePhase[] {
    return this._history;
  }

  canTransition(to: GamePhase): boolean {
    return TRANSITIONS.get(this._current)?.has(to) ?? false;
  }

  transitionTo(to: GamePhase): void {
    if (!this.canTransition(to)) {
      const allowed = [...(TRANSITIONS.get(this._current) ?? [])];
      throw new Error(
        `Illegal transition: ${this._current} → ${to}. ` +
        `Allowed from ${this._current}: [${allowed.join(', ') || 'none'}]`,
      );
    }
    this._history.push(this._current);
    this._current = to;
  }

  /** Returns the set of valid next states from the current state. */
  allowedTransitions(): GamePhase[] {
    return [...(TRANSITIONS.get(this._current) ?? [])];
  }
}
