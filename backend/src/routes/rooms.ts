import { Router } from 'express';
import type { RoomController } from '../controllers/RoomController';
import type { AuthService } from '../services/AuthService';
import { createAuthMiddleware } from '../middleware/auth';

export function createRoomRouter(controller: RoomController, authService: AuthService): Router {
  const router = Router();
  const auth = createAuthMiddleware(authService);

  router.get('/', controller.listRooms);
  router.post('/', controller.create);
  router.get('/:roomId', controller.getRoom);
  router.post('/join', controller.join);
  router.delete('/:roomId/leave', auth, controller.leave);

  return router;
}
