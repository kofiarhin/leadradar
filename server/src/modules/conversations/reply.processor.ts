import type { AppConfig } from '../../config/env';
import { HunterClient } from '../../providers/hunter/hunter.client';
import { ConversationModel } from './conversation.model';
import { MessageModel } from './message.model';
import { IntegrationEventModel } from '../integrations/integration-event.model';
import { enqueueJob } from '../jobs/job.service';
import { ProspectModel } from '../prospects/prospect.model';

export async function processReplyJob(payload: Record<string, unknown>, config: AppConfig): Promise<void> {
  const integrationEventId = typeof payload.integrationEventId === 'string' ? payload.integrationEventId : undefined;
  const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : undefined;
  const hunterPayload = payload.hunter && typeof payload.hunter === 'object'
    ? payload.hunter as Record<string, unknown>
    : undefined;
  if (!integrationEventId || !prospectId || !hunterPayload) throw new Error('INVALID_REPLY_JOB');

  const event = await IntegrationEventModel.findById(integrationEventId);
  const prospect = await ProspectModel.findById(prospectId);
  if (!event || !prospect) throw new Error('REPLY_RECORD_NOT_FOUND');
  if (event.status === 'PROCESSED') return;

  event.set({ status: 'PROCESSING', attempts: event.attempts + 1 });
  await event.save();

  const providerMessageId = String(hunterPayload.message_id ?? hunterPayload.messageId ?? hunterPayload.id ?? event.providerEventId);
  const providerThreadId = String(hunterPayload.thread_id ?? hunterPayload.threadId ?? prospect.outreach.providerLeadId ?? providerMessageId);
  const bodyText = String(hunterPayload.body ?? hunterPayload.text ?? hunterPayload.content ?? '');
  const subject = typeof hunterPayload.subject === 'string' ? hunterPayload.subject : undefined;
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

  if (
    prospect.outreach.providerSequenceId &&
    prospect.contact.normalizedEmail &&
    config.outboundMode === 'enabled'
  ) {
    if (!config.hunterApiKey) throw new Error('HUNTER_NOT_CONFIGURED');
    const hunter = new HunterClient({ apiKey: config.hunterApiKey });
    await hunter.cancelScheduledEmails(
      prospect.outreach.providerSequenceId,
      prospect.contact.normalizedEmail,
    );
  }

  // This state is persisted only after provider follow-ups have been canceled when live
  // outbound is enabled. AI classification happens in a separate job afterwards.
  prospect.set({
    'outreach.status': 'REPLIED',
    'outreach.pausedAt': new Date(),
  });
  await prospect.save();

  await enqueueJob({
    workspaceId: prospect.workspaceId,
    type: 'CLASSIFY_REPLY',
    payload: {
      integrationEventId,
      prospectId,
      conversationId: conversation._id.toString(),
      bodyText,
    },
  });
}
