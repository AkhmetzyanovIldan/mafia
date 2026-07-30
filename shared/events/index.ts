import type { IPlayerAction, RoomStateDto, PlayerDto } from '../interfaces';
import { GamePhase, RoleName } from '../enums';
import { ROOM_EVENTS, GAME_EVENTS } from '../constants';
import type { GameStateDto, GameSnapshotDto } from '../dto';

// Client -> Server (Room Management module)

export interface WsCreateRoomPayload {
  event: typeof ROOM_EVENTS.CREATE_ROOM;
  token: string;
  username: string;
  maxPlayers?: number;
  roleNames?: RoleName[];
  phaseDurationMs?: number;
  votingDurationMs?: number;
  nightDurationMs?: number;
  lastWordEnabled?: boolean;
}

export interface WsJoinRoomPayload {
  event: typeof ROOM_EVENTS.JOIN_ROOM;
  token: string;
  code: string;
  username: string;
}

export interface WsLeaveRoomPayload {
  event: typeof ROOM_EVENTS.LEAVE_ROOM;
  roomId: string;
}

export interface WsRoomStateRequestPayload {
  event: typeof ROOM_EVENTS.ROOM_STATE_REQUEST;
  roomId: string;
}

export interface WsTakeSeatPayload {
  event: typeof ROOM_EVENTS.TAKE_SEAT;
  roomId: string;
  seat: number;
}

export interface WsLeaveSeatPayload {
  event: typeof ROOM_EVENTS.LEAVE_SEAT;
  roomId: string;
}

export interface WsPlayerReadyPayload {
  event: typeof ROOM_EVENTS.PLAYER_READY;
  roomId: string;
  isReady: boolean;
}

export interface WsReconnectPayload {
  event: typeof ROOM_EVENTS.RECONNECT;
  token: string;
  roomId: string;
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

export interface WsReconnectedPayload {
  event: typeof ROOM_EVENTS.RECONNECTED;
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
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
  | WsReconnectPayload
  | WsTakeSeatPayload
  | WsLeaveSeatPayload
  | WsPlayerReadyPayload
  | WsStartGamePayload
  | WsPlayerActionPayload
  | WsResetGamePayload
  | WsVoiceActivityPayload;

export type RoomServerToClientEvent =
  | WsRoomCreatedPayload
  | WsRoomUpdatedPayload
  | WsRoomJoinedPayload
  | WsPlayerJoinedPayload
  | WsPlayerLeftPayload
  | WsRoomRemovedPayload
  | WsRoomErrorPayload
  | WsReconnectedPayload
  | WsGameStartedPayload
  | WsGameStatePayload
  | WsPhaseChangedPayload
  | WsGameErrorPayload
  | WsGameResetPayload
  | WsVoiceActivityPayload;

// Client -> Server (Game Session module)

export interface WsStartGamePayload {
  event: typeof GAME_EVENTS.START_GAME;
  roomId: string;
}

export interface WsPlayerActionPayload {
  event: typeof GAME_EVENTS.PLAYER_ACTION;
  roomId: string;
  action: IPlayerAction;
}

export interface WsResetGamePayload {
  event: typeof GAME_EVENTS.RESET_GAME;
  roomId: string;
}

export interface WsVoiceActivityPayload {
  event: typeof GAME_EVENTS.VOICE_ACTIVITY;
  roomId: string;
  playerId: string;
  speaking: boolean;
}

// Server -> Client (Game Session module)

export interface WsGameStartedPayload {
  event: typeof GAME_EVENTS.GAME_STARTED;
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
  phaseEndsAt?: string | null;
}

export interface WsGameStatePayload {
  event: typeof GAME_EVENTS.GAME_STATE;
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
  phaseEndsAt?: string | null;
}

export interface WsPhaseChangedPayload {
  event: typeof GAME_EVENTS.PHASE_CHANGED;
  gameState: GameStateDto;
  previousPhase: GamePhase;
  currentPhase: GamePhase;
  phaseEndsAt?: string | null;
}

export interface WsGameErrorPayload {
  event: typeof GAME_EVENTS.GAME_ERROR;
  message: string;
  code: string;
}

export interface WsGameResetPayload {
  event: typeof GAME_EVENTS.GAME_RESET;
  room: RoomStateDto;
}
