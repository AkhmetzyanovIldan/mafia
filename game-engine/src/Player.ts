import { PlayerStatus } from '@mafia/shared';
import type { IPlayer } from '@mafia/shared';
import type { Role } from './Role';

export class Player implements IPlayer {
  id: string;
  username: string;
  status: PlayerStatus;
  role?: Role;
  blockedFromVoting = false;
  hasShot = false;
  isHost: boolean;

  constructor(id: string, username: string, isHost = false) {
    this.id = id;
    this.username = username;
    this.status = PlayerStatus.ALIVE;
    this.isHost = isHost;
  }

  isAlive(): boolean {
    return this.status === PlayerStatus.ALIVE;
  }

  assignRole(role: Role): void {
    this.role = role;
  }

  toSnapshot(): IPlayer {
    return {
      id: this.id,
      username: this.username,
      status: this.status,
      role: this.role?.toSnapshot(),
      isHost: this.isHost,
    };
  }
}
