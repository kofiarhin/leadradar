import { createHash } from 'node:crypto';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { MessageModel } from '../conversations/message.model';
import { ProspectModel } from '../prospects/prospect.model';
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

  router.post(
    '/:opportunityId/reply',
    createOriginGuard(config),
    requireJsonContentType,
    express.json({ limit: '100kb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { workspaceId } = authContext(req);
        const body = req.body as { body?: unknown; subject?: unknown };
        const replyBody = typeof body.body === 'string' ? body.body.trim() : '';
        const requestedSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
        if (!replyBody) {
          res.status(400).json({ error: { code: 'INVALID_REPLY', message: 'Reply body is required.' } });
          return;
        }

        const opportunity = await OpportunityModel.findOne({ _id: req.params.opportunityId, workspaceId });
        if (!opportunity) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Opportunity not found.' } });
          return;
        }
        const prospect = await ProspectModel.findOne({ _id: opportunity.prospectId, workspaceId });
        const email = prospect?.contact?.normalizedEmail;
        if (!prospect || !email) {
          res.status(409).json({ error: { code: 'CONTACT_NOT_SENDABLE', message: 'Prospect has no verified business email.' } });
          return;
        }
        if (config.outboundMode !== 'enabled') {
          res.status(409).json({
            error: {
              code: 'OUTBOUND_DISABLED',
              message: 'Live outbound is disabled. Enable it only after separate operational approval.',
            },
          });
          return;
        }
        if (!config.hunterApiKey || !config.hunterEmailAccountId) {
          throw new Error('HUNTER_SEND_NOT_CONFIGURED');
        }

        const latestInbound = await MessageModel.findOne({
          workspaceId,
          conversationId: opportunity.conversationId,
          direction: 'INBOUND',
        }).sort({ createdAt: -1 }).lean();
        const subject = requestedSubject || (latestInbound?.subject
          ? latestInbound.subject.startsWith('Re:') ? latestInbound.subject : `Re: ${latestInbound.subject}`
          : 'Re: Our conversation');
        const idempotencyKey = `leadradar-reply-${opportunity._id.toString()}-${createHash('sha256')
          .update(`${subject}\n${replyBody}`)
          .digest('hex')
          .slice(0, 32)}`;

        const hunter = new HunterClient({ apiKey: config.hunterApiKey });
        const providerMessageId = await hunter.sendManualReply({
          emailAccountId: config.hunterEmailAccountId,
          to: email,
          subject,
          body: replyBody,
          idempotencyKey,
        });
        const message = await MessageModel.create({
          workspaceId,
          conversationId: opportunity.conversationId,
          prospectId: opportunity.prospectId,
          ...(opportunity.campaignId ? { campaignId: opportunity.campaignId } : {}),
          direction: 'OUTBOUND',
          kind: 'MANUAL_REPLY',
          provider: 'HUNTER',
          providerMessageId,
          subject,
          bodyText: replyBody,
          sentAt: new Date(),
        });
        opportunity.status = 'OPEN';
        await opportunity.save();
        res.status(201).json({ message });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
