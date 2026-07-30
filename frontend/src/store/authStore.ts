import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../services/api';

interface AuthState {
  playerId: string | null;
  token: string | null;
  username: string | null;
}

const STORAGE_KEY = 'mafia_auth';

function getTelegramUsername(): string | null {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return null;
    return user.username ?? user.first_name ?? null;
  } catch {
    return null;
  }
}

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : { playerId: null, token: null, username: null };
  } catch {
    return { playerId: null, token: null, username: null };
  }
}

export function useAuthStore() {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  useEffect(() => {
    if (state.token) return;
    const username = getTelegramUsername();
    if (username) loginAsGuest(username);
  }, []);

  const loginAsGuest = useCallback(async (username: string) => {
    const res = await authApi.guest(username);
    const next: AuthState = { playerId: res.playerId, token: res.token, username };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ playerId: null, token: null, username: null });
  }, []);

  return { ...state, loginAsGuest, logout };
}
