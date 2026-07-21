import { RoomStatus, PlayerStatus, GAME_CONSTANTS, ROOM_CONSTANTS } from '@mafia/shared';
import type { RoomStateDto } from '@mafia/shared';
import { RoomRepository } from '../repositories/RoomRepository';
import type { RoomRecord, PlayerRecord } from '../repositories/RoomRepository';
import { generateId, generateRoomCode } from '../utils';

export interface CreateRoomResult {
  room: RoomStateDto;
  playerId: string;
}

export interface JoinRoomResult {
  room: RoomStateDto;
  playerId: string;
}

export interface LeaveRoomResult {
  dto: RoomStateDto | null;
  removed: boolean;
}

export class RoomService {
  constructor(private readonly roomRepo: RoomRepository) {}

  createRoom(username: string, maxPlayers?: number): CreateRoomResult {
    const resolvedMax = maxPlayers ?? GAME_CONSTANTS.MAX_PLAYERS;

    if (resolvedMax < GAME_CONSTANTS.MIN_PLAYERS || resolvedMax > GAME_CONSTANTS.MAX_PLAYERS) {
      throw new Error(
        `maxPlayers must be between ${GAME_CONSTANTS.MIN_PLAYERS} and ${GAME_CONSTANTS.MAX_PLAYERS}`,
      );
    }

    if (this.roomRepo.findAll().length >= ROOM_CONSTANTS.MAX_ROOMS) {
      throw new Error('Server room limit reached');
    }

    const playerId = generateId();
    const host: PlayerRecord = {
      id: playerId,
      username,
      isHost: true,
      status: PlayerStatus.ALIVE,
    };

    const room: RoomRecord = {
      id: generateId(),
      code: this.generateUniqueCode(),
      hostId: playerId,
      status: RoomStatus.WAITING,
      players: [host],
      maxPlayers: resolvedMax,
      createdAt: new Date().toISOString(),
    };

    this.roomRepo.save(room);
    console.log(`[RoomService] Room created: ${room.code} by "${username}" (${playerId})`);

    return { room: this.roomRepo.toDto(room), playerId };
  }

  joinRoom(code: string, username: string): JoinRoomResult {
    const room = this.roomRepo.findByCode(code.toUpperCase());
    if (!room) throw new Error(`Room with code "${code}" not found`);
    if (room.status !== RoomStatus.WAITING) throw new Error('Room is not accepting players');
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');

    const duplicate = room.players.find(
      (p) => p.username.toLowerCase() === username.toLowerCase(),
    );
    if (duplicate) throw new Error(`Username "${username}" is already taken in this room`);

    const playerId = generateId();
    const player: PlayerRecord = {
      id: playerId,
      username,
      isHost: false,
      status: PlayerStatus.ALIVE,
    };

    room.players.push(player);
    this.roomRepo.save(room);
    console.log(`[RoomService] Player "${username}" (${playerId}) joined room ${room.code}`);

    return { room: this.roomRepo.toDto(room), playerId };
  }

  leaveRoom(roomId: string, playerId: string): LeaveRoomResult {
    const room = this.roomRepo.findById(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const before = room.players.length;
    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === before) {
      throw new Error(`Player ${playerId} not found in room ${roomId}`);
    }

    console.log(`[RoomService] Player ${playerId} left room ${room.code}`);

    if (room.players.length === 0) {
      this.roomRepo.delete(roomId);
      console.log(`[RoomService] Room ${room.code} removed (empty)`);
      return { dto: null, removed: true };
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      console.log(`[RoomService] Host transferred to "${room.players[0].username}" in room ${room.code}`);
    }

    this.roomRepo.save(room);
    return { dto: this.roomRepo.toDto(room), removed: false };
  }

  getRoom(roomId: string): RoomStateDto {
    const room = this.roomRepo.findById(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    return this.roomRepo.toDto(room);
  }

  listRooms(): RoomStateDto[] {
    return this.roomRepo.findAll().map((r) => this.roomRepo.toDto(r));
  }

  private generateUniqueCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 100) throw new Error('Failed to generate unique room code');
    } while (this.roomRepo.findByCode(code));
    return code;
  }
}
