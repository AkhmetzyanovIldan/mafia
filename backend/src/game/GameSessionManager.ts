import { GameEngine, Room, Player } from '@mafia/game-engine';
import type { GameStateDto, GameSnapshotDto, IPlayerAction } from '@mafia/shared';
import { GAME_CONSTANTS, ActionType, GamePhase, GAME_EVENTS, RoomStatus } from '@mafia/shared';
import type { RoomRepository } from '../repositories/RoomRepository';
import type { RoomService } from '../services/RoomService';
import type { ConnectionManager } from '../websocket/ConnectionManager';
import { PhaseTimerManager } from './PhaseTimerManager';

export interface StartGameResult {
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
}

export class GameSessionManager {
  private engines = new Map<string, GameEngine>();
  private timers = new Map<string, PhaseTimerManager>();
  private connections: ConnectionManager | null = null;

  constructor(
    private readonly roomRepo: RoomRepository,
    private readonly roomService: RoomService,
  ) {}

  setConnectionManager(cm: ConnectionManager): void {
    this.connections = cm;
  }

  startGame(roomId: string, requestingPlayerId: string): StartGameResult {
    const roomData = this.roomRepo.findById(roomId);
    if (!roomData) throw new Error(`Room ${roomId} not found`);

    if (roomData.hostId !== requestingPlayerId) {
      throw new Error('Only the host can start the game');
    }

    if (this.engines.has(roomId)) {
      throw new Error(`Game already started for room ${roomId}`);
    }

    if (roomData.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      throw new Error(
        `Need at least ${GAME_CONSTANTS.MIN_PLAYERS} players to start, have ${roomData.players.length}`,
      );
    }

    const room = new Room(roomData.id, roomData.code, roomData.hostId, {
      maxPlayers: roomData.maxPlayers,
      phaseDurationMs: roomData.phaseDurationMs ?? GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS,
      votingDurationMs: roomData.votingDurationMs ?? GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS,
      nightDurationMs: roomData.nightDurationMs ?? GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS,
      roleNames: roomData.roleNames,
      lastWordEnabled: roomData.lastWordEnabled,
    });

    roomData.players.forEach((p) => {
      room.addPlayer(new Player(p.id, p.username, p.isHost));
    });

    const engine = new GameEngine(room);
    const phaseTimerManager = new PhaseTimerManager(engine, room);

    engine.events.on('phaseChanged', () => {
      const gameState = engine.getStateDto();
      const snapshot = engine.exportSnapshot();
      const phaseEndsAt = this.timers.get(roomId)?.getEndsAt() ?? null;
      this.broadcastToRoom(roomId, { event: GAME_EVENTS.GAME_STATE, gameState, snapshot, phaseEndsAt });
    });

    engine.events.on('nightResolved', () => {
      const gameState = engine.getStateDto();
      const snapshot = engine.exportSnapshot();
      const phaseEndsAt = this.timers.get(roomId)?.getEndsAt() ?? null;
      this.broadcastToRoom(roomId, { event: GAME_EVENTS.GAME_STATE, gameState, snapshot, phaseEndsAt });
    });

    engine.events.on('votingResolved', () => {
      const gameState = engine.getStateDto();
      const snapshot = engine.exportSnapshot();
      const phaseEndsAt = this.timers.get(roomId)?.getEndsAt() ?? null;
      this.broadcastToRoom(roomId, { event: GAME_EVENTS.GAME_STATE, gameState, snapshot, phaseEndsAt });
    });

    engine.events.on('gameOver', ({ winner }) => {
      const gameState = engine.getStateDto();
      const snapshot = engine.exportSnapshot();
      // On game over — always reveal all roles
      this.broadcastToRoom(roomId, { event: GAME_EVENTS.GAME_STATE, gameState, snapshot, phaseEndsAt: null });
      console.log(`[GameSessionManager] Game over in room ${roomId} — winner: ${winner}`);
      const rd = this.roomRepo.findById(roomId);
      if (rd) {
        rd.status = RoomStatus.FINISHED;
        this.roomRepo.save(rd);
      }
      this.cleanupGame(roomId);
    });

    engine.start();

    // Mark room as IN_PROGRESS
    roomData.status = RoomStatus.IN_PROGRESS;
    this.roomRepo.save(roomData);

    this.engines.set(roomId, engine);
    this.timers.set(roomId, phaseTimerManager);
    console.log(`[GameSessionManager] Game started for room ${roomId}`);

    return { gameState: engine.getStateDto(), snapshot: engine.exportSnapshot() };
  }

  resetGame(roomId: string, requestingPlayerId: string): void {
    const roomData = this.roomRepo.findById(roomId);
    if (!roomData) throw new Error(`Room ${roomId} not found`);
    if (roomData.hostId !== requestingPlayerId) throw new Error('Only the host can reset the game');
    if (this.engines.has(roomId)) throw new Error('Cannot reset while game is in progress');
    const room = this.roomService.resetRoom(roomId);
    this.connections?.broadcast(roomId, { event: GAME_EVENTS.GAME_RESET, room });
    console.log(`[GameSessionManager] Game reset for room ${roomId}`);
  }

  getGameState(roomId: string): StartGameResult {
    const engine = this.getEngine(roomId);
    return { gameState: engine.getStateDto(), snapshot: engine.exportSnapshot() };
  }

  exportSnapshot(roomId: string): GameSnapshotDto {
    return this.getEngine(roomId).exportSnapshot();
  }

  hasActiveGame(roomId: string): boolean {
    return this.engines.has(roomId);
  }

  endGame(roomId: string): void {
    const engine = this.engines.get(roomId);
    if (engine) {
      const gameState = engine.getStateDto();
      const snapshot = engine.exportSnapshot();
      this.broadcastToRoom(roomId, {
        event: GAME_EVENTS.GAME_STATE,
        gameState,
        snapshot,
      });
    }
    // Update room status to FINISHED
    const roomData = this.roomRepo.findById(roomId);
    if (roomData) {
      roomData.status = RoomStatus.FINISHED;
      this.roomRepo.save(roomData);
    }
    this.cleanupGame(roomId);
    console.log(`[GameSessionManager] Game ended for room ${roomId}`);
  }

  submitPlayerAction(roomId: string, action: IPlayerAction): void {
    const engine = this.getEngine(roomId);

    if (action.type === ActionType.VOTE) {
      engine.submitVote(action.playerId, action.targetId);
      this.tryAutoCompleteVoting(roomId, engine);
      return;
    }

    if (engine.currentPhase() === GamePhase.NIGHT) {
      engine.submitNightAction(action);
    }
  }

  private tryAutoCompleteVoting(roomId: string, engine: GameEngine): void {
    const eligible = engine.getEligibleVoters();
    if (eligible.length > 0 && engine.voteCount() >= eligible.length) {
      console.log(`[GameSessionManager] All eligible players voted in room ${roomId} — resolving voting`);
      engine.completeVoting();
    }
  }

  private cleanupGame(roomId: string): void {
    this.timers.get(roomId)?.stop();
    this.timers.delete(roomId);
    this.engines.delete(roomId);
    this.connections?.clearDisconnectedByRoom(roomId);
  }

  private broadcastToRoom(roomId: string, payload: import('@mafia/shared').RoomServerToClientEvent): void {
    this.connections?.broadcast(roomId, payload);
  }

  private getEngine(roomId: string): GameEngine {
    const engine = this.engines.get(roomId);
    if (!engine) throw new Error(`No active game for room ${roomId}`);
    return engine;
  }
}
