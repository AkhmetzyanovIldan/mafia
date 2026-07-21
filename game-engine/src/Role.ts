import { RoleName, RoleTeam } from '@mafia/shared';
import type { IRole } from '@mafia/shared';

export abstract class Role implements IRole {
  abstract name: RoleName;
  abstract team: RoleTeam;
  abstract description: string;
  abstract canActAtNight: boolean;

  toSnapshot(): IRole {
    return {
      name: this.name,
      team: this.team,
      description: this.description,
      canActAtNight: this.canActAtNight,
    };
  }
}
