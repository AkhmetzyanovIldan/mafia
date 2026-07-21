import type { RoomClientToServerEvent, RoomServerToClientEvent } from '@mafia/shared';

type EventHandler<T extends RoomServerToClientEvent> = (payload: T) => void;
type AnyHandler = EventHandler<RoomServerToClientEvent>;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, AnyHandler[]>();

  connect(url: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to', url);
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as RoomServerToClientEvent;
        const listeners = this.handlers.get(payload.event) ?? [];
        listeners.forEach((h) => h(payload));
      } catch {
        console.error('[WS] Failed to parse message:', event.data);
      }
    };

    this.socket.onerror = () => {
      console.error('[WS] Connection error');
    };

    this.socket.onclose = () => {
      console.log('[WS] Disconnected');
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  send(payload: RoomClientToServerEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else {
      console.warn('[WS] Cannot send — socket not open');
    }
  }

  on<K extends RoomServerToClientEvent>(event: string, handler: EventHandler<K>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler as AnyHandler]);
  }

  off<K extends RoomServerToClientEvent>(event: string, handler: EventHandler<K>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, existing.filter((h) => h !== (handler as AnyHandler)));
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
