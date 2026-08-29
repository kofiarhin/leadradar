import type { NextFunction, Request, Response } from 'express';

import { authRequired } from '../errors/app-error';

export interface AuthenticatedContext {
  adminUserId: string;
  workspaceId: string;
}

/**
 * Default-deny gate for protected routes.
 *
 * Applied to a router group rather than per handler, so a route added later inherits
 * the protection instead of having to opt in and possibly forgetting.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const { adminUserId, workspaceId } = req.session ?? {};

  if (!adminUserId || !workspaceId) {
    next(authRequired());
    return;
  }

  next();
}

/**
 * Reads the authenticated context from the session.
 *
 * The workspace identifier always comes from here, never from a route parameter, a
 * query value, or a request body (docs/SPEC.md §9.4).
 */
export function authContext(req: Request): AuthenticatedContext {
  return {
    adminUserId: req.session.adminUserId as string,
    workspaceId: req.session.workspaceId as string,
  };
}
