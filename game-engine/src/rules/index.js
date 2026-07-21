"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateWinConditions = evaluateWinConditions;
const shared_1 = require("@mafia/shared");
/** Evaluates all win conditions against the current game state. */
function evaluateWinConditions(state) {
    // TODO: implement win condition logic
    const snapshot = state.toSnapshot();
    const alivePlayers = snapshot.players.filter((p) => p.status === shared_1.PlayerStatus.ALIVE);
    const aliveMafia = alivePlayers.filter((p) => p.role?.team === shared_1.RoleTeam.MAFIA);
    const aliveTown = alivePlayers.filter((p) => p.role?.team === shared_1.RoleTeam.TOWN);
    if (aliveMafia.length === 0) {
        return { isOver: true, winner: shared_1.WinCondition.TOWN_WINS };
    }
    if (aliveMafia.length >= aliveTown.length) {
        return { isOver: true, winner: shared_1.WinCondition.MAFIA_WINS };
    }
    return { isOver: false, winner: null };
}
//# sourceMappingURL=index.js.map