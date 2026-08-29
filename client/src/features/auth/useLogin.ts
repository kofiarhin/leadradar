import { ERROR_CODES } from '@leadradar/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { LoginRequest, SessionResponse } from '@leadradar/shared';

import { login, logout } from '../../api/auth';
import { ApiError } from '../../api/client';
import { sessionQueryKey } from './useSession';

/**
 * Maps an API error code to user-facing copy.
 *
 * Invalid credentials always produce the same sentence, whether the email is unknown or
 * the password is wrong, so the UI cannot disclose which accounts exist.
 */
export function messageForError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case ERROR_CODES.AUTH_INVALID_CREDENTIALS:
        return 'Invalid email or password.';
      case ERROR_CODES.RATE_LIMITED:
        return 'Too many attempts. Try again later.';
      case ERROR_CODES.VALIDATION_ERROR:
        return 'Enter a valid email address and password.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  return 'Something went wrong. Please try again.';
}

export function useLogin(): UseMutationResult<SessionResponse, unknown, LoginRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}

export function useLogout(): UseMutationResult<void, unknown, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop every cached response, not just the session: the rest belonged to the
      // owner who just signed out.
      queryClient.clear();
    },
  });
}
