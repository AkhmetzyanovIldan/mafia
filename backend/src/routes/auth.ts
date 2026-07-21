import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/guest', controller.guest);

  return router;
}
