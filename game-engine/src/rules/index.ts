import { WinCondition, RoleTeam, PlayerStatus } from '@mafia/shared';
import type { GameState } from '../GameState';

export interface RuleCheckResult {
  isOver: boolean;
  winner: WinCondition | null;
}

/** Evaluates all win conditions against the current game state. */
export function evaluateWinConditions(state: GameState): RuleCheckResult {
  // TODO: implement win condition logic
  const snapshot = state.toSnapshot();
  const alivePlayers = snapshot.players.filter((p) => p.status === PlayerStatus.ALIVE);
  const aliveMafia = alivePlayers.filter((p) => p.role?.team === RoleTeam.MAFIA);
  const aliveTown = alivePlayers.filter((p) => p.role?.team === RoleTeam.TOWN);

  if (aliveMafia.length === 0) {
    return { isOver: true, winner: WinCondition.TOWN_WINS };
  }

  if (aliveMafia.length >= aliveTown.length) {
    return { isOver: true, winner: WinCondition.MAFIA_WINS };
  }

  return { isOver: false, winner: null };
}
