import { createHash } from 'node:crypto';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';
import { IntegrationEventModel } from './integration-event.model';

export function createHunterWebhookRouter(): Router {
  const router = Router();
  router.post('/hunter', express.json({ limit: '250kb' }), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const providerEventId = String(body.id ?? body.event_id ?? body.message_id ?? '');
      const eventType = String(body.event ?? body.type ?? '');
      const recipientId = String(body.recipient_id ?? body.recipientId ?? body.lead_id ?? body.leadId ?? '');
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
      if (!providerEventId || !eventType || (!recipientId && !email)) {
        res.status(400).json({ error: { code: 'INVALID_WEBHOOK', message: 'Missing Hunter event identity.' } });
        return;
      }

      const prospect = await ProspectModel.findOne({
        $or: [
          ...(recipientId ? [{ 'outreach.providerLeadId': recipientId }] : []),
          ...(email ? [{ 'contact.normalizedEmail': email }] : []),
        ],
      });
      if (!prospect) {
        res.status(202).json({ accepted: true, unmatched: true });
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
        workspaceId: prospect.workspaceId,
        type: 'PROCESS_REPLY',
        payload: { integrationEventId: event._id.toString(), prospectId: prospect._id.toString(), hunter: body },
      });
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
