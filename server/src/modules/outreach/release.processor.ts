import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { ProspectModel } from '../prospects/prospect.model';
import { evaluateOutreachPolicy } from '../outreach-policy/outreach-policy.service';

export async function processReleaseJob(
  payload: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  const approvedVersion = typeof payload.approvedVersion === 'number' ? payload.approvedVersion : undefined;
  if (!campaignId || !prospectId || approvedVersion === undefined) throw new Error('INVALID_RELEASE_JOB');

  const campaign = await CampaignModel.findById(campaignId);
  const prospect = await ProspectModel.findById(prospectId);
  const join = await CampaignProspectModel.findOne({ campaignId, prospectId });
  if (!campaign || !prospect || !join) throw new Error('RELEASE_RECORD_NOT_FOUND');

  if (
    campaign.sequence.approvalStatus !== 'APPROVED' ||
    campaign.sequence.approvedVersion !== approvedVersion ||
    campaign.sequence.draftVersion !== approvedVersion
  ) {
    join.set({ releaseStatus: 'BLOCKED' });
    await join.save();
    throw new Error('CAMPAIGN_APPROVAL_INVALIDATED');
  }

  if (prospect.contact.status !== 'VERIFIED' || !prospect.contact.normalizedEmail) {
    join.set({ releaseStatus: 'BLOCKED' });
    await join.save();
    throw new Error('CONTACT_NOT_VERIFIED');
  }

  const policy = await evaluateOutreachPolicy({
    workspaceId: campaign.workspaceId,
    prospectId: prospect._id,
    normalizedEmail: prospect.contact.normalizedEmail,
    countryCode: prospect.identity.countryCode,
    companyType: prospect.identity.companyType,
  });
  if (policy.decision !== 'ALLOWED') {
    join.set({ releaseStatus: policy.decision === 'REVIEW' ? 'REVIEW' : 'BLOCKED' });
    prospect.set({ 'outreach.status': policy.decision === 'BLOCKED' ? 'BLOCKED' : 'NOT_ELIGIBLE' });
    await Promise.all([join.save(), prospect.save()]);
    return;
  }

  if (config.outboundMode !== 'enabled') {
    // Safe implementation mode: all release gates are exercised, but no provider write occurs.
    join.set({ releaseStatus: 'READY' });
    prospect.set({ 'outreach.status': 'ELIGIBLE' });
    await Promise.all([join.save(), prospect.save()]);
    return;
  }

  if (!config.hunterApiKey) throw new Error('HUNTER_NOT_CONFIGURED');
  const hunter = new HunterClient({ apiKey: config.hunterApiKey });
  let sequenceId = prospect.outreach.providerSequenceId;
  if (!sequenceId) sequenceId = await hunter.createSequence(campaign.name);
  const recipientId = await hunter.addSequenceRecipient(sequenceId, prospect.contact.normalizedEmail);

  join.set({ releaseStatus: 'RELEASED' });
  prospect.set({
    outreach: {
      ...prospect.outreach,
      status: 'CONTACTED',
      provider: 'HUNTER',
      providerLeadId: recipientId,
      providerSequenceId: sequenceId,
      activeCampaignId: campaign._id,
      firstContactedAt: prospect.outreach.firstContactedAt ?? new Date(),
      lastContactedAt: new Date(),
    },
  });
  campaign.set({ status: 'SENDING' });
  await Promise.all([join.save(), prospect.save(), campaign.save()]);
}
