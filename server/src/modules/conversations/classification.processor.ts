import type { AppConfig } from '../../config/env';
import { NvidiaClient } from '../../providers/nvidia/nvidia.client';
import { CampaignModel } from '../campaigns/campaign.model';
import { IntegrationEventModel } from '../integrations/integration-event.model';
import { OpportunityModel } from '../opportunities/opportunity.model';
import { ProspectModel } from '../prospects/prospect.model';
import { SuppressionModel } from '../suppression/suppression.model';

function priorityFor(intent: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (['POSITIVE', 'QUESTION', 'REFERRAL'].includes(intent)) return 'HIGH';
  if (['LATER', 'REVIEW'].includes(intent)) return 'MEDIUM';
  return 'LOW';
}

function statusFor(intent: string): 'OPEN' | 'READY_TO_REPLY' | 'READY_TO_BOOK' | 'FOLLOW_UP_LATER' | 'CLOSED_LOST' {
  if (intent === 'POSITIVE') return 'READY_TO_BOOK';
  if (['QUESTION', 'REFERRAL', 'REVIEW'].includes(intent)) return 'READY_TO_REPLY';
  if (intent === 'LATER' || intent === 'OUT_OF_OFFICE') return 'FOLLOW_UP_LATER';
  if (intent === 'NEGATIVE' || intent === 'UNSUBSCRIBE') return 'CLOSED_LOST';
  return 'OPEN';
}

export async function processReplyClassificationJob(
  payload: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const integrationEventId = typeof payload.integrationEventId === 'string' ? payload.integrationEventId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  const conversationId = typeof payload.conversationId === 'string' ? payload.conversationId : undefined;
  const bodyText = typeof payload.bodyText === 'string' ? payload.bodyText : undefined;
  if (!integrationEventId || !prospectId || !conversationId || !bodyText) {
    throw new Error('INVALID_CLASSIFICATION_JOB');
  }

  const event = await IntegrationEventModel.findById(integrationEventId);
  const prospect = await ProspectModel.findById(prospectId);
  if (!event || !prospect) throw new Error('CLASSIFICATION_RECORD_NOT_FOUND');
  if (event.status === 'PROCESSED') return;
  if (!config.nvidiaApiKey || !config.nvidiaModel) throw new Error('NVIDIA_NOT_CONFIGURED');

  const campaignId = prospect.outreach.activeCampaignId;
  const nvidia = new NvidiaClient({ apiKey: config.nvidiaApiKey, model: config.nvidiaModel });
  const classification = await nvidia.classifyReply({
    prospect: prospect.identity,
    latestReply: bodyText,
    campaign: campaignId ? await CampaignModel.findById(campaignId) : undefined,
  });

  prospect.set({
    latestIntent: {
      intent: classification.intent,
      confidence: classification.confidence,
      classifiedAt: new Date(),
    },
  });
  await prospect.save();

  if (classification.intent === 'UNSUBSCRIBE') {
    await SuppressionModel.findOneAndUpdate(
      { workspaceId: prospect.workspaceId, prospectId: prospect._id },
      {
        $setOnInsert: {
          workspaceId: prospect.workspaceId,
          prospectId: prospect._id,
          ...(prospect.contact.normalizedEmail ? { normalizedEmail: prospect.contact.normalizedEmail } : {}),
          reason: 'UNSUBSCRIBE',
          source: 'HUNTER_REPLY',
        },
      },
      { upsert: true },
    );
  }

  const draftReply = ['POSITIVE','QUESTION','LATER','REFERRAL','REVIEW'].includes(classification.intent)
    ? await nvidia.draftReply({ prospect: prospect.identity, latestReply: bodyText, classification })
    : undefined;

  await OpportunityModel.findOneAndUpdate(
    { workspaceId: prospect.workspaceId, prospectId: prospect._id, conversationId },
    {
      $set: {
        ...(campaignId ? { campaignId } : {}),
        status: statusFor(classification.intent),
        intent: classification.intent,
        priority: priorityFor(classification.intent),
        confidence: classification.confidence,
        summary: classification.summary,
        recommendedAction: classification.recommendedAction,
        ...(draftReply ? { draftReply } : {}),
      },
      $setOnInsert: {
        workspaceId: prospect.workspaceId,
        prospectId: prospect._id,
        conversationId,
      },
    },
    { upsert: true },
  );

  event.set({ status: 'PROCESSED', processedAt: new Date() });
  await event.save();
}
