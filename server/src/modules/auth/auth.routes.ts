import { loginRequestSchema } from '@leadradar/shared';
import { Router, type Request, type Response, type NextFunction } from 'express';

import { authRequired, validationError } from '../../errors/app-error';
import { authContext, requireAuth } from '../../middleware/require-auth';
import { authenticateOwner, readSession } from './auth.service';

/**
 * Regenerating the session id before populating it prevents session fixation: a value
 * an attacker planted before login cannot survive into the authenticated session.
 */
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

/** Removes the stored session record, so a captured cookie is worthless after logout. */
function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

export const authRouter: Router = Router();

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      // The submitted values are deliberately not echoed back.
      throw validationError('Email and password are required.');
    }

    const owner = await authenticateOwner(parsed.data.email, parsed.data.password);

    await regenerateSession(req);
    req.session.adminUserId = owner.adminUserId;
    req.session.workspaceId = owner.workspaceId;
    await saveSession(req);

    res.status(200).json(owner.response);
  } catch (error) {
    next(error);
  }
});

authRouter.get(
  '/session',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminUserId, workspaceId } = authContext(req);
      const session = await readSession(adminUserId, workspaceId);

      // The session survived but the records behind it did not.
      if (!session) {
        throw authRequired();
      }

      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Idempotent: logging out without a session is a success, not an error.
    if (req.session) {
      await destroySession(req);
      res.clearCookie('leadradar.sid', { path: '/' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
