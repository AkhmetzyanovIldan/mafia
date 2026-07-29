import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import type { AuthService } from '../services/AuthService';
import { fail } from '../types';

export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json(fail('Authorization header required'));
      return;
    }
    const token = header.slice(7);
    try {
      const payload = authService.verifyToken(token);
      req.playerId = payload.playerId;
      next();
    } catch {
      res.status(401).json(fail('Invalid or expired token'));
    }
  };
}
