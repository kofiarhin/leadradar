import { CampaignProspectModel } from './campaign-prospect.model';
import { CampaignModel } from './campaign.model';
import { MessageModel } from '../conversations/message.model';
import { OpportunityModel } from '../opportunities/opportunity.model';
import { ProspectModel } from '../prospects/prospect.model';
import { SignalModel } from '../signals/signal.model';

export async function recomputeCampaignMetrics(campaignId: string): Promise<void> {
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const joins = await CampaignProspectModel.find({ campaignId }).lean();
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
