import { WebSocket } from 'ws';
import type { RoomServerToClientEvent } from '@mafia/shared';

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 10;

export class ConnectionManager {
  private socketByPlayer = new Map<string, WebSocket>();
  private roomByPlayer = new Map<string, string>();
  private socketToPlayer = new Map<WebSocket, string>();
  private disconnectedPlayers = new Map<string, string>(); // playerId → roomId

  // Rate limiting: socket → { count, windowStart }
  private rateLimit = new Map<WebSocket, { count: number; windowStart: number }>();

  register(playerId: string, roomId: string, socket: WebSocket): void {
    this.socketByPlayer.set(playerId, socket);
    this.roomByPlayer.set(playerId, roomId);
    this.socketToPlayer.set(socket, playerId);
    console.log(`[ConnectionManager] Registered player ${playerId} in room ${roomId}`);
  }

  unregister(playerId: string): void {
    const socket = this.socketByPlayer.get(playerId);
    if (socket) {
      this.socketToPlayer.delete(socket);
      this.rateLimit.delete(socket);
    }
    this.socketByPlayer.delete(playerId);
    this.roomByPlayer.delete(playerId);
    this.disconnectedPlayers.delete(playerId);
    console.log(`[ConnectionManager] Unregistered player ${playerId}`);
  }

  disconnect(playerId: string): void {
    const socket = this.socketByPlayer.get(playerId);
    if (socket) {
      this.socketToPlayer.delete(socket);
      this.rateLimit.delete(socket);
    }
    this.socketByPlayer.delete(playerId);

    const roomId = this.roomByPlayer.get(playerId);
    if (roomId) {
      this.disconnectedPlayers.set(playerId, roomId);
    }
    console.log(`[ConnectionManager] Player ${playerId} disconnected (room ${roomId ?? 'unknown'} preserved)`);
  }

  reregister(playerId: string, socket: WebSocket): boolean {
    const roomId = this.disconnectedPlayers.get(playerId);
    if (!roomId) return false;
    this.disconnectedPlayers.delete(playerId);
    this.register(playerId, roomId, socket);
    console.log(`[ConnectionManager] Player ${playerId} reregistered in room ${roomId}`);
    return true;
  }

  isDisconnected(playerId: string): boolean {
    return this.disconnectedPlayers.has(playerId);
  }

  getDisconnectedRoomId(playerId: string): string | undefined {
    return this.disconnectedPlayers.get(playerId);
  }

  clearDisconnectedByRoom(roomId: string): void {
    for (const [playerId, rid] of this.disconnectedPlayers.entries()) {
      if (rid === roomId) this.disconnectedPlayers.delete(playerId);
    }
  }

  unregisterBySocket(socket: WebSocket): string | undefined {
    const playerId = this.socketToPlayer.get(socket);
    if (playerId) this.unregister(playerId);
    return playerId;
  }

  getPlayerIdBySocket(socket: WebSocket): string | undefined {
    return this.socketToPlayer.get(socket);
  }

  getRoomIdByPlayer(playerId: string): string | undefined {
    return this.roomByPlayer.get(playerId);
  }

  /**
   * Returns true if the socket is within rate limit, false if exceeded.
   */
  checkRateLimit(socket: WebSocket): boolean {
    const now = Date.now();
    const entry = this.rateLimit.get(socket);
    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      this.rateLimit.set(socket, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_LIMIT_MAX;
  }

  cleanupSocket(socket: WebSocket): void {
    this.rateLimit.delete(socket);
  }

  send(playerId: string, payload: RoomServerToClientEvent): void {
    const socket = this.socketByPlayer.get(playerId);
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  broadcast(roomId: string, payload: RoomServerToClientEvent): void {
    for (const [playerId, rid] of this.roomByPlayer.entries()) {
      if (rid === roomId) this.send(playerId, payload);
    }
  }

  broadcastExcept(roomId: string, excludePlayerId: string, payload: RoomServerToClientEvent): void {
    for (const [playerId, rid] of this.roomByPlayer.entries()) {
      if (rid === roomId && playerId !== excludePlayerId) this.send(playerId, payload);
    }
  }

  getPlayersInRoom(roomId: string): string[] {
    return [...this.roomByPlayer.entries()]
      .filter(([, rid]) => rid === roomId)
      .map(([pid]) => pid);
  }
}
