import {
  PlayerStatus,
  RoleName,
  RoleTeam,
  GamePhase,
  RoomStatus,
  ActionType,
  WinCondition,
  GameSessionStatus,
} from '../enums';

export interface IPlayer {
  id: string;
  username: string;
  status: PlayerStatus;
  role?: IRole;
  isHost: boolean;
}

export interface IRole {
  name: RoleName;
  team: RoleTeam;
  description: string;
  canActAtNight: boolean;
}

export interface IRoom {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: IPlayer[];
  settings: IRoomSettings;
  createdAt: string;
}

export interface IRoomSettings {
  maxPlayers: number;
  phaseDurationMs: number;
  votingDurationMs: number;
  nightDurationMs: number;
  roleNames?: RoleName[];
}

export interface IGameState {
  roomId: string;
  phase: GamePhase;
  round: number;
  players: IPlayer[];
  phaseEndsAt: string | null;
  winner: WinCondition | null;
}

export interface IPlayerAction {
  playerId: string;
  type: ActionType;
  targetId: string;
  secondaryTargetId?: string;
}

export interface IVoiceChannel {
  roomId: string;
  participants: string[];
}

// Room Management module DTOs

export interface PlayerDto {
  id: string;
  username: string;
  isHost: boolean;
  status: PlayerStatus;
}

export interface RoomStateDto {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerDto[];
  maxPlayers: number;
  createdAt: string;
}

// Game Session player shape — used by both IGameSession and GameStateDto

export interface GamePlayerDto {
  id: string;
  username: string;
  isHost: boolean;
  status: PlayerStatus;
  blockedFromVoting?: boolean;
  role?: IRole;
}

// Game Session module

export interface IGameSession {
  gameId: string;
  roomId: string;
  status: GameSessionStatus;
  currentPhase: GamePhase;
  players: GamePlayerDto[];
  createdAt: string;
  startedAt: string;
}
