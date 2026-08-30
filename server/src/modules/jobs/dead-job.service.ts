import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { IntegrationEventModel } from '../integrations/integration-event.model';
import { ProspectModel } from '../prospects/prospect.model';
import type { JobModel } from './job.model';
import { enqueueJob } from './job.service';

async function maybeStartPreparedSequence(campaignId: string, config: AppConfig): Promise<void> {
  if (config.outboundMode !== 'enabled' || !config.hunterApiKey) return;
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign || campaign.sequence.providerState !== 'PREPARED' || !campaign.sequence.providerSequenceId) return;

  const approvedIds = campaign.sequence.approvedProspectIds;
  const joins = await CampaignProspectModel.find({ campaignId, prospectId: { $in: approvedIds } }).lean();
  if (joins.length !== approvedIds.length || joins.some((join) => ['PENDING', 'READY'].includes(join.releaseStatus))) return;
  if (!joins.some((join) => join.releaseStatus === 'RELEASED')) {
    campaign.status = 'FAILED';
    campaign.sequence.providerLastErrorCode = 'NO_APPROVED_PROSPECTS_RELEASED';
    await campaign.save();
    return;
  }

  const hunter = new HunterClient({ apiKey: config.hunterApiKey });
  await hunter.startSequence(campaign.sequence.providerSequenceId);
  campaign.sequence.providerState = 'STARTED';
  campaign.sequence.providerStartedAt = new Date();
  campaign.status = 'PARTIAL_FAILURE';
  await campaign.save();
  await enqueueJob({
    workspaceId: campaign.workspaceId,
    type: 'RECOMPUTE_CAMPAIGN_METRICS',
    payload: { campaignId: campaign._id.toString() },
    runAt: new Date(Date.now() + 60_000),
    maxAttempts: 20,
  });
}

export async function surfaceDeadJob(
  job: InstanceType<typeof JobModel>,
  config: AppConfig,
): Promise<void> {
  const payload = job.payload as Record<string, unknown>;
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;

  if (job.type === 'INGEST_DISCOVERY_RESULTS' && campaignId) {
    await CampaignModel.updateOne(
      { _id: campaignId },
      { $set: { status: 'FAILED', 'discovery.errorCode': job.lastErrorCode ?? 'DISCOVERY_JOB_DEAD' } },
    );
    return;
  }

  if (['QUALIFY_PROSPECT', 'ENRICH_PROSPECT', 'EVALUATE_OUTREACH_POLICY'].includes(job.type) && campaignId) {
    await CampaignModel.updateOne({ _id: campaignId }, { $set: { status: 'PARTIAL_FAILURE' } });
    if (prospectId) {
      const prospectUpdate = job.type === 'ENRICH_PROSPECT'
        ? { 'contact.status': 'ERROR' }
        : { 'outreach.status': 'ERROR' };
      await ProspectModel.updateOne({ _id: prospectId }, { $set: prospectUpdate });
      await CampaignProspectModel.updateOne(
        { campaignId, prospectId },
        { $set: { releaseStatus: 'BLOCKED' } },
      );
    }
    return;
  }

  if (job.type === 'RELEASE_CAMPAIGN_PROSPECT' && campaignId && prospectId) {
    await Promise.all([
      CampaignProspectModel.updateOne(
        { campaignId, prospectId },
        { $set: { releaseStatus: 'BLOCKED' } },
      ),
      ProspectModel.updateOne(
        { _id: prospectId, 'outreach.status': { $nin: ['REPLIED', 'COMPLETED'] } },
        { $set: { 'outreach.status': 'ERROR' } },
      ),
      CampaignModel.updateOne({ _id: campaignId }, { $set: { status: 'PARTIAL_FAILURE' } }),
    ]);
    await maybeStartPreparedSequence(campaignId, config);
    return;
  }

  if (['PROCESS_REPLY', 'CLASSIFY_REPLY'].includes(job.type)) {
    const integrationEventId = typeof payload.integrationEventId === 'string' ? payload.integrationEventId : undefined;
    if (integrationEventId) {
      await IntegrationEventModel.updateOne(
        { _id: integrationEventId },
        {
          $set: {
            status: 'FAILED',
            lastErrorCode: job.lastErrorCode ?? 'REPLY_JOB_DEAD',
          },
        },
      );
    }
  }
}
