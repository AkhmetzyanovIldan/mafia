"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorRole = exports.DetectiveRole = exports.MafiaRole = exports.CivilianRole = void 0;
const shared_1 = require("@mafia/shared");
const Role_1 = require("../Role");
class CivilianRole extends Role_1.Role {
    constructor() {
        super(...arguments);
        this.name = shared_1.RoleName.CIVILIAN;
        this.team = shared_1.RoleTeam.TOWN;
        this.description = 'A town civilian with no special ability.';
        this.canActAtNight = false;
    }
}
exports.CivilianRole = CivilianRole;
class MafiaRole extends Role_1.Role {
    constructor() {
        super(...arguments);
        this.name = shared_1.RoleName.MAFIA;
        this.team = shared_1.RoleTeam.MAFIA;
        this.description = 'A mafia member who eliminates town players at night.';
        this.canActAtNight = true;
    }
}
exports.MafiaRole = MafiaRole;
class DetectiveRole extends Role_1.Role {
    constructor() {
        super(...arguments);
        this.name = shared_1.RoleName.DETECTIVE;
        this.team = shared_1.RoleTeam.TOWN;
        this.description = 'Can investigate one player per night to learn their team.';
        this.canActAtNight = true;
    }
}
exports.DetectiveRole = DetectiveRole;
class DoctorRole extends Role_1.Role {
    constructor() {
        super(...arguments);
        this.name = shared_1.RoleName.DOCTOR;
        this.team = shared_1.RoleTeam.TOWN;
        this.description = 'Can protect one player from elimination each night.';
        this.canActAtNight = true;
    }
}
exports.DoctorRole = DoctorRole;
//# sourceMappingURL=index.js.map