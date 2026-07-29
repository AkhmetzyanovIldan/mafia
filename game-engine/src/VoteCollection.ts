/**
 * Collects votes submitted during the VOTING phase.
 * Each voter may cast exactly one vote per phase — duplicates are rejected.
 * Stores only voterId → targetId.
 */
export class VoteCollection {
  private readonly votes = new Map<string, string>();

  /**
   * Submit a vote. Throws if the voter has already voted this phase.
   */
  submit(voterId: string, targetId: string): void {
    if (this.votes.has(voterId)) {
      throw new Error(`Player ${voterId} has already voted this phase`);
    }
    this.votes.set(voterId, targetId);
  }

  /** Returns all votes as an immutable snapshot. */
  getAll(): ReadonlyMap<string, string> {
    return this.votes;
  }

  /** How many votes have been cast. */
  count(): number {
    return this.votes.size;
  }

  /** Clears all votes. Called by RuleEngine after resolution. */
  clear(): void {
    this.votes.clear();
  }
}
