import { RoomStatus, PlayerStatus, RoleName } from '@mafia/shared';
import type { RoomStateDto, PlayerDto } from '@mafia/shared';

export interface RoomRecord {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerRecord[];
  maxPlayers: number;
  createdAt: string;
  roleNames?: RoleName[];
  phaseDurationMs?: number;
  votingDurationMs?: number;
  nightDurationMs?: number;
  lastWordEnabled: boolean;
}

export interface PlayerRecord {
  id: string;
  username: string;
  isHost: boolean;
  status: PlayerStatus;
  seat: number | null;
  isReady: boolean;
}

export class RoomRepository {
  private rooms = new Map<string, RoomRecord>();
  private codeIndex = new Map<string, string>(); // code -> roomId

  findById(id: string): RoomRecord | undefined {
    return this.rooms.get(id);
  }

  findByCode(code: string): RoomRecord | undefined {
    const id = this.codeIndex.get(code);
    return id ? this.rooms.get(id) : undefined;
  }

  findAll(): RoomRecord[] {
    return [...this.rooms.values()];
  }

  save(room: RoomRecord): void {
    this.rooms.set(room.id, room);
    this.codeIndex.set(room.code, room.id);
  }

  delete(id: string): void {
    const room = this.rooms.get(id);
    if (room) {
      this.codeIndex.delete(room.code);
      this.rooms.delete(id);
    }
  }

  toDto(room: RoomRecord): RoomStateDto {
    return {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p): PlayerDto => ({
        id: p.id,
        username: p.username,
        isHost: p.isHost,
        status: p.status,
        seat: p.seat,
        isReady: p.isReady,
      })),
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt,
    };
  }
}
