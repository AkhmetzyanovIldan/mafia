import { GameEngine, Room, Player } from '@mafia/game-engine';
import type { GameStateDto, GameSnapshotDto, IPlayerAction } from '@mafia/shared';
import { GAME_CONSTANTS, ActionType, GamePhase } from '@mafia/shared';
import type { RoomRepository } from '../repositories/RoomRepository';

export interface StartGameResult {
  gameState: GameStateDto;
  snapshot: GameSnapshotDto;
}

export type PhaseChangedCallback = (roomId: string, gameState: GameStateDto, snapshot: GameSnapshotDto) => void;

export class GameSessionManager {
  private engines = new Map<string, GameEngine>();
  private onPhaseChanged: PhaseChangedCallback | null = null;

  constructor(private readonly roomRepo: RoomRepository) {}

  /** Register a callback invoked after every phase transition. */
  setPhaseChangedCallback(cb: PhaseChangedCallback): void {
    this.onPhaseChanged = cb;
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
      phaseDurationMs: GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS,
      votingDurationMs: GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS,
      nightDurationMs: GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS,
    });

    roomData.players.forEach((p) => {
      room.addPlayer(new Player(p.id, p.username, p.isHost));
    });

    const engine = new GameEngine(room);

    // Subscribe to phase transitions before start() so PREPARING is captured
    engine.events.on('phaseChanged', () => {
      if (this.onPhaseChanged) {
        this.onPhaseChanged(roomId, engine.getStateDto(), engine.exportSnapshot());
      }
    });

    engine.start();
    this.engines.set(roomId, engine);
    console.log(`[GameSessionManager] Game started for room ${roomId}`);

    return { gameState: engine.getStateDto(), snapshot: engine.exportSnapshot() };
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
    this.engines.delete(roomId);
    console.log(`[GameSessionManager] Game ended for room ${roomId}`);
  }

  submitPlayerAction(roomId: string, action: IPlayerAction): void {
    const engine = this.getEngine(roomId);
    
    // Enforce vote blocking if player is blocked and action is a vote
    if (action.type === ActionType.VOTE) {
      const gameState = engine.getStateDto();
      const player = gameState.players.find((p) => p.id === action.playerId);
      
      if (player?.blockedFromVoting) {
        throw new Error('Player is blocked from voting and cannot submit a vote');
      }
    }

    // Forward action to engine for processing
    if (engine.currentPhase() === GamePhase.NIGHT) {
      engine.submitNightAction(action);
    }
    // Additional phase-specific handling can be added here
  }

  private getEngine(roomId: string): GameEngine {
    const engine = this.engines.get(roomId);
    if (!engine) throw new Error(`No active game for room ${roomId}`);
    return engine;
  }
}
