import express from 'express';
import cors from 'cors';
import { config } from './config';
import { createRoomRouter, createAuthRouter } from './routes';
import { RoomController, AuthController } from './controllers';
import { AuthService, RoomService } from './services';
import { RoomRepository, PlayerRepository } from './repositories';
import { GameSessionManager } from './game';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  const roomRepo = new RoomRepository();
  const playerRepo = new PlayerRepository();

  const authService = new AuthService();
  const roomService = new RoomService(roomRepo);
  const gameSessionManager = new GameSessionManager(roomRepo);

  const authController = new AuthController(authService);
  const roomController = new RoomController(roomService);

  app.use('/api/auth', createAuthRouter(authController));
  app.use('/api/rooms', createRoomRouter(roomController));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // playerRepo kept for future player session management
  void playerRepo;

  return { app, authService, roomService, gameSessionManager };
}
