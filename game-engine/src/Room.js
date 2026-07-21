"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const shared_1 = require("@mafia/shared");
const shared_2 = require("@mafia/shared");
const DEFAULT_SETTINGS = {
    maxPlayers: shared_2.GAME_CONSTANTS.MAX_PLAYERS,
    phaseDurationMs: shared_2.GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS,
    votingDurationMs: shared_2.GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS,
    nightDurationMs: shared_2.GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS,
};
class Room {
    constructor(id, code, hostId, settings) {
        this.id = id;
        this.code = code;
        this.hostId = hostId;
        this.status = shared_1.RoomStatus.WAITING;
        this.players = [];
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.createdAt = new Date().toISOString();
    }
    addPlayer(player) {
        if (this.players.length >= this.settings.maxPlayers) {
            throw new Error('Room is full');
        }
        this.players.push(player);
    }
    removePlayer(playerId) {
        this.players = this.players.filter((p) => p.id !== playerId);
    }
    toSnapshot() {
        return {
            id: this.id,
            code: this.code,
            hostId: this.hostId,
            status: this.status,
            players: this.players.map((p) => p.toSnapshot()),
            settings: this.settings,
            createdAt: this.createdAt,
        };
    }
}
exports.Room = Room;
//# sourceMappingURL=Room.js.map