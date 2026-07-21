import { WebSocket } from 'ws';
import type { RoomServerToClientEvent } from '@mafia/shared';

export class ConnectionManager {
  private socketByPlayer = new Map<string, WebSocket>();
  private roomByPlayer = new Map<string, string>();
  private socketToPlayer = new Map<WebSocket, string>();

  register(playerId: string, roomId: string, socket: WebSocket): void {
    this.socketByPlayer.set(playerId, socket);
    this.roomByPlayer.set(playerId, roomId);
    this.socketToPlayer.set(socket, playerId);
    console.log(`[ConnectionManager] Registered player ${playerId} in room ${roomId}`);
  }

  unregister(playerId: string): void {
    const socket = this.socketByPlayer.get(playerId);
    if (socket) this.socketToPlayer.delete(socket);
    this.socketByPlayer.delete(playerId);
    this.roomByPlayer.delete(playerId);
    console.log(`[ConnectionManager] Unregistered player ${playerId}`);
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
