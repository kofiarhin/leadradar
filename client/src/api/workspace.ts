import type { SessionWorkspace, WorkspaceResponse } from '@leadradar/shared';

import { apiRequest } from './client';

/**
 * The authenticated owner's workspace. The server resolves it from the session, so no
 * identifier is sent.
 */
export async function fetchWorkspace(): Promise<SessionWorkspace> {
  const response = await apiRequest<WorkspaceResponse>('/workspace');
  return response.workspace;
}
