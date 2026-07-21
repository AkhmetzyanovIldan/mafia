import { GamePhase, WinCondition } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';
import type { GameState } from './GameState';
import type { NightResolution } from './RuleEngine';

export type GameEventMap = {
  phaseChanged: { previous: GamePhase; current: GamePhase };
  nightResolved: NightResolution;
  playerEliminated: { playerId: string; state: GameState };
  actionSubmitted: { action: IPlayerAction; state: GameState };
  gameOver: { winner: WinCondition; state: GameState };
  roundStarted: { round: number; state: GameState };
};

export type GameEventName = keyof GameEventMap;
export type GameEventHandler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export class GameEventBus {
  private listeners = new Map<GameEventName, GameEventHandler<GameEventName>[]>();

  on<K extends GameEventName>(event: K, handler: GameEventHandler<K>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, handler as GameEventHandler<GameEventName>]);
  }

  off<K extends GameEventName>(event: K, handler: GameEventHandler<K>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      existing.filter((h) => h !== handler),
    );
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.forEach((h) => h(payload as GameEventMap[GameEventName]));
  }
}
