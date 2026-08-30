import type { AppConfig } from '../../config/env';
import type { ApifyDiscoveryItem } from '../../providers/apify/apify.client';
import { NvidiaClient } from '../../providers/nvidia/nvidia.client';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';
import { SignalModel } from '../signals/signal.model';
import { VerticalProfileModel } from '../verticals/vertical-profile.model';

function normalizeLinkedInUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

async function resolveProspect(workspaceId: unknown, item: ApifyDiscoveryItem) {
  const normalizedLinkedinUrl = normalizeLinkedInUrl(item.profileUrl);
  const existing = normalizedLinkedinUrl
    ? await ProspectModel.findOne({ workspaceId, 'identity.normalizedLinkedinUrl': normalizedLinkedinUrl })
    : await ProspectModel.findOne({ workspaceId, 'identity.displayName': item.displayName, 'identity.company': item.company ?? null });

  if (existing) {
    existing.set({
      'identity.displayName': item.displayName,
      ...(item.profileUrl ? { 'identity.linkedinUrl': item.profileUrl } : {}),
      ...(normalizedLinkedinUrl ? { 'identity.normalizedLinkedinUrl': normalizedLinkedinUrl } : {}),
      ...(item.role ? { 'identity.role': item.role } : {}),
      ...(item.company ? { 'identity.company': item.company } : {}),
    });
    await existing.save();
    return existing;
  }

  return ProspectModel.create({
    workspaceId,
    identity: {
      displayName: item.displayName,
      ...(item.profileUrl ? { linkedinUrl: item.profileUrl } : {}),
      ...(normalizedLinkedinUrl ? { normalizedLinkedinUrl } : {}),
      ...(item.role ? { role: item.role } : {}),
      ...(item.company ? { company: item.company } : {}),
    },
  });
}

export async function processQualificationJob(
  payload: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const discoveryItems = Array.isArray(payload.discoveryItems)
    ? (payload.discoveryItems as ApifyDiscoveryItem[])
    : undefined;
  if (!campaignId || !discoveryItems) throw new Error('INVALID_QUALIFICATION_JOB');
  if (!config.nvidiaApiKey || !config.nvidiaModel) throw new Error('NVIDIA_NOT_CONFIGURED');

  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  const vertical = await VerticalProfileModel.findById(campaign.verticalProfileId);
  if (!vertical) throw new Error('VERTICAL_PROFILE_NOT_FOUND');
  const nvidia = new NvidiaClient({ apiKey: config.nvidiaApiKey, model: config.nvidiaModel });

  const seenProspects = new Set<string>();

  for (const item of discoveryItems) {
    const prospect = await resolveProspect(campaign.workspaceId, item);
    const signal = await SignalModel.findOneAndUpdate(
      {
        workspaceId: campaign.workspaceId,
        'source.provider': 'APIFY',
        'source.providerSignalId': item.providerSignalId,
      },
      {
        $setOnInsert: {
          workspaceId: campaign.workspaceId,
          prospectId: prospect._id,
          campaignId: campaign._id,
          type: 'LINKEDIN_COMMENT',
          source: {
            postUrl: campaign.source.postUrl,
            ...(item.profileUrl ? { profileUrl: item.profileUrl } : {}),
            provider: 'APIFY',
            providerSignalId: item.providerSignalId,
          },
          content: item.commentText,
          ...(item.occurredAt ? { occurredAt: new Date(item.occurredAt) } : {}),
          discoveredAt: new Date(),
          retentionClass: 'REVIEW',
        },
      },
      { upsert: true, new: true },
    );

    const result = await nvidia.qualify({
      verticalProfile: {
        offer: vertical.offer,
        targetRoles: vertical.targetRoles,
        targetIndustries: vertical.targetIndustries,
        companySize: vertical.companySize,
        targetRegions: vertical.targetRegions,
        positiveSignals: vertical.positiveSignals,
        negativeSignals: vertical.negativeSignals,
      },
      prospect: prospect.identity,
      signal: { text: item.commentText, postUrl: campaign.source.postUrl },
    });

    prospect.set({
      qualification: {
        status: result.decision,
        confidence: result.confidence,
        reason: result.reason,
        evaluatedAt: new Date(),
        model: config.nvidiaModel,
        verticalProfileVersion: campaign.verticalProfileVersion,
      },
    });
    await prospect.save();

    const retentionClass =
      result.decision === 'QUALIFIED'
        ? 'QUALIFIED_DURABLE'
        : result.decision === 'REJECTED'
          ? 'REJECTED_TEMPORARY'
          : 'REVIEW';
    signal.set({
      retentionClass,
      ...(result.decision === 'REJECTED'
        ? { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        : { expiresAt: undefined }),
    });
    await signal.save();

    await CampaignProspectModel.findOneAndUpdate(
      { workspaceId: campaign.workspaceId, campaignId: campaign._id, prospectId: prospect._id },
      {
        $set: {
          primarySignalId: signal._id,
          qualificationDecision: result.decision,
          releaseStatus: result.decision === 'REVIEW' ? 'REVIEW' : result.decision === 'REJECTED' ? 'SKIPPED' : 'PENDING',
        },
        $setOnInsert: {
          workspaceId: campaign.workspaceId,
          campaignId: campaign._id,
          prospectId: prospect._id,
        },
      },
      { upsert: true },
    );

    seenProspects.add(prospect._id.toString());

    if (result.decision === 'QUALIFIED') {
      await enqueueJob({
        workspaceId: campaign.workspaceId,
        type: 'ENRICH_PROSPECT',
        payload: { campaignId: campaign._id.toString(), prospectId: prospect._id.toString() },
      });
    }
  }

  const qualified = await CampaignProspectModel.countDocuments({ campaignId: campaign._id, qualificationDecision: 'QUALIFIED' });
  campaign.set({
    status: 'PROCESSING',
    'metricsSnapshot.uniqueProspects': seenProspects.size,
    'metricsSnapshot.qualified': qualified,
  });
  await campaign.save();
}
