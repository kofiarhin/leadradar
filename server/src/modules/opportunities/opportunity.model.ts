import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, index: true },
    conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: ['OPEN','READY_TO_REPLY','READY_TO_BOOK','FOLLOW_UP_LATER','BOOKED','CLOSED_LOST'], default: 'OPEN', required: true, index: true },
    intent: { type: String, enum: ['POSITIVE','QUESTION','LATER','REFERRAL','NEGATIVE','UNSUBSCRIBE','OUT_OF_OFFICE','REVIEW'], required: true, index: true },
    priority: { type: String, enum: ['HIGH','MEDIUM','LOW'], required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    summary: { type: String, required: true },
    recommendedAction: { type: String, required: true },
    followUpAt: Date,
    bookedAt: Date,
    draftReply: String,
  },
  { timestamps: true, collection: 'opportunities' },
);

schema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
schema.index({ workspaceId: 1, prospectId: 1, conversationId: 1 }, { unique: true });

export type Opportunity = InferSchemaType<typeof schema>;
export const OpportunityModel: Model<Opportunity> = model<Opportunity>('Opportunity', schema);
