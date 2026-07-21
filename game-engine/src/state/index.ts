import type { IGameState } from '@mafia/shared';

/** Immutable snapshot of game state for serialization / persistence. */
export type GameSnapshot = Readonly<IGameState>;

/** Utility to deep-clone a game snapshot. */
export function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as GameSnapshot;
}

/** Simple in-memory history of game state snapshots. */
export class StateHistory {
  private history: GameSnapshot[] = [];

  push(snapshot: GameSnapshot): void {
    this.history.push(cloneSnapshot(snapshot));
  }

  getLast(): GameSnapshot | undefined {
    return this.history[this.history.length - 1];
  }

  getAll(): GameSnapshot[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}
