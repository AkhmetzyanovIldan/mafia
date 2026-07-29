import { ROOM_CONSTANTS } from '@mafia/shared';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a random alphanumeric room code. */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CONSTANTS.CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

/** Shuffle an array in-place using Fisher-Yates. */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Generate a UUID v4 using the platform crypto API. */
export function uuid(): string {
  return crypto.randomUUID();
}
