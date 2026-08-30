import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';
import { OutreachPolicyEvaluationModel } from './outreach-policy.model';
import { evaluateOutreachPolicy, OUTREACH_POLICY_VERSION } from './outreach-policy.service';

export async function processOutreachPolicyJob(payload: Record<string, unknown>): Promise<void> {
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  if (!campaignId || !prospectId) throw new Error('INVALID_POLICY_JOB');

  const campaign = await CampaignModel.findById(campaignId);
  const prospect = await ProspectModel.findById(prospectId);
  const join = await CampaignProspectModel.findOne({ campaignId, prospectId });
  if (!campaign || !prospect || !join) throw new Error('POLICY_RECORD_NOT_FOUND');
  if (prospect.contact.status !== 'VERIFIED' || !prospect.contact.normalizedEmail) {
    throw new Error('POLICY_CONTACT_NOT_VERIFIED');
  }

  const policy = await evaluateOutreachPolicy({
    workspaceId: campaign.workspaceId,
    prospectId: prospect._id,
    normalizedEmail: prospect.contact.normalizedEmail,
    countryCode: prospect.identity.countryCode,
    companyType: prospect.identity.companyType,
  });

  await OutreachPolicyEvaluationModel.create({
    workspaceId: campaign.workspaceId,
    campaignId: campaign._id,
    prospectId: prospect._id,
    decision: policy.decision,
    policyVersion: OUTREACH_POLICY_VERSION,
    reasonCodes: policy.reasonCodes,
    evaluatedAt: new Date(),
  });

  join.set({
    outreachPolicyDecision: policy.decision,
    suppressionDecision: policy.decision === 'BLOCKED' && policy.reasonCodes.includes('SUPPRESSED') ? 'BLOCKED' : 'CLEAR',
    releaseStatus: policy.decision === 'ALLOWED' ? 'READY' : policy.decision === 'REVIEW' ? 'REVIEW' : 'BLOCKED',
  });
  prospect.set({
    'outreach.status': policy.decision === 'ALLOWED' ? 'ELIGIBLE' : policy.decision === 'BLOCKED' ? 'BLOCKED' : 'NOT_ELIGIBLE',
  });
  await Promise.all([join.save(), prospect.save()]);

  await enqueueJob({
    workspaceId: campaign.workspaceId,
    type: 'RECOMPUTE_CAMPAIGN_METRICS',
    payload: { campaignId },
  });
}
