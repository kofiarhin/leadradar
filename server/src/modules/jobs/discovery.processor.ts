import type { AppConfig } from '../../config/env';
import { ApifyClient } from '../../providers/apify/apify.client';
import { CampaignModel } from '../campaigns/campaign.model';
import { enqueueJob } from './job.service';

export async function processDiscoveryJob(
  payload: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const phase = typeof payload.phase === 'string' ? payload.phase : undefined;
  if (!campaignId || !phase) throw new Error('INVALID_DISCOVERY_JOB');

  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  if (!config.apifyToken || !config.apifyActorId) throw new Error('APIFY_NOT_CONFIGURED');

  const apify = new ApifyClient({ token: config.apifyToken, actorId: config.apifyActorId });

  if (phase === 'START') {
    const run = await apify.startPublicCommentDiscovery(campaign.source.postUrl);
    campaign.set({ 'discovery.runId': run.id, 'discovery.startedAt': new Date(), status: 'DISCOVERING' });
    await campaign.save();
    await enqueueJob({
      workspaceId: campaign.workspaceId,
      type: 'INGEST_DISCOVERY_RESULTS',
      payload: { campaignId, phase: 'POLL' },
      runAt: new Date(Date.now() + 5_000),
      maxAttempts: 12,
    });
    return;
  }

  const runId = campaign.discovery?.runId;
  if (!runId) throw new Error('APIFY_RUN_MISSING');
  const run = await apify.getRun(runId);

  if (['READY', 'RUNNING'].includes(run.status)) {
    await enqueueJob({
      workspaceId: campaign.workspaceId,
      type: 'INGEST_DISCOVERY_RESULTS',
      payload: { campaignId, phase: 'POLL' },
      runAt: new Date(Date.now() + 10_000),
      maxAttempts: 12,
    });
    return;
  }

  if (run.status !== 'SUCCEEDED') {
    campaign.set({ status: 'FAILED', 'discovery.completedAt': new Date(), 'discovery.errorCode': `APIFY_${run.status}` });
    await campaign.save();
    return;
  }

  const items = await apify.getDiscoveryItems(runId);
  campaign.set({
    status: 'PROCESSING',
    'discovery.completedAt': new Date(),
    'metricsSnapshot.signals': items.length,
  });
  await campaign.save();

  // Ticket 004 consumes the normalized items. Keeping them in the job payload avoids
  // persisting unbounded raw provider payloads while preserving a durable handoff.
  await enqueueJob({
    workspaceId: campaign.workspaceId,
    type: 'QUALIFY_PROSPECT',
    payload: { campaignId, discoveryItems: items },
  });
}
