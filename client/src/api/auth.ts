import { ERROR_CODES, type LoginRequest, type SessionResponse } from '@leadradar/shared';

import { ApiError, apiRequest } from './client';

/**
 * Reads the current session.
 *
 * An unauthenticated response is a normal outcome, not a failure, so it resolves to
 * null rather than throwing. That keeps "not logged in" out of the query error path.
 */
export async function fetchSession(): Promise<SessionResponse | null> {
  try {
    return await apiRequest<SessionResponse>('/auth/session');
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODES.AUTH_REQUIRED) {
      return null;
    }
    throw error;
  }
}

export function login(credentials: LoginRequest): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/auth/login', { method: 'POST', body: credentials });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}
