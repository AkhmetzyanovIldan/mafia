import type { IPlayerAction } from '@mafia/shared';
import { ActionType } from '@mafia/shared';

/**
 * Collects night actions submitted concurrently by all active night-role players.
 *
 * There is no ordering, no per-role turns, no sequencing.
 * Each player may submit exactly one action per night.
 * All submissions are held until RuleEngine.resolveNight() drains the collection.
 */
export class NightActionCollection {
  /** One action per player — last write wins if a player resubmits. */
  private readonly actions = new Map<string, IPlayerAction>();

  /**
   * Submit or replace a night action for a player.
   * Only KILL, HEAL, INVESTIGATE, BLOCK, and SHOOT are valid night action types.
   */
  submit(action: IPlayerAction): void {
    if (!NIGHT_ACTION_TYPES.has(action.type)) {
      throw new Error(
        `Action type ${action.type} is not a valid night action. ` +
        `Allowed: ${[...NIGHT_ACTION_TYPES].join(', ')}`,
      );
    }
    this.actions.set(action.playerId, action);
  }

  /** Returns all submitted actions as an immutable snapshot. */
  getAll(): readonly IPlayerAction[] {
    return [...this.actions.values()];
  }

  /** How many players have submitted so far. */
  count(): number {
    return this.actions.size;
  }

  /** Clears all collected actions. Called by RuleEngine after resolution. */
  clear(): void {
    this.actions.clear();
  }
}

const NIGHT_ACTION_TYPES = new Set<ActionType>([
  ActionType.KILL,
  ActionType.HEAL,
  ActionType.INVESTIGATE,
  ActionType.BLOCK,
  ActionType.SHOOT,
]);
