"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const shared_1 = require("@mafia/shared");
class Player {
    constructor(id, username, isHost = false) {
        this.id = id;
        this.username = username;
        this.status = shared_1.PlayerStatus.ALIVE;
        this.isHost = isHost;
    }
    isAlive() {
        return this.status === shared_1.PlayerStatus.ALIVE;
    }
    assignRole(role) {
        this.role = role;
    }
    toSnapshot() {
        return {
            id: this.id,
            username: this.username,
            status: this.status,
            role: this.role?.toSnapshot(),
            isHost: this.isHost,
        };
    }
}
exports.Player = Player;
//# sourceMappingURL=Player.js.map