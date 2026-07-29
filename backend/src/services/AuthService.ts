import { generateId } from '../utils';

export interface TokenPayload {
  playerId: string;
}

/**
 * Authentication stub.
 * TODO: Replace with real JWT signing/verification.
 */
export class AuthService {
  /** Issue a token for a player (stub — returns plain playerId). */
  issueToken(playerId: string): string {
    // TODO: sign JWT with config.jwtSecret
    return Buffer.from(JSON.stringify({ playerId })).toString('base64');
  }

  /** Verify a token and return its payload. */
  verifyToken(token: string): TokenPayload {
    try {
      const json = Buffer.from(token, 'base64').toString('utf-8');
      const parsed = JSON.parse(json) as unknown;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>)['playerId'] !== 'string' ||
        !(parsed as Record<string, unknown>)['playerId']
      ) {
        throw new Error('Invalid token payload');
      }
      return parsed as TokenPayload;
    } catch {
      throw new Error('Invalid or malformed token');
    }
  }

  /** Create a guest player identity. */
  createGuestIdentity(_username: string): { playerId: string; token: string } {
    const playerId = generateId();
    const token = this.issueToken(playerId);
    return { playerId, token };
  }
}
