import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
import { OpportunityModel } from './opportunity.model';

export function createOpportunityRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const opportunities = await OpportunityModel.find({ workspaceId }).sort({ updatedAt: -1 }).lean();
      res.status(200).json({ opportunities });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:opportunityId/status',
    createOriginGuard(config),
    requireJsonContentType,
    express.json({ limit: '50kb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { workspaceId } = authContext(req);
        const status = String((req.body as { status?: unknown }).status ?? '');
        if (!['READY_TO_BOOK', 'BOOKED', 'READY_TO_REPLY', 'FOLLOW_UP_LATER', 'CLOSED_LOST'].includes(status)) {
          res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Unsupported opportunity status.' } });
          return;
        }
        const opportunity = await OpportunityModel.findOne({ _id: req.params.opportunityId, workspaceId });
        if (!opportunity) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Opportunity not found.' } });
          return;
        }
        opportunity.status = status as typeof opportunity.status;
        if (status === 'BOOKED') opportunity.bookedAt = new Date();
        await opportunity.save();
        res.status(200).json({ opportunity });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
