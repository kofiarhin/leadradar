import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const signalSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['LINKEDIN_COMMENT'], required: true, default: 'LINKEDIN_COMMENT' },
    source: {
      postUrl: { type: String, required: true },
      profileUrl: String,
      provider: { type: String, enum: ['APIFY'], required: true, default: 'APIFY' },
      providerSignalId: { type: String, required: true },
    },
    content: { type: String, required: true },
    occurredAt: Date,
    discoveredAt: { type: Date, required: true, default: () => new Date() },
    retentionClass: { type: String, enum: ['QUALIFIED_DURABLE','REJECTED_TEMPORARY','REVIEW'], required: true, default: 'REVIEW', index: true },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true, collection: 'signals' },
);

signalSchema.index({ workspaceId: 1, 'source.provider': 1, 'source.providerSignalId': 1 }, { unique: true });
signalSchema.index({ workspaceId: 1, prospectId: 1, campaignId: 1 });

export type Signal = InferSchemaType<typeof signalSchema>;
export const SignalModel: Model<Signal> = model<Signal>('Signal', signalSchema);
