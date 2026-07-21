"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteAction = exports.InvestigateAction = exports.HealAction = exports.KillAction = exports.Action = void 0;
const shared_1 = require("@mafia/shared");
class Action {
}
exports.Action = Action;
class KillAction extends Action {
    constructor() {
        super(...arguments);
        this.type = shared_1.ActionType.KILL;
    }
    execute(_action) {
        // TODO: implement kill logic
        throw new Error('Not implemented');
    }
}
exports.KillAction = KillAction;
class HealAction extends Action {
    constructor() {
        super(...arguments);
        this.type = shared_1.ActionType.HEAL;
    }
    execute(_action) {
        // TODO: implement heal logic
        throw new Error('Not implemented');
    }
}
exports.HealAction = HealAction;
class InvestigateAction extends Action {
    constructor() {
        super(...arguments);
        this.type = shared_1.ActionType.INVESTIGATE;
    }
    execute(_action) {
        // TODO: implement investigate logic
        throw new Error('Not implemented');
    }
}
exports.InvestigateAction = InvestigateAction;
class VoteAction extends Action {
    constructor() {
        super(...arguments);
        this.type = shared_1.ActionType.VOTE;
    }
    execute(_action) {
        // TODO: implement vote logic
        throw new Error('Not implemented');
    }
}
exports.VoteAction = VoteAction;
//# sourceMappingURL=index.js.map