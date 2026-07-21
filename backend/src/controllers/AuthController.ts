import type { Request, Response } from 'express';
import { ok, fail } from '../types';
import type { AuthService } from '../services/AuthService';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  guest = (req: Request, res: Response): void => {
    try {
      const { username } = req.body as { username: string };
      if (!username?.trim()) {
        res.status(400).json(fail('username is required'));
        return;
      }
      const identity = this.authService.createGuestIdentity(username.trim());
      res.status(201).json(ok(identity));
    } catch (err) {
      res.status(500).json(fail((err as Error).message));
    }
  };
}
