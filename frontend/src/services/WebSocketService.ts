import type { RoomClientToServerEvent, RoomServerToClientEvent } from '@mafia/shared';

type EventHandler<T extends RoomServerToClientEvent> = (payload: T) => void;
type AnyHandler = EventHandler<RoomServerToClientEvent>;

const RECONNECT_DELAY_MS = 2000;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, AnyHandler[]>();
  private url: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onReconnectCallback: (() => void) | null = null;

  connect(url: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.url = url;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to', url);
      if (this.reconnectTimer !== null) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.onReconnectCallback?.();
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
      console.log('[WS] Disconnected — reconnecting in', RECONNECT_DELAY_MS, 'ms');
      this.socket = null;
      if (this.url) {
        this.reconnectTimer = setTimeout(() => this.connect(this.url!), RECONNECT_DELAY_MS);
      }
    };
  }

  setOnReconnect(cb: () => void): void {
    this.onReconnectCallback = cb;
  }

  disconnect(): void {
    this.url = null;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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

  on<K extends RoomServerToClientEvent>(event: K['event'], handler: EventHandler<K>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler as AnyHandler]);
  }

  off<K extends RoomServerToClientEvent>(event: K['event'], handler: EventHandler<K>): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, existing.filter((h) => h !== (handler as AnyHandler)));
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
