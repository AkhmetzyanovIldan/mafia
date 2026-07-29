export type TimerCallback = () => void;

export class PhaseTimer {
  private handle: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private durationMs: number;

  constructor(durationMs: number) {
    this.durationMs = durationMs;
  }

  /** Stop the current timer and set a new duration. */
  reset(durationMs: number): void {
    this.stop();
    this.durationMs = durationMs;
  }

  start(onExpire: TimerCallback): void {
    this.stop();
    this.startedAt = Date.now();
    this.handle = setTimeout(onExpire, this.durationMs);
  }

  stop(): void {
    if (this.handle !== null) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.startedAt = null;
  }

  getRemainingMs(): number {
    if (this.startedAt === null) return this.durationMs;
    return Math.max(0, this.durationMs - (Date.now() - this.startedAt));
  }

  getEndsAt(): string | null {
    if (this.startedAt === null) return null;
    return new Date(this.startedAt + this.durationMs).toISOString();
  }
}
