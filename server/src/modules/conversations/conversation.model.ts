import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, index: true },
    provider: { type: String, enum: ['HUNTER'], required: true, default: 'HUNTER' },
    providerThreadId: String,
    lastMessageAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'conversations' },
);

schema.index({ workspaceId: 1, prospectId: 1, provider: 1, providerThreadId: 1 }, { sparse: true });

export type Conversation = InferSchemaType<typeof schema>;
export const ConversationModel: Model<Conversation> = model<Conversation>('Conversation', schema);
