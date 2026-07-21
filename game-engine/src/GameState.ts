import { GamePhase, WinCondition } from '@mafia/shared';
import type { IGameState } from '@mafia/shared';
import type { Player } from './Player';

export class GameState implements IGameState {
  roomId: string;
  phase: GamePhase;
  round: number;
  players: Player[];
  phaseEndsAt: string | null;
  winner: WinCondition | null;

  constructor(roomId: string, players: Player[]) {
    this.roomId = roomId;
    this.phase = GamePhase.WAITING;
    this.round = 0;
    this.players = players;
    this.phaseEndsAt = null;
    this.winner = null;
  }

  toSnapshot(): IGameState {
    return {
      roomId: this.roomId,
      phase: this.phase,
      round: this.round,
      players: this.players.map((p) => p.toSnapshot()),
      phaseEndsAt: this.phaseEndsAt,
      winner: this.winner,
    };
  }
}
