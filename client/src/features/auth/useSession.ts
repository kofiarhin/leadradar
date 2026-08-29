import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SessionResponse } from '@leadradar/shared';

import { fetchSession } from '../../api/auth';

export const sessionQueryKey = ['session'] as const;

/**
 * The authenticated session as server state.
 *
 * Retries are off: an unauthenticated read is a definitive answer, not a transient
 * failure worth repeating.
 */
export function useSession(): UseQueryResult<SessionResponse | null> {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    retry: false,
    staleTime: 30_000,
  });
}
