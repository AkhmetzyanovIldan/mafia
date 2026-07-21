import { GamePhase } from '@mafia/shared';
import { Phase } from '../Phase';
import type { GameState } from '../GameState';
import { GAME_CONSTANTS } from '@mafia/shared';

export class LobbyPhase extends Phase {
  readonly name = GamePhase.WAITING;
  readonly durationMs = 0;

  onEnter(_state: GameState): void {
    // TODO: prepare lobby state
  }

  onExit(_state: GameState): GamePhase {
    return GamePhase.PREPARING;
  }
}

export class NightPhase extends Phase {
  readonly name = GamePhase.NIGHT;
  readonly durationMs = GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS;

  onEnter(_state: GameState): void {
    // TODO: notify night-action roles
  }

  onExit(_state: GameState): GamePhase {
    return GamePhase.MORNING;
  }
}

export class DayPhase extends Phase {
  readonly name = GamePhase.DAY_SPEECH;
  readonly durationMs = GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS;

  onEnter(_state: GameState): void {
    // TODO: resolve night actions, announce results
  }

  onExit(_state: GameState): GamePhase {
    return GamePhase.DAY_DISCUSSION;
  }
}

export class VotingPhase extends Phase {
  readonly name = GamePhase.VOTING;
  readonly durationMs = GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS;

  onEnter(_state: GameState): void {
    // TODO: open voting
  }

  onExit(_state: GameState): GamePhase {
    return GamePhase.CHECK_VICTORY;
  }
}
