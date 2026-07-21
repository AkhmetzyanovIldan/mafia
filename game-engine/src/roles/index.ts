import { RoleName, RoleTeam } from '@mafia/shared';
import { Role } from '../Role';

export class CivilianRole extends Role {
  name = RoleName.CIVILIAN;
  team = RoleTeam.TOWN;
  description = 'A town civilian with no special ability.';
  canActAtNight = false;
}

export class MafiaRole extends Role {
  name = RoleName.MAFIA;
  team = RoleTeam.MAFIA;
  description = 'A mafia member who eliminates town players at night.';
  canActAtNight = true;
}

export class DonRole extends Role {
  name = RoleName.DON;
  team = RoleTeam.MAFIA;
  description = 'A mafia leader who can kill and detect special investigators at night.';
  canActAtNight = true;
}

export class DetectiveRole extends Role {
  name = RoleName.DETECTIVE;
  team = RoleTeam.TOWN;
  description = 'Can investigate one player per night to learn their team.';
  canActAtNight = true;
}

export class CommissionerRole extends Role {
  name = RoleName.COMMISSIONER;
  team = RoleTeam.TOWN;
  description = 'Can investigate one player per night to learn their team.';
  canActAtNight = true;
}

export class DoctorRole extends Role {
  name = RoleName.DOCTOR;
  team = RoleTeam.TOWN;
  description = 'Can protect one player from elimination each night.';
  canActAtNight = true;
}

export class LoverRole extends Role {
  name = RoleName.LOVER;
  team = RoleTeam.TOWN;
  description = 'Can block one player each night, preventing their night ability.';
  canActAtNight = true;
}

export class AdvocateRole extends Role {
  name = RoleName.ADVOCATE;
  team = RoleTeam.TOWN;
  description = 'Can perform a profession check on one player per night.';
  canActAtNight = true;
}

export class JournalistRole extends Role {
  name = RoleName.JOURNALIST;
  team = RoleTeam.TOWN;
  description = 'Can check whether two players belong to the same team.';
  canActAtNight = true;
}

export class SergeantRole extends Role {
  name = RoleName.SERGEANT;
  team = RoleTeam.TOWN;
  description = 'Has one night shot per game and cannot shoot on the first night.';
  canActAtNight = true;
}
