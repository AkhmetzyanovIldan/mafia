import { useState, useCallback, useEffect, useRef } from 'react';
import { ROOM_EVENTS, GAME_EVENTS } from '@mafia/shared';
import type { RoleName, GamePhase } from '@mafia/shared';
import type {
  RoomStateDto,
  GameStateDto,
  WsRoomCreatedPayload,
  WsRoomJoinedPayload,
  WsRoomUpdatedPayload,
  WsPlayerJoinedPayload,
  WsPlayerLeftPayload,
  WsRoomRemovedPayload,
  WsRoomErrorPayload,
  WsGameStartedPayload,
  WsGameStatePayload,
  WsPhaseChangedPayload,
  WsGameErrorPayload,
  WsReconnectedPayload,
  WsGameResetPayload,
  WsVoiceActivityPayload,
} from '@mafia/shared';
import { wsService } from '../services/WebSocketService';

const WS_URL = `ws://${window.location.hostname}:4000`;

export interface Toast {
  id: string;
  message: string;
}

export interface CreateRoomOptions {
  maxPlayers?: number;
  roleNames?: RoleName[];
  phaseDurationMs?: number;
  votingDurationMs?: number;
  nightDurationMs?: number;
  lastWordEnabled?: boolean;
}

export interface RoomStoreState {
  room: RoomStateDto | null;
  playerId: string | null;
  gameState: GameStateDto | null;
  phaseEndsAt: string | null;
  toasts: Toast[];
  error: string | null;
  loading: boolean;
  speakingPlayers: Set<string>;
}

const PHASE_TOAST: Partial<Record<GamePhase, string>> = {
  NIGHT: '🌙 Наступает ночь',
  MORNING: '🌅 Наступает утро',
  DAY_SPEECH: '🎤 Начинаются выступления',
  VOTING: '🗳️ Начинается голосование',
  RUNOFF_VOTING: '🔄 Переголосование',
  LAST_WORD: '💬 Последнее слово',
  GAME_OVER: '🏁 Игра окончена',
};

