"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const GameState_1 = require("./GameState");
const GameEvents_1 = require("./GameEvents");
/**
 * GameEngine is the single source of truth for game logic.
 * It is completely independent of networking and UI.
 * The backend instantiates one engine per active game room.
 */
class GameEngine {
    constructor(room) {
        this.state = new GameState_1.GameState(room.id, room.players);
        this.events = new GameEvents_1.GameEventBus();
    }
    getState() {
        return this.state;
    }
    /** Start the game — transitions from LOBBY to first phase. */
    start() {
        // TODO: assign roles, begin first phase
        throw new Error('Not implemented');
    }
    /** Submit a player action (kill, heal, investigate, vote). */
    submitAction(_action) {
        // TODO: validate and queue action
        throw new Error('Not implemented');
    }
    /** Advance to the next phase manually (used by timer or test). */
    advancePhase() {
        // TODO: resolve current phase, transition state
        throw new Error('Not implemented');
    }
    /** Check win conditions and return winner if game is over. */
    checkWinConditions() {
        // TODO: evaluate win conditions
        throw new Error('Not implemented');
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=GameEngine.js.map