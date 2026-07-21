"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = void 0;
const shared_1 = require("@mafia/shared");
class GameState {
    constructor(roomId, players) {
        this.roomId = roomId;
        this.phase = shared_1.GamePhase.LOBBY;
        this.round = 0;
        this.players = players;
        this.phaseEndsAt = null;
        this.winner = null;
    }
    toSnapshot() {
        return {
            roomId: this.roomId,
            phase: this.phase,
            round: this.round,
            players: this.players.map((p) => p.toSnapshot()),
            phaseEndsAt: this.phaseEndsAt,
            winner: this.winner,
        };
    }
}
exports.GameState = GameState;
//# sourceMappingURL=GameState.js.map