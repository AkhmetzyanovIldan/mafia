import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createApp } from './app';
import { config } from './config';
import { ConnectionManager, MessageHandler } from './websocket';

const { app, authService, roomService, gameSessionManager } = createApp();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 4096 });

const connections = new ConnectionManager();
const messageHandler = new MessageHandler(connections, roomService, gameSessionManager, authService);

wss.on('connection', (socket: WebSocket) => {
  console.log('[WS] New connection established');

  socket.on('message', (data) => {
    messageHandler.handle(socket, data.toString());
  });

  socket.on('close', () => {
    messageHandler.handleDisconnect(socket);
  });

  socket.on('error', (err) => {
    console.error('[WS] Socket error:', err.message);
    messageHandler.handleDisconnect(socket);
  });
});

server.listen(config.port, config.host, () => {
  console.log(`[Server] Running on http://${config.host}:${config.port}`);
  console.log(`[WS]     WebSocket ready on ws://${config.host}:${config.port}`);
});
