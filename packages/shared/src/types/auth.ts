import type { ErrorCode } from '../constants/api';

export interface SessionUser {
  id: string;
  email: string;
}

export interface SessionWorkspace {
  id: string;
  name: string;
}

/** Body returned by a successful login and by the session read. */
export interface SessionResponse {
  user: SessionUser;
  workspace: SessionWorkspace;
}

export interface WorkspaceResponse {
  workspace: SessionWorkspace;
}

/** Structured error envelope (docs/SPEC.md §16). */
export interface AppErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
