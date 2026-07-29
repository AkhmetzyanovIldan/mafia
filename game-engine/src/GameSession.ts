import { GameSessionStatus, GamePhase } from '@mafia/shared';
import type { IGameSession, GamePlayerDto } from '@mafia/shared';
import type { GameSnapshotDto, GameStateDto } from '@mafia/shared';
import type { WinCondition } from '@mafia/shared';
import type { Player } from './Player';
import { uuid } from './utils';

export class GameSession implements IGameSession {
  readonly gameId: string;
  readonly roomId: string;
  status: GameSessionStatus;
  currentPhase: GamePhase;
  players: GamePlayerDto[];
  readonly createdAt: string;
  startedAt: string;
  winner: WinCondition | null = null;

  constructor(roomId: string, players: GamePlayerDto[]) {
    this.gameId = uuid();
    this.roomId = roomId;
    this.status = GameSessionStatus.WAITING;
    this.currentPhase = GamePhase.WAITING;
    this.players = players.map((p) => ({ ...p }));
    this.createdAt = new Date().toISOString();
    this.startedAt = '';
  }

  start(): void {
    if (this.status !== GameSessionStatus.WAITING) {
      throw new Error(`Cannot start game: current status is ${this.status}`);
    }
    this.status = GameSessionStatus.IN_PROGRESS;
    this.startedAt = new Date().toISOString();
  }

  finish(winner: WinCondition | null = null): void {
    this.status = GameSessionStatus.FINISHED;
    this.winner = winner;
  }

  toDto(): GameStateDto {
    return {
      gameId: this.gameId,
      roomId: this.roomId,
      status: this.status,
      currentPhase: this.currentPhase,
      players: this.players.map((p) => ({
        id: p.id,
        username: p.username,
        isHost: p.isHost,
        status: p.status,
        blockedFromVoting: p.blockedFromVoting ?? false,
        role: p.role,
      })),
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      winner: this.winner,
    };
  }

  toSnapshot(): GameSnapshotDto {
    return {
      ...this.toDto(),
      snapshotAt: new Date().toISOString(),
    };
  }

  syncPlayerStatuses(players: Player[]): void {
    const playerMap = new Map(players.map((p) => [p.id, p]));
    this.players = this.players.map((p) => {
      const live = playerMap.get(p.id);
      if (!live) return p;
      return {
        ...p,
        status: live.status,
        blockedFromVoting: live.blockedFromVoting ?? false,
      };
    });
  }

  syncPlayerRoles(players: Player[]): void {
    const roleMap = new Map(players.map((p) => [p.id, p.role?.toSnapshot()]));
    this.players = this.players.map((p) => ({
      ...p,
      role: roleMap.get(p.id),
    }));
  }

  /** Restore a full session from a snapshot — preserves all player state. */
  static fromSnapshot(snapshot: GameSnapshotDto): GameSession {
    const session = new GameSession(snapshot.roomId, []);
    // Override readonly gameId via cast — only used for restore
    (session as { gameId: string }).gameId = snapshot.gameId;
    (session as { createdAt: string }).createdAt = snapshot.createdAt;
    session.status = snapshot.status;
    session.currentPhase = snapshot.currentPhase;
    session.startedAt = snapshot.startedAt;
    session.players = snapshot.players.map((p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      status: p.status,
      blockedFromVoting: p.blockedFromVoting ?? false,
      role: p.role,
    }));
    return session;
  }
}
