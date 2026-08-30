import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';
import { evaluateOutreachPolicy } from '../outreach-policy/outreach-policy.service';

async function ensureProviderSequence(
  campaignId: string,
  approvedVersion: number,
  hunter: HunterClient,
): Promise<string> {
  const existing = await CampaignModel.findById(campaignId);
  if (!existing) throw new Error('CAMPAIGN_NOT_FOUND');

  if (
    existing.sequence.providerSequenceId &&
    ['PREPARED', 'STARTED'].includes(existing.sequence.providerState) &&
    existing.sequence.providerConfiguredVersion === approvedVersion
  ) {
    return existing.sequence.providerSequenceId;
  }

  const claimed = await CampaignModel.findOneAndUpdate(
    {
      _id: campaignId,
      'sequence.approvalStatus': 'APPROVED',
      'sequence.approvedVersion': approvedVersion,
      'sequence.providerState': { $in: ['NOT_PREPARED', 'ERROR'] },
    },
    {
      $set: {
        'sequence.providerState': 'PREPARING',
        'sequence.providerLastErrorCode': undefined,
      },
    },
    { new: true },
  );

  if (!claimed) {
    const concurrent = await CampaignModel.findById(campaignId);
    if (
      concurrent?.sequence.providerSequenceId &&
      ['PREPARED', 'STARTED'].includes(concurrent.sequence.providerState) &&
      concurrent.sequence.providerConfiguredVersion === approvedVersion
    ) {
      return concurrent.sequence.providerSequenceId;
    }
    throw new Error('HUNTER_SEQUENCE_PREPARING');
  }

  try {
    const sequenceId = await hunter.createSequence(
      claimed.name,
      `leadradar-${claimed._id.toString()}-v${approvedVersion}`,
    );
    await hunter.configureSequence(
      sequenceId,
      claimed.sequence.steps.map((step) => ({
        order: step.order,
        delayDays: step.delayDays,
        ...(step.subject ? { subject: step.subject } : {}),
        body: step.body,
      })),
    );
    await CampaignModel.updateOne(
      { _id: claimed._id },
      {
        $set: {
          'sequence.providerSequenceId': sequenceId,
          'sequence.providerState': 'PREPARED',
          'sequence.providerConfiguredVersion': approvedVersion,
          'sequence.providerLastErrorCode': undefined,
        },
      },
    );
    return sequenceId;
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0].slice(0, 120) : 'HUNTER_SEQUENCE_ERROR';
    await CampaignModel.updateOne(
      { _id: claimed._id },
      { $set: { 'sequence.providerState': 'ERROR', 'sequence.providerLastErrorCode': code } },
    );
    throw error;
  }
}

async function startSequenceWhenBatchReady(campaignId: string, hunter: HunterClient): Promise<void> {
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign || campaign.sequence.providerState !== 'PREPARED' || !campaign.sequence.providerSequenceId) return;

  const approvedProspectIds = campaign.sequence.approvedProspectIds;
  if (approvedProspectIds.length === 0) return;

  const joins = await CampaignProspectModel.find({
    campaignId: campaign._id,
    prospectId: { $in: approvedProspectIds },
  }).lean();

  const unresolved = joins.some((join) => ['PENDING', 'READY'].includes(join.releaseStatus));
  if (unresolved || joins.length !== approvedProspectIds.length) return;

  const released = joins.filter((join) => join.releaseStatus === 'RELEASED').length;
  if (released === 0) {
    campaign.status = 'FAILED';
    campaign.sequence.providerLastErrorCode = 'NO_APPROVED_PROSPECTS_RELEASED';
    await campaign.save();
    return;
  }

  await hunter.startSequence(campaign.sequence.providerSequenceId);
  campaign.sequence.providerState = 'STARTED';
  campaign.sequence.providerStartedAt = new Date();
  campaign.status = 'SENDING';
  await campaign.save();

  await enqueueJob({
    workspaceId: campaign.workspaceId,
    type: 'RECOMPUTE_CAMPAIGN_METRICS',
    payload: { campaignId: campaign._id.toString() },
    runAt: new Date(Date.now() + 60_000),
    maxAttempts: 20,
  });
}

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

  const wasApprovedProspect = campaign.sequence.approvedProspectIds.some(
    (approvedProspectId) => approvedProspectId.toString() === prospectId,
  );
  if (
    campaign.sequence.approvalStatus !== 'APPROVED' ||
    campaign.sequence.approvedVersion !== approvedVersion ||
    campaign.sequence.draftVersion !== approvedVersion ||
    !wasApprovedProspect
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
    join.set({ releaseStatus: 'READY' });
    prospect.set({ 'outreach.status': 'ELIGIBLE' });
    await Promise.all([join.save(), prospect.save()]);
    return;
  }

  if (!config.hunterApiKey) throw new Error('HUNTER_NOT_CONFIGURED');
  const hunter = new HunterClient({ apiKey: config.hunterApiKey });
  const sequenceId = await ensureProviderSequence(campaignId, approvedVersion, hunter);
  const recipientId = await hunter.addSequenceRecipient(sequenceId, prospect.contact.normalizedEmail);

  join.set({ releaseStatus: 'RELEASED' });
  prospect.set({
    outreach: {
      ...prospect.outreach,
      status: 'QUEUED',
      provider: 'HUNTER',
      providerLeadId: recipientId,
      providerSequenceId: sequenceId,
      activeCampaignId: campaign._id,
    },
  });
  await Promise.all([join.save(), prospect.save()]);
  await startSequenceWhenBatchReady(campaignId, hunter);
}
