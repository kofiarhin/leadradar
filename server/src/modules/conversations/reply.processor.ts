import type { AppConfig } from '../../config/env';
import { NvidiaClient } from '../../providers/nvidia/nvidia.client';
import { CampaignModel } from '../campaigns/campaign.model';
import { ConversationModel } from './conversation.model';
import { MessageModel } from './message.model';
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

export async function processReplyJob(payload: Record<string, unknown>, config: AppConfig): Promise<void> {
  const integrationEventId = typeof payload.integrationEventId === 'string' ? payload.integrationEventId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  const hunter = payload.hunter && typeof payload.hunter === 'object' ? payload.hunter as Record<string, unknown> : undefined;
  if (!integrationEventId || !prospectId || !hunter) throw new Error('INVALID_REPLY_JOB');

  const event = await IntegrationEventModel.findById(integrationEventId);
  const prospect = await ProspectModel.findById(prospectId);
  if (!event || !prospect) throw new Error('REPLY_RECORD_NOT_FOUND');
  if (event.status === 'PROCESSED') return;

  event.set({ status: 'PROCESSING', attempts: event.attempts + 1 });
  await event.save();

  const providerMessageId = String(hunter.message_id ?? hunter.messageId ?? hunter.id ?? event.providerEventId);
  const providerThreadId = String(hunter.thread_id ?? hunter.threadId ?? prospect.outreach.providerLeadId ?? providerMessageId);
  const bodyText = String(hunter.body ?? hunter.text ?? hunter.content ?? '');
  const subject = typeof hunter.subject === 'string' ? hunter.subject : undefined;
  if (!bodyText.trim()) throw new Error('EMPTY_REPLY_BODY');

  const campaignId = prospect.outreach.activeCampaignId;
  const conversation = await ConversationModel.findOneAndUpdate(
    { workspaceId: prospect.workspaceId, prospectId: prospect._id, provider: 'HUNTER', providerThreadId },
    {
      $set: { lastMessageAt: new Date(), ...(campaignId ? { campaignId } : {}) },
      $setOnInsert: { workspaceId: prospect.workspaceId, prospectId: prospect._id, provider: 'HUNTER', providerThreadId },
    },
    { upsert: true, new: true },
  );

  await MessageModel.findOneAndUpdate(
    { provider: 'HUNTER', providerMessageId },
    {
      $setOnInsert: {
        workspaceId: prospect.workspaceId,
        conversationId: conversation._id,
        prospectId: prospect._id,
        ...(campaignId ? { campaignId } : {}),
        direction: 'INBOUND',
        kind: 'PROSPECT_REPLY',
        provider: 'HUNTER',
        providerMessageId,
        ...(subject ? { subject } : {}),
        bodyText,
        receivedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // Deterministic safety boundary: pause/replied state is persisted before AI classification.
  prospect.set({
    'outreach.status': 'REPLIED',
    'outreach.pausedAt': new Date(),
  });
  await prospect.save();

  if (!config.nvidiaApiKey || !config.nvidiaModel) throw new Error('NVIDIA_NOT_CONFIGURED');
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
    { workspaceId: prospect.workspaceId, prospectId: prospect._id, conversationId: conversation._id },
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
        conversationId: conversation._id,
      },
    },
    { upsert: true },
  );

  event.set({ status: 'PROCESSED', processedAt: new Date() });
  await event.save();
}
