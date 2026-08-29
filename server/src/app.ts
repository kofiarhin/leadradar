import { API_BASE_PATH } from '@leadradar/shared';
import express, { type Express } from 'express';

import { loadConfig, type AppConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import {
  createLoginRateLimiter,
  createOriginGuard,
  requireJsonContentType,
  type LoginRateLimitOptions,
} from './middleware/request-guards';
import { requestId } from './middleware/request-id';
import { requireAuth } from './middleware/require-auth';
import { createSessionMiddleware } from './middleware/session';
import { authRouter } from './modules/auth/auth.routes';
import { workspaceRouter } from './modules/workspaces/workspace.routes';

export interface AppOptions {
  /** Overridable so tests can exercise throttling without waiting out a real window. */
  loginRateLimit?: LoginRateLimitOptions;
}

/**
 * Builds the Express application without connecting to MongoDB and without listening.
 *
 * Only server.ts opens a port, so tests can mount this app directly against the
 * in-memory database.
 *
 * No CORS middleware is installed, deliberately: the client is served from the same
 * origin as the API in both development (Vite proxies /api) and production, so no
 * cross-origin caller is approved. Emitting no Access-Control-Allow-Origin header is
 * the strictest default, and adding one is a security-posture change.
 */
export function createApp(config: AppConfig = loadConfig(), options: AppOptions = {}): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(createSessionMiddleware(config));

  // Order matters: an untrusted origin is refused before the body is parsed and before
  // the rate limiter is consumed, so a cross-site attacker cannot exhaust a legitimate
  // user's login attempts.
  const stateChanging = [createOriginGuard(config), requireJsonContentType];

  const authRoutes = express.Router();
  authRoutes.use(stateChanging);
  authRoutes.use(express.json({ limit: '100kb' }));
  authRoutes.use('/login', createLoginRateLimiter(options.loginRateLimit));
  authRoutes.use(authRouter);

  const sessionRead = express.Router();
  sessionRead.use(authRouter);

  app.use(`${API_BASE_PATH}/auth`, (req, res, next) => {
    // Reads are safe: only non-GET requests pass through the state-changing guards.
    (req.method === 'GET' ? sessionRead : authRoutes)(req, res, next);
  });

  // Protected business routes are grouped behind requireAuth, so anything mounted here
  // later is default-deny without needing to remember to guard it.
  const protectedRouter = express.Router();
  protectedRouter.use(requireAuth);
  protectedRouter.use('/workspace', workspaceRouter);
  app.use(API_BASE_PATH, protectedRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
