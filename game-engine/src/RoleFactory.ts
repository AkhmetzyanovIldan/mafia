import { RoleName } from '@mafia/shared';
import type { Role } from './Role';
import type { Player } from './Player';
import {
  CivilianRole,
  MafiaRole,
  DonRole,
  DetectiveRole,
  CommissionerRole,
  DoctorRole,
  LoverRole,
  AdvocateRole,
  JournalistRole,
  SergeantRole,
} from './roles';
import { shuffle } from './utils';

const ROLE_CONSTRUCTORS: Record<RoleName, () => Role> = {
  [RoleName.CIVILIAN]:     () => new CivilianRole(),
  [RoleName.MAFIA]:        () => new MafiaRole(),
  [RoleName.DON]:          () => new DonRole(),
  [RoleName.DETECTIVE]:    () => new DetectiveRole(),
  [RoleName.COMMISSIONER]: () => new CommissionerRole(),
  [RoleName.DOCTOR]:       () => new DoctorRole(),
  [RoleName.LOVER]:        () => new LoverRole(),
  [RoleName.ADVOCATE]:     () => new AdvocateRole(),
  [RoleName.JOURNALIST]:   () => new JournalistRole(),
  [RoleName.SERGEANT]:     () => new SergeantRole(),
};

/**
 * Assigns roles to players based on the provided role name list.
 *
 * Rules:
 * - The role list is shuffled before assignment.
 * - Each player receives exactly one role.
 * - If roleNames.length < players.length — remaining players get CIVILIAN.
 * - If roleNames.length > players.length — excess roles are ignored.
 * - If roleNames is empty or undefined — all players get CIVILIAN.
 */
export function assignRoles(players: Player[], roleNames: RoleName[] = []): void {
  const pool = shuffle([...roleNames]).map((name) => ROLE_CONSTRUCTORS[name]());

  players.forEach((player, index) => {
    const role = pool[index] ?? new CivilianRole();
    player.assignRole(role);
  });
}
