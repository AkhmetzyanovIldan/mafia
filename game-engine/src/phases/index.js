"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingPhase = exports.DayPhase = exports.NightPhase = exports.LobbyPhase = void 0;
const shared_1 = require("@mafia/shared");
const Phase_1 = require("../Phase");
const shared_2 = require("@mafia/shared");
class LobbyPhase extends Phase_1.Phase {
    constructor() {
        super(...arguments);
        this.name = shared_1.GamePhase.LOBBY;
        this.durationMs = 0;
    }
    onEnter(_state) {
        // TODO: prepare lobby state
    }
    onExit(_state) {
        return shared_1.GamePhase.NIGHT;
    }
}
exports.LobbyPhase = LobbyPhase;
class NightPhase extends Phase_1.Phase {
    constructor() {
        super(...arguments);
        this.name = shared_1.GamePhase.NIGHT;
        this.durationMs = shared_2.GAME_CONSTANTS.DEFAULT_NIGHT_DURATION_MS;
    }
    onEnter(_state) {
        // TODO: notify night-action roles
    }
    onExit(_state) {
        return shared_1.GamePhase.DAY;
    }
}
exports.NightPhase = NightPhase;
class DayPhase extends Phase_1.Phase {
    constructor() {
        super(...arguments);
        this.name = shared_1.GamePhase.DAY;
        this.durationMs = shared_2.GAME_CONSTANTS.DEFAULT_PHASE_DURATION_MS;
    }
    onEnter(_state) {
        // TODO: resolve night actions, announce results
    }
    onExit(_state) {
        return shared_1.GamePhase.VOTING;
    }
}
exports.DayPhase = DayPhase;
class VotingPhase extends Phase_1.Phase {
    constructor() {
        super(...arguments);
        this.name = shared_1.GamePhase.VOTING;
        this.durationMs = shared_2.GAME_CONSTANTS.DEFAULT_VOTING_DURATION_MS;
    }
    onEnter(_state) {
        // TODO: open voting
    }
    onExit(_state) {
        return shared_1.GamePhase.NIGHT;
    }
}
exports.VotingPhase = VotingPhase;
//# sourceMappingURL=index.js.map