export function useRoomStore(token: string | null) {
  const [state, setState] = useState<RoomStoreState>({
    room: null,
    playerId: null,
    gameState: null,
    phaseEndsAt: null,
    toasts: [],
    error: null,
    loading: false,
    speakingPlayers: new Set(),
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setState((prev) => ({ ...prev, toasts: [...prev.toasts, { id, message }] }));
    setTimeout(
      () => setState((prev) => ({ ...prev, toasts: prev.toasts.filter((t) => t.id !== id) })),
      3500,
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    setState((prev) => ({ ...prev, toasts: prev.toasts.filter((t) => t.id !== id) }));
  }, []);

  useEffect(() => {
    wsService.connect(WS_URL);
    wsService.setOnReconnect(() => {
      const { room, gameState } = stateRef.current;
      if (gameState && room && token) {
        wsService.send({ event: ROOM_EVENTS.RECONNECT, token, roomId: room.id });
      }
    });
    return () => wsService.disconnect();
  }, [token]);

  useEffect(() => {
    const onRoomCreated = (payload: WsRoomCreatedPayload) => {
      setState({ room: payload.room, playerId: payload.playerId, gameState: null, phaseEndsAt: null, toasts: [], error: null, loading: false, speakingPlayers: new Set() });
    };

    const onRoomJoined = (payload: WsRoomJoinedPayload) => {
      setState({ room: payload.room, playerId: payload.playerId, gameState: null, phaseEndsAt: null, toasts: [], error: null, loading: false, speakingPlayers: new Set() });
    };

    const onRoomUpdated = (payload: WsRoomUpdatedPayload) => {
      setState((prev) => ({ ...prev, room: payload.room, error: null, loading: false }));
    };

    const onPlayerJoined = (payload: WsPlayerJoinedPayload) => {
      setState((prev) => {
        if (!prev.room || prev.room.id !== payload.roomId) return prev;
        const already = prev.room.players.some((p) => p.id === payload.player.id);
        if (already) return prev;
        return { ...prev, room: { ...prev.room, players: [...prev.room.players, payload.player] } };
      });
    };

    const onPlayerLeft = (payload: WsPlayerLeftPayload) => {
      setState((prev) => {
        if (!prev.room || prev.room.id !== payload.roomId) return prev;
        return {
          ...prev,
          room: { ...prev.room, players: prev.room.players.filter((p) => p.id !== payload.playerId) },
        };
      });
    };

    const onRoomRemoved = (payload: WsRoomRemovedPayload) => {
      if (stateRef.current.room?.id === payload.roomId) {
        setState({ room: null, playerId: null, gameState: null, phaseEndsAt: null, toasts: [], error: 'Room was closed', loading: false, speakingPlayers: new Set() });
      }
    };

    const onRoomError = (payload: WsRoomErrorPayload) => {
      setState((prev) => ({ ...prev, error: payload.message, loading: false }));
    };

    const onReconnected = (payload: WsReconnectedPayload) => {
      setState((prev) => ({ ...prev, gameState: payload.gameState, error: null, loading: false }));
    };

    const onGameStarted = (payload: WsGameStartedPayload) => {
      setState((prev) => ({ ...prev, gameState: payload.gameState, phaseEndsAt: payload.phaseEndsAt ?? null, error: null, loading: false }));
    };

    const onGameState = (payload: WsGameStatePayload) => {
      setState((prev) => ({ ...prev, gameState: payload.gameState, phaseEndsAt: payload.phaseEndsAt ?? null, error: null }));
    };

    const onPhaseChanged = (payload: WsPhaseChangedPayload) => {
      const msg = PHASE_TOAST[payload.currentPhase];
      if (msg) addToast(msg);
      setState((prev) => ({ ...prev, gameState: payload.gameState, phaseEndsAt: payload.phaseEndsAt ?? null, error: null }));
    };

    const onGameError = (payload: WsGameErrorPayload) => {
      setState((prev) => ({ ...prev, error: payload.message, loading: false }));
    };

    const onGameReset = (payload: WsGameResetPayload) => {
      setState((prev) => ({ ...prev, room: payload.room, gameState: null, phaseEndsAt: null, error: null, loading: false }));
    };

    const onVoiceActivity = (payload: WsVoiceActivityPayload) => {
      setState((prev) => {
        const next = new Set(prev.speakingPlayers);
        if (payload.speaking) next.add(payload.playerId);
        else next.delete(payload.playerId);
        return { ...prev, speakingPlayers: next };
      });
    };

    wsService.on(ROOM_EVENTS.ROOM_CREATED, onRoomCreated);
    wsService.on(ROOM_EVENTS.ROOM_JOINED, onRoomJoined);
    wsService.on(ROOM_EVENTS.ROOM_UPDATED, onRoomUpdated);
    wsService.on(ROOM_EVENTS.PLAYER_JOINED, onPlayerJoined);
    wsService.on(ROOM_EVENTS.PLAYER_LEFT, onPlayerLeft);
    wsService.on(ROOM_EVENTS.ROOM_REMOVED, onRoomRemoved);
    wsService.on(ROOM_EVENTS.RECONNECTED, onReconnected);
    wsService.on(ROOM_EVENTS.ERROR, onRoomError);
    wsService.on(GAME_EVENTS.GAME_STARTED, onGameStarted);
    wsService.on(GAME_EVENTS.GAME_STATE, onGameState);
    wsService.on(GAME_EVENTS.PHASE_CHANGED, onPhaseChanged);
    wsService.on(GAME_EVENTS.GAME_ERROR, onGameError);
    wsService.on(GAME_EVENTS.GAME_RESET, onGameReset);
    wsService.on(GAME_EVENTS.VOICE_ACTIVITY, onVoiceActivity);

    return () => {
      wsService.off(ROOM_EVENTS.ROOM_CREATED, onRoomCreated);
      wsService.off(ROOM_EVENTS.ROOM_JOINED, onRoomJoined);
      wsService.off(ROOM_EVENTS.ROOM_UPDATED, onRoomUpdated);
      wsService.off(ROOM_EVENTS.PLAYER_JOINED, onPlayerJoined);
      wsService.off(ROOM_EVENTS.PLAYER_LEFT, onPlayerLeft);
      wsService.off(ROOM_EVENTS.ROOM_REMOVED, onRoomRemoved);
      wsService.off(ROOM_EVENTS.RECONNECTED, onReconnected);
      wsService.off(ROOM_EVENTS.ERROR, onRoomError);
      wsService.off(GAME_EVENTS.GAME_STARTED, onGameStarted);
      wsService.off(GAME_EVENTS.GAME_STATE, onGameState);
      wsService.off(GAME_EVENTS.PHASE_CHANGED, onPhaseChanged);
      wsService.off(GAME_EVENTS.GAME_ERROR, onGameError);
      wsService.off(GAME_EVENTS.GAME_RESET, onGameReset);
      wsService.off(GAME_EVENTS.VOICE_ACTIVITY, onVoiceActivity);
    };
  }, [addToast]);

  const createRoom = useCallback((username: string, opts?: CreateRoomOptions) => {
    if (!token) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    wsService.send({
      event: ROOM_EVENTS.CREATE_ROOM,
      token,
      username,
      maxPlayers: opts?.maxPlayers,
      roleNames: opts?.roleNames,
      phaseDurationMs: opts?.phaseDurationMs,
      votingDurationMs: opts?.votingDurationMs,
      nightDurationMs: opts?.nightDurationMs,
      lastWordEnabled: opts?.lastWordEnabled,
    });
  }, [token]);

  const joinRoom = useCallback((code: string, username: string) => {
    if (!token) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    wsService.send({ event: ROOM_EVENTS.JOIN_ROOM, token, code, username });
  }, [token]);

  const leaveRoom = useCallback(() => {
    const { room } = stateRef.current;
    if (!room) return;
    wsService.send({ event: ROOM_EVENTS.LEAVE_ROOM, roomId: room.id });
    setState({ room: null, playerId: null, gameState: null, phaseEndsAt: null, toasts: [], error: null, loading: false, speakingPlayers: new Set() });
  }, []);

  const takeSeat = useCallback((seat: number) => {
    const { room } = stateRef.current;
    if (!room || !token) return;
    wsService.send({ event: ROOM_EVENTS.TAKE_SEAT, roomId: room.id, seat });
  }, [token]);

  const leaveSeat = useCallback(() => {
    const { room } = stateRef.current;
    if (!room) return;
    wsService.send({ event: ROOM_EVENTS.LEAVE_SEAT, roomId: room.id });
  }, []);

  const setReady = useCallback((isReady: boolean) => {
    const { room } = stateRef.current;
    if (!room || !token) return;
    wsService.send({ event: ROOM_EVENTS.PLAYER_READY, roomId: room.id, isReady });
  }, [token]);

  const startGame = useCallback(() => {
    const { room } = stateRef.current;
    if (!room) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    wsService.send({ event: GAME_EVENTS.START_GAME, roomId: room.id });
  }, []);

  const submitAction = useCallback((action: import('@mafia/shared').IPlayerAction) => {
    const { room } = stateRef.current;
    if (!room) return;
    wsService.send({ event: GAME_EVENTS.PLAYER_ACTION, roomId: room.id, action });
  }, []);

  const resetGame = useCallback(() => {
    const { room } = stateRef.current;
    if (!room) return;
    wsService.send({ event: GAME_EVENTS.RESET_GAME, roomId: room.id });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return { ...state, createRoom, joinRoom, leaveRoom, takeSeat, leaveSeat, setReady, startGame, resetGame, submitAction, clearError, dismissToast };
}
