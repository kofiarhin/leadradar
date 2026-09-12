import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const opportunitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, index: true },
    conversationId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN','NEEDS_REVIEW','READY_TO_REPLY','READY_TO_BOOK','FOLLOW_UP_LATER','BOOKED','CLOSED_LOST'],
      default: 'OPEN',
      required: true,
      index: true,
    },
    intent: { type: String, enum: ['POSITIVE','QUESTION','LATER','REFERRAL','NEGATIVE','UNSUBSCRIBE','OUT_OF_OFFICE','REVIEW'], required: true },
    priority: { type: String, enum: ['HIGH','MEDIUM','LOW'], required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    summary: { type: String, required: true },
    recommendedAction: { type: String, required: true },
    model: String,
    promptVersion: String,
    schemaVersion: String,
    draftReply: String,
    draftModel: String,
    draftPromptVersion: String,
    draftSchemaVersion: String,
    followUpAt: Date,
    bookedAt: Date,
  },
  { timestamps: true, collection: 'opportunities' },
);

opportunitySchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
opportunitySchema.index({ workspaceId: 1, conversationId: 1 }, { unique: true });

export type Opportunity = InferSchemaType<typeof opportunitySchema>;
export const OpportunityModel: Model<Opportunity> = model<Opportunity>('Opportunity', opportunitySchema);
