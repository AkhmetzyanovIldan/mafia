import { ActionType } from '@mafia/shared';
import type { IPlayerAction } from '@mafia/shared';

export interface ActionResult {
  success: boolean;
  message: string;
}

export abstract class Action {
  abstract readonly type: ActionType;

  abstract execute(action: IPlayerAction): ActionResult;
}

export class KillAction extends Action {
  readonly type = ActionType.KILL;

  execute(_action: IPlayerAction): ActionResult {
    // TODO: implement kill logic
    throw new Error('Not implemented');
  }
}

export class HealAction extends Action {
  readonly type = ActionType.HEAL;

  execute(_action: IPlayerAction): ActionResult {
    // TODO: implement heal logic
    throw new Error('Not implemented');
  }
}

export class InvestigateAction extends Action {
  readonly type = ActionType.INVESTIGATE;

  execute(_action: IPlayerAction): ActionResult {
    // TODO: implement investigate logic
    throw new Error('Not implemented');
  }
}

export class VoteAction extends Action {
  readonly type = ActionType.VOTE;

  execute(_action: IPlayerAction): ActionResult {
    // TODO: implement vote logic
    throw new Error('Not implemented');
  }
}
