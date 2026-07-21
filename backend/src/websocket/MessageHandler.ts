import type { WebSocket } from 'ws';
import { ROOM_EVENTS, GAME_EVENTS } from '@mafia/shared';
import type { RoomClientToServerEvent, WsRoomErrorPayload, WsGameErrorPayload } from '@mafia/shared';
import type { ConnectionManager } from './ConnectionManager';
import type { RoomService } from '../services/RoomService';
import type { GameSessionManager } from '../game/GameSessionManager';

export class MessageHandler {
  constructor(
    private readonly connections: ConnectionManager,
    private readonly roomService: RoomService,
    private readonly gameSessionManager: GameSessionManager,
  ) {
    // Broadcast GAME_STATE to the room after every phase transition
    this.gameSessionManager.setPhaseChangedCallback((roomId, gameState, snapshot) => {
      this.connections.broadcast(roomId, {
        event: GAME_EVENTS.GAME_STATE,
        gameState,
        snapshot,
      });
      console.log(`[MessageHandler] GAME_STATE broadcast after phase → ${gameState.currentPhase} in room ${roomId}`);
    });
  }

  handle(socket: WebSocket, raw: string): void {
    let message: RoomClientToServerEvent;

    try {
      message = JSON.parse(raw) as RoomClientToServerEvent;
    } catch {
      this.sendRoomError(socket, 'Invalid JSON payload', 'PARSE_ERROR');
      return;
    }

    console.log(`[MessageHandler] Received event: ${message.event}`);

    switch (message.event) {
      case ROOM_EVENTS.CREATE_ROOM:
        this.handleCreateRoom(socket, message.username, message.maxPlayers);
        break;
      case ROOM_EVENTS.JOIN_ROOM:
        this.handleJoinRoom(socket, message.code, message.username);
        break;
      case ROOM_EVENTS.LEAVE_ROOM:
        this.handleLeaveRoom(socket, message.roomId, message.playerId);
        break;
      case ROOM_EVENTS.ROOM_STATE_REQUEST:
        this.handleRoomStateRequest(socket, message.roomId, message.playerId);
        break;
      case GAME_EVENTS.START_GAME:
        this.handleStartGame(socket, message.roomId, message.playerId);
        break;
      case GAME_EVENTS.PLAYER_ACTION:
        this.handlePlayerAction(socket, message.roomId, message.action);
        break;
      default:
        this.sendRoomError(socket, 'Unknown event', 'UNKNOWN_EVENT');
    }
  }

  handleDisconnect(socket: WebSocket): void {
    const playerId = this.connections.getPlayerIdBySocket(socket);
    if (!playerId) return;

    const roomId = this.connections.getRoomIdByPlayer(playerId);
    console.log(`[MessageHandler] Player ${playerId} disconnected from room ${roomId ?? 'unknown'}`);

    if (roomId) {
      this.performLeave(roomId, playerId);
    }
  }

  private handleCreateRoom(socket: WebSocket, username: string, maxPlayers?: number): void {
    if (!username?.trim()) {
      this.sendRoomError(socket, 'username is required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const { room, playerId } = this.roomService.createRoom(username.trim(), maxPlayers);
      this.connections.register(playerId, room.id, socket);
      socket.send(JSON.stringify({ event: ROOM_EVENTS.ROOM_CREATED, room, playerId }));
      console.log(`[MessageHandler] Room ${room.code} created for player ${playerId}`);
    } catch (err) {
      this.sendRoomError(socket, (err as Error).message, 'CREATE_ROOM_ERROR');
    }
  }

  private handleJoinRoom(socket: WebSocket, code: string, username: string): void {
    if (!code?.trim() || !username?.trim()) {
      this.sendRoomError(socket, 'code and username are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const { room, playerId } = this.roomService.joinRoom(code.trim(), username.trim());
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
      this.sendRoomError(socket, (err as Error).message, 'JOIN_ROOM_ERROR');
    }
  }

  private handleLeaveRoom(socket: WebSocket, roomId: string, playerId: string): void {
    if (!roomId || !playerId) {
      this.sendRoomError(socket, 'roomId and playerId are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      this.performLeave(roomId, playerId);
    } catch (err) {
      this.sendRoomError(socket, (err as Error).message, 'LEAVE_ROOM_ERROR');
    }
  }

  private handleRoomStateRequest(socket: WebSocket, roomId: string, playerId: string): void {
    if (!roomId || !playerId) {
      this.sendRoomError(socket, 'roomId and playerId are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const room = this.roomService.getRoom(roomId);
      socket.send(JSON.stringify({ event: ROOM_EVENTS.ROOM_UPDATED, room }));
    } catch (err) {
      this.sendRoomError(socket, (err as Error).message, 'ROOM_STATE_ERROR');
    }
  }

  private handleStartGame(socket: WebSocket, roomId: string, playerId: string): void {
    if (!roomId || !playerId) {
      this.sendGameError(socket, 'roomId and playerId are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      const { gameState, snapshot } = this.gameSessionManager.startGame(roomId, playerId);

      this.connections.broadcast(roomId, {
        event: GAME_EVENTS.GAME_STARTED,
        gameState,
        snapshot,
      });

      console.log(`[MessageHandler] GAME_STARTED broadcast to room ${roomId}`);
    } catch (err) {
      this.sendGameError(socket, (err as Error).message, 'START_GAME_ERROR');
    }
  }

  private handlePlayerAction(socket: WebSocket, roomId: string, action: import('@mafia/shared').IPlayerAction): void {
    if (!roomId || !action) {
      this.sendGameError(socket, 'roomId and action are required', 'VALIDATION_ERROR');
      return;
    }
    try {
      this.gameSessionManager.submitPlayerAction(roomId, action);
      console.log(`[MessageHandler] Player action received in room ${roomId}: ${action.type} by ${action.playerId}`);
    } catch (err) {
      this.sendGameError(socket, (err as Error).message, 'PLAYER_ACTION_ERROR');
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
      console.error(`[MessageHandler] Leave error for player ${playerId}: ${(err as Error).message}`);
    }
  }

  private sendRoomError(socket: WebSocket, message: string, code: string): void {
    const payload: WsRoomErrorPayload = { event: ROOM_EVENTS.ERROR, message, code };
    socket.send(JSON.stringify(payload));
    console.warn(`[MessageHandler] Room error [${code}]: ${message}`);
  }

  private sendGameError(socket: WebSocket, message: string, code: string): void {
    const payload: WsGameErrorPayload = { event: GAME_EVENTS.GAME_ERROR, message, code };
    socket.send(JSON.stringify(payload));
    console.warn(`[MessageHandler] Game error [${code}]: ${message}`);
  }
}
