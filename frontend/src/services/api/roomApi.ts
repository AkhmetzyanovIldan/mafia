import { apiClient } from './client';
import type { IRoom, CreateRoomDto, JoinRoomDto } from '../../types';

export const roomApi = {
  list: () => apiClient.get<IRoom[]>('/rooms'),
  get: (roomId: string) => apiClient.get<IRoom>(`/rooms/${roomId}`),
  create: (dto: CreateRoomDto) => apiClient.post<IRoom>('/rooms', dto),
  join: (dto: JoinRoomDto) => apiClient.post<IRoom>('/rooms/join', dto),
  leave: (roomId: string) => apiClient.delete<IRoom>(`/rooms/${roomId}/leave`),
};
