import { IGameState, IRoom, IPlayerAction, RoomStateDto, PlayerDto } from '../interfaces';
import { WinCondition, GamePhase } from '../enums';
import { WS_EVENTS, ROOM_EVENTS, GAME_EVENTS } from '../constants';
import type { GameStateDto, GameSnapshotDto } from '../dto';

// Client -> Server (legacy game events)

export interface JoinRoomPayload {
  event: typeof WS_EVENTS.JOIN_ROOM;
  roomId: string;
  playerId: string;
  token: string;
}

export interface LeaveRoomPayload {
  event: typeof WS_EVENTS.LEAVE_ROOM;
  roomId: string;
  playerId: string;
}

export interface PlayerActionPayload {
  event: typeof WS_EVENTS.PLAYER_ACTION;
  action: IPlayerAction;
}

export interface ReadyPayload {
  event: typeof WS_EVENTS.READY;
  playerId: string;
  roomId: string;
}

// Server -> Client (legacy game events)

export interface RoomStatePayload {
  event: typeof WS_EVENTS.ROOM_STATE;
  room: IRoom;
}

export interface LegacyGameStatePayload {
  event: typeof WS_EVENTS.GAME_STATE;
  state: IGameState;
}

export interface PhaseChangedPayload {
  event: typeof WS_EVENTS.PHASE_CHANGED;
  state: IGameState;
}

export interface GameOverPayload {
  event: typeof WS_EVENTS.GAME_OVER;
  winner: WinCondition;
  state: IGameState;
}

export interface WsErrorPayload {
  event: typeof WS_EVENTS.ERROR;
  message: string;
  code: string;
}

export type ClientToServerEvent =
  | JoinRoomPayload
  | LeaveRoomPayload
  | PlayerActionPayload
  | ReadyPayload;

export type ServerToClientEvent =
  | RoomStatePayload
  | LegacyGameStatePayload
  | PhaseChangedPayload
  | GameOverPayload
  | WsErrorPayload;

// Client -> Server (Room Management module)

export interface WsCreateRoomPayload {
  event: typeof ROOM_EVENTS.CREATE_ROOM;
  username: string;
  maxPlayers?: number;
}

export interface WsJoinRoomPayload {
  event: typeof ROOM_EVENTS.JOIN_ROOM;
  code: string;
  username: string;
}

export interface WsLeaveRoomPayload {
  event: typeof ROOM_EVENTS.LEAVE_ROOM;
  roomId: string;
  playerId: string;
}

export interface WsRoomStateRequestPayload {
  event: typeof ROOM_EVENTS.ROOM_STATE_REQUEST;
  roomId: string;
  playerId: string;
}

// Server -> Client (Room Management module)

export interface WsRoomCreatedPayload {
  event: typeof ROOM_EVENTS.ROOM_CREATED;
  room: RoomStateDto;
  playerId: string;
}

export interface WsRoomUpdatedPayload {
  event: typeof ROOM_EVENTS.ROOM_UPDATED;
  room: RoomStateDto;
}

export interface WsRoomJoinedPayload {
  event: typeof ROOM_EVENTS.ROOM_JOINED;
  room: RoomStateDto;
  playerId: string;
}

export interface WsPlayerJoinedPayload {
  event: typeof ROOM_EVENTS.PLAYER_JOINED;
  roomId: string;
  player: PlayerDto;
}

export interface WsPlayerLeftPayload {
  event: typeof ROOM_EVENTS.PLAYER_LEFT;
  roomId: string;
  playerId: string;
}

export interface WsRoomRemovedPayload {
  event: typeof ROOM_EVENTS.ROOM_REMOVED;
  roomId: string;
}

export interface WsRoomErrorPayload {
  event: typeof ROOM_EVENTS.ERROR;
  message: string;
  code: string;
}

export type RoomClientToServerEvent =
  | WsCreateRoomPayload
  | WsJoinRoomPayload
  | WsLeaveRoomPayload
  | WsRoomStateRequestPayload
  | WsStartGamePayload
  | WsPlayerActionPayload;

export type RoomServerToClientEvent =
  | WsRoomCreatedPayload
  | WsRoomUpdatedPayload
  | WsRoomJoinedPayload
  | WsPlayerJoinedPayload
  | WsPlayerLeftPayload
  | WsRoomRemovedPayload
  | WsRoomErrorPayload
  | WsGameStartedPayload
  | WsGameStatePayload
  | WsPhaseChangedPayload
  | WsGameErrorPayload;

// Client -> Server (Game Session module)

export interface WsStartGamePayload {
  event: typeof GAME_EVENTS.START_GAME;
  roomId: string;
  playerId: string;
}

export interface WsPlayerActionPayload {
  event: typeof GAME_EVENTS.PLAYER_ACTION;
  roomId: string;
  action: IPlayerAction;
}

// Server -> Client (Game Session module)

export interface WsGameStartedPayload {
  event: typeof GAME_EVENTS.GAME_STARTED;
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
}

export interface WsGameStatePayload {
  event: typeof GAME_EVENTS.GAME_STATE;
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
}

export interface WsPhaseChangedPayload {
  event: typeof GAME_EVENTS.PHASE_CHANGED;
  gameState: GameStateDto;
  previousPhase: GamePhase;
  currentPhase: GamePhase;
}

export interface WsGameErrorPayload {
  event: typeof GAME_EVENTS.GAME_ERROR;
  message: string;
  code: string;
}
