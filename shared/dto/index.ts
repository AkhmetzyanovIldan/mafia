import type { IPlayer, IRoomSettings, RoomStateDto, GamePlayerDto } from '../interfaces';
import { GameSessionStatus, GamePhase, WinCondition } from '../enums';

// Room DTOs (HTTP layer)

export interface CreateRoomDto {
  username: string;
  settings?: Partial<IRoomSettings>;
}

export interface JoinRoomDto {
  code: string;
  username: string;
}

export interface RoomResponseDto {
  id: string;
  code: string;
  hostId: string;
  players: IPlayer[];
  settings: IRoomSettings;
}

// Room Management WS request/response DTOs

export interface CreateRoomRequest {
  username: string;
  maxPlayers?: number;
}

export interface CreateRoomResponse {
  room: RoomStateDto;
  playerId: string;
}

export interface JoinRoomRequest {
  code: string;
  username: string;
}

export interface JoinRoomResponse {
  room: RoomStateDto;
  playerId: string;
}

export interface LeaveRoomRequest {
  roomId: string;
  playerId: string;
}

// Player DTOs

export interface PlayerResponseDto {
  id: string;
  username: string;
  isHost: boolean;
}

// Game Session DTOs

export interface GameStateDto {
  gameId: string;
  roomId: string;
  status: GameSessionStatus;
  currentPhase: GamePhase;
  players: GamePlayerDto[];
  createdAt: string;
  startedAt: string;
  winner?: WinCondition | null;
}

export interface GameSnapshotDto extends GameStateDto {
  snapshotAt: string;
}

export interface StartGameRequest {
  roomId: string;
  playerId: string;
}

export interface StartGameResponse {
  gameState: GameStateDto;
}

// Auth DTOs

export interface AuthResponseDto {
  playerId: string;
  token: string;
}

// Legacy Game DTOs

export interface StartGameDto {
  roomId: string;
}

// Re-export GamePlayerDto so consumers can import from dto or interfaces
export type { GamePlayerDto } from '../interfaces';
