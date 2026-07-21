import { RoomStatus } from '@mafia/shared';
import type { IRoom, IRoomSettings } from '@mafia/shared';
import type { Player } from './Player';
import { GAME_CONSTANTS } from '@mafia/shared';

const DEFAULT_SETTINGS: IRoomSettings = {
  maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
  phaseDurationMs: GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS,
  votingDurationMs: GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS,
  nightDurationMs: GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS,
};

export class Room implements IRoom {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  settings: IRoomSettings;
  createdAt: string;

  constructor(id: string, code: string, hostId: string, settings?: Partial<IRoomSettings>) {
    this.id = id;
    this.code = code;
    this.hostId = hostId;
    this.status = RoomStatus.WAITING;
    this.players = [];
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.createdAt = new Date().toISOString();
  }

  addPlayer(player: Player): void {
    if (this.players.length >= this.settings.maxPlayers) {
      throw new Error('Room is full');
    }
    this.players.push(player);
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
  }

  toSnapshot(): IRoom {
    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      players: this.players.map((p) => p.toSnapshot()),
      settings: this.settings,
      createdAt: this.createdAt,
    };
  }
}
