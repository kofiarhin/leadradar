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
import { createCampaignRouter } from './modules/campaigns/campaign.routes';
import { createHunterWebhookRouter } from './modules/integrations/hunter-webhook.routes';
import { createOpportunityRouter } from './modules/opportunities/opportunity.routes';
import { createVerticalProfileRouter } from './modules/verticals/vertical-profile.routes';
import { workspaceRouter } from './modules/workspaces/workspace.routes';

export interface AppOptions {
  loginRateLimit?: LoginRateLimitOptions;
}

export function createApp(config: AppConfig = loadConfig(), options: AppOptions = {}): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(createSessionMiddleware(config));

  const stateChanging = [createOriginGuard(config), requireJsonContentType];

  const authRoutes = express.Router();
  authRoutes.use(stateChanging);
  authRoutes.use(express.json({ limit: '100kb' }));
  authRoutes.use('/login', createLoginRateLimiter(options.loginRateLimit));
  authRoutes.use(authRouter);

  const sessionRead = express.Router();
  sessionRead.use(authRouter);

  app.use(`${API_BASE_PATH}/auth`, (req, res, next) => {
    (req.method === 'GET' ? sessionRead : authRoutes)(req, res, next);
  });

  app.use(`${API_BASE_PATH}/webhooks`, createHunterWebhookRouter());

  const protectedRouter = express.Router();
  protectedRouter.use(requireAuth);
  protectedRouter.use('/workspace', workspaceRouter);
  protectedRouter.use('/vertical-profile', createVerticalProfileRouter(config));
  protectedRouter.use('/campaigns', createCampaignRouter(config));
  protectedRouter.use('/opportunities', createOpportunityRouter(config));
  app.use(API_BASE_PATH, protectedRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
