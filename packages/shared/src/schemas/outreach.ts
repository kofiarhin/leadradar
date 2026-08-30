import { z } from 'zod';

export const sequenceStepSchema = z.object({
  order: z.number().int().min(1),
  delayDays: z.number().int().min(0),
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(5000),
});

export const updateSequenceRequestSchema = z.object({
  steps: z.array(sequenceStepSchema).min(2).max(3),
});

export const approveCampaignRequestSchema = z.object({
  approved: z.literal(true),
});

export type UpdateSequenceRequest = z.infer<typeof updateSequenceRequestSchema>;
export type ApproveCampaignRequest = z.infer<typeof approveCampaignRequestSchema>;
