import { GameSessionStatus, GamePhase, PlayerStatus } from '@mafia/shared';
import type { IGameSession, GameSessionPlayerDto } from '@mafia/shared';
import type { GameSnapshotDto, GameStateDto } from '@mafia/shared';
import type { Player } from './Player';
import { uuid } from './utils';

export class GameSession implements IGameSession {
  readonly gameId: string;
  readonly roomId: string;
  status: GameSessionStatus;
  currentPhase: GamePhase;
  players: GameSessionPlayerDto[];
  readonly createdAt: string;
  startedAt: string;

  constructor(roomId: string, players: GameSessionPlayerDto[]) {
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

  finish(): void {
    if (this.status !== GameSessionStatus.IN_PROGRESS) {
      throw new Error(`Cannot finish game: current status is ${this.status}`);
    }
    this.status = GameSessionStatus.FINISHED;
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
        blockedFromVoting: (p as any).blockedFromVoting || false,
      })),
      createdAt: this.createdAt,
      startedAt: this.startedAt,
    };
  }

  toSnapshot(): GameSnapshotDto {
    return {
      ...this.toDto(),
      snapshotAt: new Date().toISOString(),
    };
  }

  syncPlayerStatuses(players: Player[]): void {
    const statusMap = new Map(players.map((player) => [player.id, player.status]));
    const blockMap = new Map(players.map((player) => [player.id, (player as Player).blockedFromVoting]));
    this.players = this.players.map((player) => ({
      ...player,
      status: statusMap.get(player.id) ?? player.status,
      blockedFromVoting: blockMap.get(player.id) ?? (player as any).blockedFromVoting ?? false,
    }));
  }

  static fromSnapshot(snapshot: GameSnapshotDto): GameSession {
    const players: GameSessionPlayerDto[] = snapshot.players.map((p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      status: PlayerStatus.ALIVE,
    }));
    const session = new GameSession(snapshot.roomId, players);
    (session as { gameId: string }).gameId = snapshot.gameId;
    (session as { createdAt: string }).createdAt = snapshot.createdAt;
    session.status = snapshot.status;
    session.currentPhase = snapshot.currentPhase;
    session.startedAt = snapshot.startedAt;
    return session;
  }
}
