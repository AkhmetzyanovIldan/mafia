import { Router } from 'express';
import type { RoomController } from '../controllers/RoomController';

export function createRoomRouter(controller: RoomController): Router {
  const router = Router();

  router.get('/', controller.listRooms);
  router.post('/', controller.create);
  router.get('/:roomId', controller.getRoom);
  router.post('/join', controller.join);
  router.delete('/:roomId/leave', controller.leave);

  return router;
}
