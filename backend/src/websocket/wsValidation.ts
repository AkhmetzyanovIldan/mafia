import { ROOM_EVENTS, GAME_EVENTS, ActionType, RoleName } from '@mafia/shared';

const MAX_USERNAME = 32;
const MAX_ROOM_ID = 64;
const MAX_CODE = 16;
const MAX_TARGET_ID = 64;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNonEmptyString(v: unknown, max: number): v is string {
  return isString(v) && v.trim().length > 0 && v.length <= max;
}

function isOptionalNumber(v: unknown): boolean {
  return v === undefined || (typeof v === 'number' && Number.isFinite(v) && v > 0);
}

const VALID_ACTION_TYPES = new Set<string>(Object.values(ActionType));
const VALID_ROLE_NAMES = new Set<string>(Object.values(RoleName));

export interface ValidationResult {
  ok: true;
  event: string;
}

export interface ValidationError {
  ok: false;
  message: string;
}

export function validateWsMessage(raw: unknown): ValidationResult | ValidationError {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, message: 'Message must be an object' };
  }

  const msg = raw as Record<string, unknown>;
  const event = msg['event'];

  if (!isString(event)) {
    return { ok: false, message: 'event field is required and must be a string' };
  }

  switch (event) {
    case ROOM_EVENTS.CREATE_ROOM: {
      if (!isNonEmptyString(msg['username'], MAX_USERNAME)) {
        return { ok: false, message: 'username is required (max 32 chars)' };
      }
      if (!isOptionalNumber(msg['maxPlayers'])) {
        return { ok: false, message: 'maxPlayers must be a positive number' };
      }
      if (msg['roleNames'] !== undefined) {
        if (!Array.isArray(msg['roleNames'])) {
          return { ok: false, message: 'roleNames must be an array' };
        }
        for (const r of msg['roleNames'] as unknown[]) {
          if (!isString(r) || !VALID_ROLE_NAMES.has(r)) {
            return { ok: false, message: `Invalid roleName: ${String(r)}` };
          }
        }
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.JOIN_ROOM: {
      if (!isNonEmptyString(msg['code'], MAX_CODE)) {
        return { ok: false, message: 'code is required' };
      }
      if (!isNonEmptyString(msg['username'], MAX_USERNAME)) {
        return { ok: false, message: 'username is required (max 32 chars)' };
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.LEAVE_ROOM: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.ROOM_STATE_REQUEST: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.RECONNECT: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      if (!isNonEmptyString(msg['token'], 512)) {
        return { ok: false, message: 'token is required' };
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.TAKE_SEAT: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      if (typeof msg['seat'] !== 'number' || !Number.isInteger(msg['seat']) || msg['seat'] < 1) {
        return { ok: false, message: 'seat must be a positive integer' };
      }
      return { ok: true, event };
    }

    case ROOM_EVENTS.PLAYER_READY: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      if (typeof msg['isReady'] !== 'boolean') {
        return { ok: false, message: 'isReady must be a boolean' };
      }
      return { ok: true, event };
    }

    case GAME_EVENTS.START_GAME: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      return { ok: true, event };
    }

    case GAME_EVENTS.PLAYER_ACTION: {
      if (!isNonEmptyString(msg['roomId'], MAX_ROOM_ID)) {
        return { ok: false, message: 'roomId is required' };
      }
      const action = msg['action'];
      if (typeof action !== 'object' || action === null) {
        return { ok: false, message: 'action is required' };
      }
      const a = action as Record<string, unknown>;
      if (!isString(a['type']) || !VALID_ACTION_TYPES.has(a['type'])) {
        return { ok: false, message: `Invalid action.type: ${String(a['type'])}` };
      }
      if (!isNonEmptyString(a['targetId'], MAX_TARGET_ID)) {
        return { ok: false, message: 'action.targetId is required' };
      }
      return { ok: true, event };
    }

    default:
      return { ok: false, message: `Unknown event: ${event}` };
  }
}
