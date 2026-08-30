import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { CampaignProspectModel } from '../campaigns/campaign-prospect.model';
import { CampaignModel } from '../campaigns/campaign.model';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';

function splitDisplayName(displayName: string): { firstName?: string; lastName?: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function processEnrichmentJob(
  payload: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  if (!campaignId || !prospectId) throw new Error('INVALID_ENRICHMENT_JOB');
  if (!config.hunterApiKey) throw new Error('HUNTER_NOT_CONFIGURED');

  const campaign = await CampaignModel.findById(campaignId);
  const prospect = await ProspectModel.findById(prospectId);
  const join = await CampaignProspectModel.findOne({ campaignId, prospectId });
  if (!campaign || !prospect || !join) throw new Error('ENRICHMENT_RECORD_NOT_FOUND');
  if (join.qualificationDecision !== 'QUALIFIED') return;

  prospect.set({ 'contact.status': 'ENRICHING' });
  await prospect.save();

  const hunter = new HunterClient({ apiKey: config.hunterApiKey });
  const { firstName, lastName } = splitDisplayName(prospect.identity.displayName);
  const finder = await hunter.findBusinessEmail({
    firstName,
    lastName,
    domain: prospect.identity.companyDomain,
    linkedinUrl: prospect.identity.linkedinUrl,
  });

  if (!finder.email) {
    prospect.set({ 'contact.status': 'NOT_FOUND' });
    join.set({ releaseStatus: 'SKIPPED' });
    await Promise.all([prospect.save(), join.save()]);
    return;
  }

  const normalizedEmail = finder.email.trim().toLowerCase();
  const verification = await hunter.verifyEmail(normalizedEmail);

  if (verification.status === 'invalid' || verification.status === 'disposable') {
    prospect.set({
      contact: {
        status: 'INVALID',
        businessEmail: finder.email,
        normalizedEmail,
        provider: 'HUNTER',
        providerReference: finder.email,
        verificationConfidence: verification.score,
        verifiedAt: new Date(),
      },
    });
    join.set({ releaseStatus: 'SKIPPED' });
    await Promise.all([prospect.save(), join.save()]);
    return;
  }

  if (verification.status !== 'valid') {
    prospect.set({
      contact: {
        status: 'REVIEW',
        businessEmail: finder.email,
        normalizedEmail,
        provider: 'HUNTER',
        providerReference: finder.email,
        verificationConfidence: verification.score,
        verifiedAt: new Date(),
      },
    });
    join.set({ releaseStatus: 'REVIEW' });
    await Promise.all([prospect.save(), join.save()]);
    return;
  }

  prospect.set({
    contact: {
      status: 'VERIFIED',
      businessEmail: finder.email,
      normalizedEmail,
      provider: 'HUNTER',
      providerReference: finder.email,
      verificationConfidence: verification.score,
      verifiedAt: new Date(),
    },
  });
  await prospect.save();

  await enqueueJob({
    workspaceId: campaign.workspaceId,
    type: 'EVALUATE_OUTREACH_POLICY',
    payload: { campaignId, prospectId },
  });
}
