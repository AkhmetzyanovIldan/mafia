import { apiClient } from './client';
import type { AuthResponseDto } from '../../types';

export const authApi = {
  guest: (username: string) =>
    apiClient.post<AuthResponseDto>('/auth/guest', { username }),
};
