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
    // TODO: verify JWT signature
    const json = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(json) as TokenPayload;
  }

  /** Create a guest player identity. */
  createGuestIdentity(username: string): { playerId: string; token: string } {
    const playerId = generateId();
    const token = this.issueToken(playerId);
    return { playerId, token };
  }
}
