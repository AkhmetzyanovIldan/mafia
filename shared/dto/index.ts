import { IRoomSettings, IPlayer, IGameState, RoomStateDto, IGameSession } from '../interfaces';
import { GameSessionStatus, GamePhase } from '../enums';

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
  players: Array<{
    id: string;
    username: string;
    isHost: boolean;
    blockedFromVoting?: boolean;
  }>;
  createdAt: string;
  startedAt: string;
}

export interface GameSnapshotDto {
  gameId: string;
  roomId: string;
  status: GameSessionStatus;
  currentPhase: GamePhase;
  players: Array<{
    id: string;
    username: string;
    isHost: boolean;
    blockedFromVoting?: boolean;
  }>;
  createdAt: string;
  startedAt: string;
  snapshotAt: string;
}

export interface StartGameRequest {
  roomId: string;
  playerId: string;
}

export interface StartGameResponse {
  gameState: GameStateDto;
}

// Legacy Game DTOs

export interface GameStateResponseDto {
  state: IGameState;
}

export interface StartGameDto {
  roomId: string;
}

// Auth DTOs

export interface AuthResponseDto {
  playerId: string;
  token: string;
}

// Type guard helpers

export function toGameStateDto(session: IGameSession): GameStateDto {
  return {
    gameId: session.gameId,
    roomId: session.roomId,
    status: session.status,
    currentPhase: session.currentPhase,
    players: session.players.map((p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      blockedFromVoting: p.blockedFromVoting,
    })),
    createdAt: session.createdAt,
    startedAt: session.startedAt,
  };
}
