import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, index: true },
    direction: { type: String, enum: ['INBOUND','OUTBOUND'], required: true },
    kind: { type: String, enum: ['SEQUENCE','MANUAL_REPLY','PROSPECT_REPLY'], required: true },
    provider: { type: String, enum: ['HUNTER'], required: true, default: 'HUNTER' },
    providerMessageId: { type: String, required: true },
    subject: String,
    bodyText: { type: String, required: true },
    sentAt: Date,
    receivedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'messages' },
);

schema.index({ provider: 1, providerMessageId: 1 }, { unique: true });
schema.index({ workspaceId: 1, conversationId: 1, createdAt: 1 });

export type Message = InferSchemaType<typeof schema>;
export const MessageModel: Model<Message> = model<Message>('Message', schema);
