"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateHistory = void 0;
exports.cloneSnapshot = cloneSnapshot;
/** Utility to deep-clone a game snapshot. */
function cloneSnapshot(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
}
/** Simple in-memory history of game state snapshots. */
class StateHistory {
    constructor() {
        this.history = [];
    }
    push(snapshot) {
        this.history.push(cloneSnapshot(snapshot));
    }
    getLast() {
        return this.history[this.history.length - 1];
    }
    getAll() {
        return [...this.history];
    }
    clear() {
        this.history = [];
    }
}
exports.StateHistory = StateHistory;
//# sourceMappingURL=index.js.map