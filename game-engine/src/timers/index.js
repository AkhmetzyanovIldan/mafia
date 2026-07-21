"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhaseTimer = void 0;
class PhaseTimer {
    constructor(durationMs) {
        this.handle = null;
        this.startedAt = null;
        this.durationMs = durationMs;
    }
    start(onExpire) {
        this.stop();
        this.startedAt = Date.now();
        this.handle = setTimeout(onExpire, this.durationMs);
    }
    stop() {
        if (this.handle !== null) {
            clearTimeout(this.handle);
            this.handle = null;
        }
        this.startedAt = null;
    }
    getRemainingMs() {
        if (this.startedAt === null)
            return this.durationMs;
        return Math.max(0, this.durationMs - (Date.now() - this.startedAt));
    }
    getEndsAt() {
        if (this.startedAt === null)
            return null;
        return new Date(this.startedAt + this.durationMs).toISOString();
    }
}
exports.PhaseTimer = PhaseTimer;
//# sourceMappingURL=index.js.map