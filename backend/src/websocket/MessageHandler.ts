import type { WebSocket } from 'ws';
import { ROOM_EVENTS, GAME_EVENTS } from '@mafia/shared';
import type { RoomClientToServerEvent, WsRoomErrorPayload, WsGameErrorPayload, IPlayerAction, GameStateDto } from '@mafia/shared';
import type { ConnectionManager } from './ConnectionManager';
import type { RoomService } from '../services/RoomService';
import type { GameSessionManager } from '../game/GameSessionManager';
import type { AuthService } from '../services/AuthService';
import { validateWsMessage } from './wsValidation';

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class MessageHandler {
  constructor(
    private readonly connections: ConnectionManager,
    private readonly roomService: RoomService,
    private readonly gameSessionManager: GameSessionManager,
    private readonly authService: AuthService,
  ) {
    this.gameSessionManager.setConnectionManager(connections);
  }

  /**
   * Called for every new raw WebSocket connection before any message.
   * The first message MUST be an AUTH message with a valid token.
   * We handle auth inline in handle() on the first message.
   */
  handle(socket: WebSocket, raw: string): void {
    // Rate limiting
    if (!this.connections.checkRateLimit(socket)) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Rate limit exceeded', 'RATE_LIMIT');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Invalid JSON payload', 'PARSE_ERROR');
      return;
    }

    // If socket is not yet authenticated, only RECONNECT (with token) or implicit auth via token field is allowed
    const playerId = this.connections.getPlayerIdBySocket(socket);
    if (!playerId) {
      this.handleUnauthenticated(socket, parsed);
      return;
    }

    // Runtime validation
    const validation = validateWsMessage(parsed);
    if (!validation.ok) {
      this.sendError(socket, ROOM_EVENTS.ERROR, validation.message, 'VALIDATION_ERROR');
      return;
    }

    const message = parsed as RoomClientToServerEvent;
    console.log(`[MessageHandler] Received event: ${message.event} from player ${playerId}`);

    switch (message.event) {
      case ROOM_EVENTS.CREATE_ROOM:
        this.handleCreateRoom(socket, playerId, message.username, message.maxPlayers, message.roleNames);
        break;
      case ROOM_EVENTS.JOIN_ROOM:
        this.handleJoinRoom(socket, playerId, message.code, message.username);
        break;
      case ROOM_EVENTS.LEAVE_ROOM:
        this.handleLeaveRoom(socket, playerId, message.roomId);
        break;
      case ROOM_EVENTS.TAKE_SEAT:
        this.handleTakeSeat(socket, playerId, message.roomId, message.seat);
        break;
      case ROOM_EVENTS.PLAYER_READY:
        this.handlePlayerReady(socket, playerId, message.roomId, message.isReady);
        break;
      case ROOM_EVENTS.ROOM_STATE_REQUEST:
        this.handleRoomStateRequest(socket, playerId, message.roomId);
        break;
      case ROOM_EVENTS.RECONNECT:
        // Already authenticated — ignore duplicate reconnect
        this.sendError(socket, ROOM_EVENTS.ERROR, 'Already authenticated', 'AUTH_ERROR');
        break;
      case GAME_EVENTS.START_GAME:
        this.handleStartGame(socket, playerId, message.roomId);
        break;
      case GAME_EVENTS.PLAYER_ACTION:
        this.handlePlayerAction(socket, playerId, message.roomId, message.action);
        break;
      default:
        this.sendError(socket, ROOM_EVENTS.ERROR, 'Unknown event', 'UNKNOWN_EVENT');
    }
  }

  handleDisconnect(socket: WebSocket): void {
    const playerId = this.connections.getPlayerIdBySocket(socket);
    this.connections.cleanupSocket(socket);
    if (!playerId) return;

    const roomId = this.connections.getRoomIdByPlayer(playerId);
    console.log(`[MessageHandler] Player ${playerId} disconnected from room ${roomId ?? 'unknown'}`);

    if (roomId && this.gameSessionManager.hasActiveGame(roomId)) {
      this.connections.disconnect(playerId);
    } else if (roomId) {
      this.performLeave(roomId, playerId);
    }
  }

  // ── Unauthenticated path ──────────────────────────────────────────────────

  private handleUnauthenticated(socket: WebSocket, parsed: unknown): void {
    // Accept either RECONNECT (with token) or CREATE_ROOM/JOIN_ROOM (with token field)
    if (typeof parsed !== 'object' || parsed === null) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Invalid message', 'PARSE_ERROR');
      return;
    }

    const msg = parsed as Record<string, unknown>;
    const event = msg['event'];

    if (event === ROOM_EVENTS.RECONNECT) {
      const token = msg['token'];
      const roomId = msg['roomId'];
      if (typeof token !== 'string' || !token || typeof roomId !== 'string' || !roomId) {
        this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'token and roomId are required', 'VALIDATION_ERROR');
        return;
      }
      this.handleReconnect(socket, token, roomId);
      return;
    }

    // For CREATE_ROOM and JOIN_ROOM: token must be provided to identify the player
    if (event === ROOM_EVENTS.CREATE_ROOM || event === ROOM_EVENTS.JOIN_ROOM) {
      const token = msg['token'];
      if (typeof token !== 'string' || !token) {
        this.sendError(socket, ROOM_EVENTS.ERROR, 'token is required for authentication', 'AUTH_ERROR');
        return;
      }
      let playerId: string;
      try {
        const payload = this.authService.verifyToken(token);
        playerId = payload.playerId;
      } catch {
        this.sendError(socket, ROOM_EVENTS.ERROR, 'Invalid token', 'AUTH_ERROR');
        socket.close();
        return;
      }

      // Validate the rest of the message
      const validation = validateWsMessage(parsed);
      if (!validation.ok) {
        this.sendError(socket, ROOM_EVENTS.ERROR, validation.message, 'VALIDATION_ERROR');
        return;
      }

      if (event === ROOM_EVENTS.CREATE_ROOM) {
        const username = msg['username'] as string;
        const maxPlayers = msg['maxPlayers'] as number | undefined;
        const roleNames = msg['roleNames'] as import('@mafia/shared').RoleName[] | undefined;
        this.handleCreateRoom(socket, playerId, username, maxPlayers, roleNames);
      } else {
        const code = msg['code'] as string;
        const username = msg['username'] as string;
        this.handleJoinRoom(socket, playerId, code, username);
      }
      return;
    }

    this.sendError(socket, ROOM_EVENTS.ERROR, 'Authentication required', 'AUTH_ERROR');
    socket.close();
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private handleReconnect(socket: WebSocket, token: string, roomId: string): void {
    let playerId: string;
    try {
      const payload = this.authService.verifyToken(token);
      playerId = payload.playerId;
    } catch {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'Invalid token', 'AUTH_ERROR');
      socket.close();
      return;
    }

    // If game is finished — player may still be in disconnected set
    const isDisconnected = this.connections.isDisconnected(playerId);
    const storedRoomId = this.connections.getDisconnectedRoomId(playerId);

    if (!this.gameSessionManager.hasActiveGame(roomId)) {
      if (isDisconnected && storedRoomId === roomId) {
        // Game ended while player was disconnected — clean up and inform
        this.connections.unregister(playerId);
        this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'Game has already ended', 'RECONNECT_ERROR');
      } else {
        this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'No active game for this room', 'RECONNECT_ERROR');
      }
      return;
    }
    if (!isDisconnected) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'No disconnected session found for this player', 'RECONNECT_ERROR');
      return;
    }
    if (storedRoomId !== roomId) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'Room mismatch during reconnect', 'RECONNECT_ERROR');
      return;
    }
    try {
      this.connections.reregister(playerId, socket);
      const { gameState, snapshot } = this.gameSessionManager.getGameState(roomId);
      const personalState = this.filterGameStateForPlayer(gameState, playerId);
      socket.send(JSON.stringify({ event: ROOM_EVENTS.RECONNECTED, gameState: personalState, snapshot }));
      console.log(`[MessageHandler] Player ${playerId} reconnected to room ${roomId}`);
    } catch (err) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, toMessage(err), 'RECONNECT_ERROR');
    }
  }

  private handleCreateRoom(
    socket: WebSocket,
    playerId: string,
    username: string,
    maxPlayers?: number,
    roleNames?: import('@mafia/shared').RoleName[],
  ): void {
    if (!username?.trim()) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'username is required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const { room } = this.roomService.createRoomForPlayer(playerId, username.trim(), maxPlayers, roleNames);
      this.connections.register(playerId, room.id, socket);
      socket.send(JSON.stringify({ event: ROOM_EVENTS.ROOM_CREATED, room, playerId }));
      console.log(`[MessageHandler] Room ${room.code} created for player ${playerId}`);
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'CREATE_ROOM_ERROR');
    }
  }

  private handleJoinRoom(socket: WebSocket, playerId: string, code: string, username: string): void {
    if (!code?.trim() || !username?.trim()) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'code and username are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const { room } = this.roomService.joinRoomAsPlayer(playerId, code.trim(), username.trim());
      this.connections.register(playerId, room.id, socket);

      socket.send(JSON.stringify({ event: ROOM_EVENTS.ROOM_JOINED, room, playerId }));

      const joiningPlayer = room.players.find((p) => p.id === playerId);
      if (joiningPlayer) {
        this.connections.broadcastExcept(room.id, playerId, {
          event: ROOM_EVENTS.PLAYER_JOINED,
          roomId: room.id,
          player: joiningPlayer,
        });
      }

      this.connections.broadcastExcept(room.id, playerId, {
        event: ROOM_EVENTS.ROOM_UPDATED,
        room,
      });

      console.log(`[MessageHandler] Player ${playerId} joined room ${room.code}`);
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'JOIN_ROOM_ERROR');
    }
  }

  private handleLeaveRoom(socket: WebSocket, playerId: string, roomId: string): void {
    if (!roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'roomId is required', 'VALIDATION_ERROR');
      return;
    }
    // Verify player belongs to this room
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      this.performLeave(roomId, playerId);
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'LEAVE_ROOM_ERROR');
    }
  }

  private handleTakeSeat(socket: WebSocket, playerId: string, roomId: string, seat: number): void {
    if (!roomId || seat === undefined) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'roomId and seat are required', 'VALIDATION_ERROR');
      return;
    }
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      const room = this.roomService.takeSeat(roomId, playerId, seat);
      this.connections.broadcast(roomId, { event: ROOM_EVENTS.ROOM_UPDATED, room });
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'TAKE_SEAT_ERROR');
    }
  }

  private handlePlayerReady(socket: WebSocket, playerId: string, roomId: string, isReady: boolean): void {
    if (!roomId || isReady === undefined) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'roomId and isReady are required', 'VALIDATION_ERROR');
      return;
    }
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      const room = this.roomService.setReady(roomId, playerId, isReady);
      this.connections.broadcast(roomId, { event: ROOM_EVENTS.ROOM_UPDATED, room });
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'READY_ERROR');
    }
  }

  private handleRoomStateRequest(socket: WebSocket, playerId: string, roomId: string): void {
    if (!roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'roomId is required', 'VALIDATION_ERROR');
      return;
    }
    // Verify player belongs to this room
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, ROOM_EVENTS.ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      const room = this.roomService.getRoom(roomId);
      socket.send(JSON.stringify({ event: ROOM_EVENTS.ROOM_UPDATED, room }));
    } catch (err) {
      this.sendError(socket, ROOM_EVENTS.ERROR, toMessage(err), 'ROOM_STATE_ERROR');
    }
  }

  private handleStartGame(socket: WebSocket, playerId: string, roomId: string): void {
    if (!roomId) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'roomId is required', 'VALIDATION_ERROR');
      return;
    }
    // Verify player belongs to this room
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      this.gameSessionManager.startGame(roomId, playerId);
      console.log(`[MessageHandler] Game started in room ${roomId}`);
    } catch (err) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, toMessage(err), 'START_GAME_ERROR');
    }
  }

  private handlePlayerAction(
    socket: WebSocket,
    playerId: string,
    roomId: string,
    action: IPlayerAction,
  ): void {
    if (!roomId || !action) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'roomId and action are required', 'VALIDATION_ERROR');
      return;
    }
    // Verify player belongs to this room
    const playerRoomId = this.connections.getRoomIdByPlayer(playerId);
    if (playerRoomId !== roomId) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, 'Access denied', 'ACCESS_DENIED');
      return;
    }
    try {
      // Override action.playerId with server-authoritative playerId
      const trustedAction: IPlayerAction = { ...action, playerId };
      this.gameSessionManager.submitPlayerAction(roomId, trustedAction);
      console.log(`[MessageHandler] Player action received in room ${roomId}: ${action.type} by ${playerId}`);
    } catch (err) {
      this.sendError(socket, GAME_EVENTS.GAME_ERROR, toMessage(err), 'PLAYER_ACTION_ERROR');
    }
  }

  private performLeave(roomId: string, playerId: string): void {
    try {
      const { dto, removed } = this.roomService.leaveRoom(roomId, playerId);
      this.connections.unregister(playerId);

      if (removed) {
        this.connections.broadcast(roomId, { event: ROOM_EVENTS.ROOM_REMOVED, roomId });
        if (this.gameSessionManager.hasActiveGame(roomId)) {
          this.gameSessionManager.endGame(roomId);
        }
      } else if (dto) {
        this.connections.broadcast(roomId, { event: ROOM_EVENTS.PLAYER_LEFT, roomId, playerId });
        this.connections.broadcast(roomId, { event: ROOM_EVENTS.ROOM_UPDATED, room: dto });
      }
    } catch (err) {
      console.error(`[MessageHandler] Leave error for player ${playerId}: ${toMessage(err)}`);
    }
  }

  private filterGameStateForPlayer(gameState: GameStateDto, playerId: string): GameStateDto {
    return {
      ...gameState,
      players: gameState.players.map((p) => {
        if (p.id === playerId) return p;
        if (p.status === 'DEAD') return p;
        return { ...p, role: undefined };
      }),
    };
  }

  private sendError(
    socket: WebSocket,
    event: typeof ROOM_EVENTS.ERROR | typeof GAME_EVENTS.GAME_ERROR,
    message: string,
    code: string,
  ): void {
    const payload: WsRoomErrorPayload | WsGameErrorPayload = { event, message, code } as WsRoomErrorPayload | WsGameErrorPayload;
    socket.send(JSON.stringify(payload));
    console.warn(`[MessageHandler] Error [${code}]: ${message}`);
  }
}
