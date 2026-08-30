import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { ConversationModel } from '../conversations/conversation.model';
import { MessageModel } from '../conversations/message.model';
import { enqueueJob } from '../jobs/job.service';
import { OpportunityModel } from '../opportunities/opportunity.model';
import { OutreachPolicyEvaluationModel } from '../outreach-policy/outreach-policy.model';
import { OUTREACH_POLICY_VERSION } from '../outreach-policy/outreach-policy.service';
import { SignalModel } from '../signals/signal.model';
import { ProspectModel } from './prospect.model';

export function createProspectRouter(config: AppConfig): Router {
  const router = Router();
  const mutation = [createOriginGuard(config), requireJsonContentType, express.json({ limit: '50kb' })];

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const qualification = typeof req.query.qualification === 'string' ? req.query.qualification : undefined;
      const contact = typeof req.query.contact === 'string' ? req.query.contact : undefined;
      const outreach = typeof req.query.outreach === 'string' ? req.query.outreach : undefined;
      const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;
      const campaignId = typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined;

      const filter: Record<string, unknown> = { workspaceId };
      if (qualification) filter['qualification.status'] = qualification;
      if (contact) filter['contact.status'] = contact;
      if (outreach) filter['outreach.status'] = outreach;
      if (intent) filter['latestIntent.intent'] = intent;
      if (search) {
        filter.$or = [
          { 'identity.displayName': { $regex: search, $options: 'i' } },
          { 'identity.company': { $regex: search, $options: 'i' } },
          { 'identity.role': { $regex: search, $options: 'i' } },
          { 'contact.businessEmail': { $regex: search, $options: 'i' } },
        ];
      }
      if (campaignId) {
        const campaignProspects = await CampaignProspectModel.find({ workspaceId, campaignId }).select('prospectId').lean();
        filter._id = { $in: campaignProspects.map((value) => value.prospectId) };
      }

      const prospects = await ProspectModel.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
      res.status(200).json({ prospects });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:prospectId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const prospect = await ProspectModel.findOne({ _id: req.params.prospectId, workspaceId }).lean();
      if (!prospect) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prospect not found.' } });
        return;
      }

      const [signals, campaignProspects, conversations, opportunities] = await Promise.all([
        SignalModel.find({ workspaceId, prospectId: prospect._id }).sort({ discoveredAt: -1 }).lean(),
        CampaignProspectModel.find({ workspaceId, prospectId: prospect._id }).sort({ updatedAt: -1 }).lean(),
        ConversationModel.find({ workspaceId, prospectId: prospect._id }).sort({ lastMessageAt: -1 }).lean(),
        OpportunityModel.find({ workspaceId, prospectId: prospect._id }).sort({ updatedAt: -1 }).lean(),
      ]);
      const campaignIds = campaignProspects.map((value) => value.campaignId);
      const conversationIds = conversations.map((value) => value._id);
      const [campaigns, messages] = await Promise.all([
        CampaignModel.find({ _id: { $in: campaignIds }, workspaceId }).select('name status source createdAt').lean(),
        MessageModel.find({ workspaceId, conversationId: { $in: conversationIds } }).sort({ createdAt: 1 }).lean(),
      ]);

      res.status(200).json({
        prospect,
        signals,
        campaignProspects,
        campaigns,
        conversations,
        messages,
        opportunities,
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:prospectId/campaigns/:campaignId/qualification-review', ...mutation, async (req, res, next) => {
    try {
      const { workspaceId } = authContext(req);
      const decision = String((req.body as { decision?: unknown }).decision ?? '');
      if (!['QUALIFIED', 'REJECTED'].includes(decision)) {
        return void res.status(400).json({ error: { code: 'INVALID_REVIEW_DECISION', message: 'Qualification review must resolve to QUALIFIED or REJECTED.' } });
      }

      const prospect = await ProspectModel.findOne({ _id: req.params.prospectId, workspaceId });
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      const join = await CampaignProspectModel.findOne({ workspaceId, campaignId: req.params.campaignId, prospectId: req.params.prospectId });
      if (!prospect || !campaign || !join) {
        return void res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign prospect not found.' } });
      }
      if (join.qualificationDecision !== 'REVIEW') {
        return void res.status(409).json({ error: { code: 'NOT_IN_REVIEW', message: 'Qualification is not awaiting manual review.' } });
      }

      join.qualificationDecision = decision as typeof join.qualificationDecision;
      join.releaseStatus = decision === 'QUALIFIED' ? 'PENDING' : 'SKIPPED';
      prospect.set({
        qualification: {
          ...prospect.qualification,
          status: decision,
          reason: `Manual review: ${decision.toLowerCase()}`,
          evaluatedAt: new Date(),
          model: 'MANUAL',
          verticalProfileVersion: campaign.verticalProfileVersion,
        },
      });

      if (decision === 'REJECTED') {
        await SignalModel.updateMany(
          { workspaceId, prospectId: prospect._id, campaignId: campaign._id },
          {
            $set: {
              retentionClass: 'REJECTED_TEMPORARY',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        );
      }

      await Promise.all([join.save(), prospect.save()]);
      if (decision === 'QUALIFIED') {
        await enqueueJob({
          workspaceId,
          type: 'ENRICH_PROSPECT',
          payload: { campaignId: campaign._id.toString(), prospectId: prospect._id.toString() },
        });
      }
      res.status(200).json({ prospect, campaignProspect: join });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:prospectId/campaigns/:campaignId/policy-review', ...mutation, async (req, res, next) => {
    try {
      const { workspaceId } = authContext(req);
      const decision = String((req.body as { decision?: unknown }).decision ?? '');
      if (!['ALLOWED', 'BLOCKED'].includes(decision)) {
        return void res.status(400).json({ error: { code: 'INVALID_REVIEW_DECISION', message: 'Policy review must resolve to ALLOWED or BLOCKED.' } });
      }

      const prospect = await ProspectModel.findOne({ _id: req.params.prospectId, workspaceId });
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      const join = await CampaignProspectModel.findOne({ workspaceId, campaignId: req.params.campaignId, prospectId: req.params.prospectId });
      if (!prospect || !campaign || !join) {
        return void res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign prospect not found.' } });
      }
      if (join.outreachPolicyDecision !== 'REVIEW') {
        return void res.status(409).json({ error: { code: 'NOT_IN_REVIEW', message: 'Outreach policy is not awaiting manual review.' } });
      }
      if (prospect.contact.status !== 'VERIFIED') {
        return void res.status(409).json({ error: { code: 'CONTACT_NOT_VERIFIED', message: 'Only a verified business email can be manually allowed.' } });
      }

      await OutreachPolicyEvaluationModel.create({
        workspaceId,
        campaignId: campaign._id,
        prospectId: prospect._id,
        decision,
        policyVersion: `${OUTREACH_POLICY_VERSION}:manual-review`,
        reasonCodes: [decision === 'ALLOWED' ? 'MANUAL_REVIEW_ALLOWED' : 'MANUAL_REVIEW_BLOCKED'],
        evaluatedAt: new Date(),
      });

      join.outreachPolicyDecision = decision as typeof join.outreachPolicyDecision;
      join.releaseStatus = decision === 'ALLOWED' ? 'READY' : 'BLOCKED';
      prospect.set({ 'outreach.status': decision === 'ALLOWED' ? 'ELIGIBLE' : 'BLOCKED' });
      await Promise.all([join.save(), prospect.save()]);
      await enqueueJob({ workspaceId, type: 'RECOMPUTE_CAMPAIGN_METRICS', payload: { campaignId: campaign._id.toString() } });
      res.status(200).json({ prospect, campaignProspect: join });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
