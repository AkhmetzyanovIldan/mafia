export const GAME_CONSTANTS = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 16,
  DEFAULT_PHASE_DURATION_MS: 60_000,
  DEFAULT_VOTING_DURATION_MS: 30_000,
  DEFAULT_NIGHT_DURATION_MS: 45_000,
} as const;

export const ROOM_CONSTANTS = {
  CODE_LENGTH: 6,
  MAX_ROOMS: 100,
} as const;

export const ROOM_EVENTS = {
  // Client -> Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_STATE_REQUEST: 'room_state_request',
  RECONNECT: 'reconnect',
  // Server -> Client
  ROOM_CREATED: 'room_created',
  ROOM_UPDATED: 'room_updated',
  ROOM_JOINED: 'room_joined',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  ROOM_REMOVED: 'room_removed',
  RECONNECTED: 'reconnected',
  ERROR: 'error',
} as const;

export type RoomEventName = typeof ROOM_EVENTS[keyof typeof ROOM_EVENTS];

export const GAME_EVENTS = {
  // Client -> Server
  START_GAME: 'start_game',
  PLAYER_ACTION: 'player_action',
  // Server -> Client
  GAME_STARTED: 'game_started',
  GAME_STATE: 'game_state',
  PHASE_CHANGED: 'phase_changed',
  GAME_ERROR: 'game_error',
} as const;

export type GameEventName = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];
