export type { IPlayer, IRoom, IGameState, IRoomSettings, RoomStateDto, PlayerDto } from '@mafia/shared';
export type { CreateRoomDto, JoinRoomDto, AuthResponseDto, CreateRoomRequest, JoinRoomRequest, LeaveRoomRequest, CreateRoomResponse, JoinRoomResponse } from '@mafia/shared';
export { GamePhase, PlayerStatus, RoomStatus, RoleName, RoleTeam, ROOM_EVENTS } from '@mafia/shared';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function initialAsync<T>(): AsyncState<T> {
  return { data: null, loading: false, error: null };
}
