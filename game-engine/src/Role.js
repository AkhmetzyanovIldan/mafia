"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
class Role {
    toSnapshot() {
        return {
            name: this.name,
            team: this.team,
            description: this.description,
            canActAtNight: this.canActAtNight,
        };
    }
}
exports.Role = Role;
//# sourceMappingURL=Role.js.map