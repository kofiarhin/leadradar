import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { MessageModel } from '../conversations/message.model';
import { enqueueJob } from '../jobs/job.service';
import { OpportunityModel } from '../opportunities/opportunity.model';
import { ProspectModel } from '../prospects/prospect.model';
import { SignalModel } from '../signals/signal.model';
import { CampaignProspectModel } from './campaign-prospect.model';
import { CampaignModel } from './campaign.model';

async function reconcileDeliveryState(
  campaign: InstanceType<typeof CampaignModel>,
  joins: Array<{ prospectId: { toString(): string }; releaseStatus: string }>,
  config?: AppConfig,
): Promise<void> {
  if (
    !config ||
    config.outboundMode !== 'enabled' ||
    !config.hunterApiKey ||
    campaign.sequence.providerState !== 'STARTED' ||
    !campaign.sequence.providerSequenceId
  ) {
    return;
  }

  const hunter = new HunterClient({ apiKey: config.hunterApiKey });
  const pending = await hunter.hasPendingMessages(campaign.sequence.providerSequenceId);
  if (pending) {
    await enqueueJob({
      workspaceId: campaign.workspaceId,
      type: 'RECOMPUTE_CAMPAIGN_METRICS',
      payload: { campaignId: campaign._id.toString() },
      runAt: new Date(Date.now() + 60_000),
      maxAttempts: 20,
    });
    return;
  }

  const approvedIds = new Set(campaign.sequence.approvedProspectIds.map((value) => value.toString()));
  const approvedJoins = joins.filter((join) => approvedIds.has(join.prospectId.toString()));
  const releasedIds = approvedJoins
    .filter((join) => join.releaseStatus === 'RELEASED')
    .map((join) => join.prospectId);
  const releaseFailures = approvedJoins.filter((join) => join.releaseStatus !== 'RELEASED').length;
  const providerFailures = await hunter.hasDeliveryFailures(campaign.sequence.providerSequenceId);

  await ProspectModel.updateMany(
    {
      _id: { $in: releasedIds },
      'outreach.status': { $in: ['QUEUED', 'CONTACTED'] },
    },
    { $set: { 'outreach.status': 'COMPLETED' } },
  );

  campaign.status = releaseFailures > 0 || providerFailures ? 'PARTIAL_FAILURE' : 'COMPLETED';
}

export async function recomputeCampaignMetrics(campaignId: string, config?: AppConfig): Promise<void> {
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const joins = await CampaignProspectModel.find({ campaignId }).lean();
  await reconcileDeliveryState(campaign, joins, config);
  const prospectIds = joins.map((join) => join.prospectId);

  const [signals, qualified, verified, eligible, contacted, replies, opportunities, readyToBook, booked] = await Promise.all([
    SignalModel.countDocuments({ campaignId }),
    CampaignProspectModel.countDocuments({ campaignId, qualificationDecision: 'QUALIFIED' }),
    ProspectModel.countDocuments({ _id: { $in: prospectIds }, 'contact.status': 'VERIFIED' }),
    CampaignProspectModel.countDocuments({ campaignId, releaseStatus: { $in: ['READY', 'RELEASED'] } }),
    ProspectModel.countDocuments({ _id: { $in: prospectIds }, 'outreach.status': { $in: ['CONTACTED','PAUSED','REPLIED','COMPLETED'] } }),
    MessageModel.countDocuments({ campaignId, direction: 'INBOUND', kind: 'PROSPECT_REPLY' }),
    OpportunityModel.countDocuments({ campaignId }),
    OpportunityModel.countDocuments({ campaignId, status: 'READY_TO_BOOK' }),
    OpportunityModel.countDocuments({ campaignId, status: 'BOOKED' }),
  ]);

  campaign.metricsSnapshot = {
    signals,
    uniqueProspects: new Set(joins.map((join) => join.prospectId.toString())).size,
    qualified,
    verified,
    eligible,
    contacted,
    replies,
    opportunities,
    readyToBook,
    booked,
  };
  await campaign.save();
}
