import { GamePhase } from '@mafia/shared';
import type { GameState } from './GameState';

export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
}

export abstract class Phase {
  abstract readonly name: GamePhase;
  abstract readonly durationMs: number;

  /** Called when this phase begins. */
  abstract onEnter(state: GameState): void;

  /** Called when this phase ends. Returns the next phase. */
  abstract onExit(state: GameState): GamePhase;
}
