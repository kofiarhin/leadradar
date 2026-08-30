import { createHash } from 'node:crypto';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import { enqueueJob } from '../jobs/job.service';
import { IntegrationEventModel } from './integration-event.model';

export function createHunterWebhookRouter(): Router {
  const router = Router();
  router.post('/hunter', express.json({ limit: '250kb' }), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const providerEventId = String(body.id ?? body.event_id ?? body.message_id ?? '');
      const eventType = String(body.event ?? body.type ?? '');
      if (!providerEventId || !eventType) {
        res.status(400).json({ error: { code: 'INVALID_WEBHOOK', message: 'Missing Hunter event identity.' } });
        return;
      }
      const payloadHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const existing = await IntegrationEventModel.findOne({ provider: 'HUNTER', providerEventId });
      if (existing) {
        res.status(202).json({ accepted: true, duplicate: true });
        return;
      }
      const event = await IntegrationEventModel.create({
        provider: 'HUNTER',
        providerEventId,
        eventType,
        payloadHash,
        status: 'RECEIVED',
        attempts: 0,
        receivedAt: new Date(),
      });
      await enqueueJob({
        workspaceId: String(body.workspace_id ?? body.workspaceId ?? '000000000000000000000000'),
        type: 'PROCESS_REPLY',
        payload: { integrationEventId: event._id.toString(), hunter: body },
      });
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
