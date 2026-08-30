import {
  approveCampaignRequestSchema,
  createCampaignRequestSchema,
  updateSequenceRequestSchema,
  type CampaignDto,
  type CampaignListResponse,
  type CampaignResponse,
} from '@leadradar/shared';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
import { NvidiaClient } from '../../providers/nvidia/nvidia.client';
import { CampaignProspectModel } from './campaign-prospect.model';
import { JobModel } from '../jobs/job.model';
import { VerticalProfileModel } from '../verticals/vertical-profile.model';
import { CampaignModel } from './campaign.model';

function toDto(campaign: InstanceType<typeof CampaignModel>): CampaignDto {
  return {
    id: campaign._id.toString(),
    workspaceId: campaign.workspaceId.toString(),
    verticalProfileId: campaign.verticalProfileId.toString(),
    verticalProfileVersion: campaign.verticalProfileVersion,
    name: campaign.name,
    source: { platform: 'LINKEDIN', postUrl: campaign.source.postUrl },
    status: campaign.status,
    ...(campaign.discovery
      ? {
          discovery: {
            provider: 'APIFY',
            ...(campaign.discovery.runId ? { runId: campaign.discovery.runId } : {}),
            ...(campaign.discovery.startedAt
              ? { startedAt: campaign.discovery.startedAt.toISOString() }
              : {}),
            ...(campaign.discovery.completedAt
              ? { completedAt: campaign.discovery.completedAt.toISOString() }
              : {}),
            ...(campaign.discovery.errorCode ? { errorCode: campaign.discovery.errorCode } : {}),
          },
        }
      : {}),
    sequence: {
      approvalStatus: campaign.sequence.approvalStatus,
      draftVersion: campaign.sequence.draftVersion,
      ...(campaign.sequence.approvedVersion !== undefined
        ? { approvedVersion: campaign.sequence.approvedVersion }
        : {}),
      ...(campaign.sequence.approvedAt
        ? { approvedAt: campaign.sequence.approvedAt.toISOString() }
        : {}),
      steps: campaign.sequence.steps.map((step) => ({
        order: step.order,
        delayDays: step.delayDays,
        ...(step.subject ? { subject: step.subject } : {}),
        body: step.body,
      })),
    },
    metricsSnapshot: campaign.metricsSnapshot,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export function createCampaignRouter(config: AppConfig): Router {
  const router = Router();
  const mutation = [createOriginGuard(config), requireJsonContentType, express.json({ limit: '100kb' })];

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const campaigns = await CampaignModel.find({ workspaceId }).sort({ createdAt: -1 });
      const body: CampaignListResponse = { campaigns: campaigns.map(toDto) };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      if (!campaign) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
        return;
      }
      const body: CampaignResponse = { campaign: toDto(campaign) };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', ...mutation, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = authContext(req);
      const input = createCampaignRequestSchema.parse(req.body);
      const verticalProfile = await VerticalProfileModel.findOne({ workspaceId }).sort({ updatedAt: -1 });
      if (!verticalProfile) {
        res.status(409).json({
          error: { code: 'VERTICAL_PROFILE_REQUIRED', message: 'Configure the vertical profile first.' },
        });
        return;
      }

      const campaign = await CampaignModel.create({
        workspaceId,
        verticalProfileId: verticalProfile._id,
        verticalProfileVersion: verticalProfile.version,
        name: input.name,
        source: { platform: 'LINKEDIN', postUrl: input.postUrl },
        status: 'DISCOVERING',
        discovery: { provider: 'APIFY', startedAt: new Date() },
      });

      await JobModel.create({
        workspaceId,
        type: 'INGEST_DISCOVERY_RESULTS',
        payload: { campaignId: campaign._id.toString(), phase: 'START' },
      });

      const body: CampaignResponse = { campaign: toDto(campaign) };
      res.status(201).json(body);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:campaignId/sequence/generate', ...mutation, async (req, res, next) => {
    try {
      const { workspaceId } = authContext(req);
      if (!config.nvidiaApiKey || !config.nvidiaModel) throw new Error('NVIDIA_NOT_CONFIGURED');
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      if (!campaign) return void res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
      const vertical = await VerticalProfileModel.findById(campaign.verticalProfileId);
      if (!vertical) return void res.status(409).json({ error: { code: 'VERTICAL_PROFILE_REQUIRED', message: 'Vertical profile missing.' } });
      const eligible = await CampaignProspectModel.countDocuments({ campaignId: campaign._id, releaseStatus: 'READY' });
      const nvidia = new NvidiaClient({ apiKey: config.nvidiaApiKey, model: config.nvidiaModel });
      const draft = await nvidia.draftSequence({
        campaign: { name: campaign.name, sourcePostUrl: campaign.source.postUrl, eligibleProspects: eligible },
        verticalProfile: { offer: vertical.offer, outreachGoal: vertical.outreachGoal, outreachTone: vertical.outreachTone },
      });
      campaign.sequence.steps = draft.steps;
      campaign.sequence.draftVersion += 1;
      campaign.sequence.approvalStatus = 'DRAFT';
      campaign.status = 'READY_FOR_REVIEW';
      await campaign.save();
      res.status(200).json({ campaign: toDto(campaign) } satisfies CampaignResponse);
    } catch (error) { next(error); }
  });

  router.put('/:campaignId/sequence', ...mutation, async (req, res, next) => {
    try {
      const { workspaceId } = authContext(req);
      const input = updateSequenceRequestSchema.parse(req.body);
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      if (!campaign) return void res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
      const wasApproved = campaign.sequence.approvalStatus === 'APPROVED';
      campaign.sequence.steps = input.steps;
      campaign.sequence.draftVersion += 1;
      campaign.sequence.approvalStatus = wasApproved ? 'REAPPROVAL_REQUIRED' : 'DRAFT';
      if (wasApproved) campaign.status = 'READY_FOR_REVIEW';
      await campaign.save();
      res.status(200).json({ campaign: toDto(campaign) } satisfies CampaignResponse);
    } catch (error) { next(error); }
  });

  router.post('/:campaignId/approve', ...mutation, async (req, res, next) => {
    try {
      const { workspaceId } = authContext(req);
      approveCampaignRequestSchema.parse(req.body);
      const campaign = await CampaignModel.findOne({ _id: req.params.campaignId, workspaceId });
      if (!campaign) return void res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
      if (campaign.sequence.steps.length < 2 || campaign.sequence.steps.length > 3) {
        return void res.status(409).json({ error: { code: 'SEQUENCE_REQUIRED', message: 'Generate and review a sequence first.' } });
      }
      const ready = await CampaignProspectModel.countDocuments({ campaignId: campaign._id, releaseStatus: 'READY' });
      if (ready === 0) return void res.status(409).json({ error: { code: 'NO_ELIGIBLE_PROSPECTS', message: 'No eligible prospects are ready for release.' } });
      campaign.sequence.approvalStatus = 'APPROVED';
      campaign.sequence.approvedVersion = campaign.sequence.draftVersion;
      campaign.sequence.approvedAt = new Date();
      campaign.status = 'APPROVED';
      await campaign.save();
      const prospects = await CampaignProspectModel.find({ campaignId: campaign._id, releaseStatus: 'READY' });
      await JobModel.insertMany(prospects.map((prospect) => ({
        workspaceId,
        type: 'RELEASE_CAMPAIGN_PROSPECT',
        payload: { campaignId: campaign._id.toString(), prospectId: prospect.prospectId.toString(), approvedVersion: campaign.sequence.approvedVersion },
      })));
      res.status(200).json({ campaign: toDto(campaign) } satisfies CampaignResponse);
    } catch (error) { next(error); }
  });

  return router;
}
