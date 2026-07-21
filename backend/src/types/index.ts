import type { Request } from 'express';

/** Extends Express Request with authenticated player context. */
export interface AuthenticatedRequest extends Request {
  playerId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(error: string): ApiResponse<never> {
  return { success: false, error };
}
