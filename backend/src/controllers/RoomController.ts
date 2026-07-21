import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types';
import { ok, fail } from '../types';
import type { RoomService } from '../services/RoomService';

export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  create = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { username, maxPlayers } = req.body as { username: string; maxPlayers?: number };
      const { room, playerId } = this.roomService.createRoom(username, maxPlayers);
      res.status(201).json(ok({ room, playerId }));
    } catch (err) {
      res.status(400).json(fail((err as Error).message));
    }
  };

  join = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { code, username } = req.body as { code: string; username: string };
      const { room, playerId } = this.roomService.joinRoom(code, username);
      res.json(ok({ room, playerId }));
    } catch (err) {
      res.status(400).json(fail((err as Error).message));
    }
  };

  leave = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { roomId } = req.params;
      const { playerId } = req.body as { playerId: string };
      const { dto, removed } = this.roomService.leaveRoom(roomId, playerId);
      res.json(ok({ room: dto, removed }));
    } catch (err) {
      res.status(400).json(fail((err as Error).message));
    }
  };

  getRoom = (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { roomId } = req.params;
      const room = this.roomService.getRoom(roomId);
      res.json(ok(room));
    } catch (err) {
      res.status(404).json(fail((err as Error).message));
    }
  };

  listRooms = (_req: AuthenticatedRequest, res: Response): void => {
    const rooms = this.roomService.listRooms();
    res.json(ok(rooms));
  };
}
