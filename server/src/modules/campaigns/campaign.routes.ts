import {
  createCampaignRequestSchema,
  type CampaignDto,
  type CampaignListResponse,
  type CampaignResponse,
} from '@leadradar/shared';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import type { AppConfig } from '../../config/env';
import { createOriginGuard, requireJsonContentType } from '../../middleware/request-guards';
import { authContext } from '../../middleware/require-auth';
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

  router.post(
    '/',
    createOriginGuard(config),
    requireJsonContentType,
    express.json({ limit: '100kb' }),
    async (req: Request, res: Response, next: NextFunction) => {
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
    },
  );

  return router;
}
