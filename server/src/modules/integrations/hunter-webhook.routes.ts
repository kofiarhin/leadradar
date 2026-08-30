import { createHash, timingSafeEqual } from 'node:crypto';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';
import { IntegrationEventModel } from './integration-event.model';

function secretsMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);
}

export function createHunterWebhookRouter(config: AppConfig): Router {
  const router = Router();
  router.post('/hunter', express.json({ limit: '250kb' }), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.hunterWebhookSecret) {
        res.status(503).json({ error: { code: 'HUNTER_WEBHOOK_NOT_CONFIGURED', message: 'Hunter webhook authentication is not configured.' } });
        return;
      }
      const suppliedSecret = typeof req.query.token === 'string' ? req.query.token : '';
      if (!suppliedSecret || !secretsMatch(config.hunterWebhookSecret, suppliedSecret)) {
        res.status(401).json({ error: { code: 'INVALID_WEBHOOK_AUTH', message: 'Webhook authentication failed.' } });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const providerEventId = String(body.id ?? body.event_id ?? body.message_id ?? '');
      const eventType = String(body.event ?? body.type ?? '');
      if (eventType !== 'message.replied') {
        res.status(202).json({ accepted: true, ignored: true });
        return;
      }

      const recipientId = String(body.recipient_id ?? body.recipientId ?? body.lead_id ?? body.leadId ?? '');
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
      if (!providerEventId || (!recipientId && !email)) {
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

      let event;
      try {
        event = await IntegrationEventModel.create({
          provider: 'HUNTER',
          providerEventId,
          eventType,
          payloadHash,
          status: 'RECEIVED',
          attempts: 0,
          receivedAt: new Date(),
        });
      } catch (error) {
        if (isDuplicateKey(error)) {
          res.status(202).json({ accepted: true, duplicate: true });
          return;
        }
        throw error;
      }

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
