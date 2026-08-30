import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const sequenceStepSchema = new Schema(
  {
    order: { type: Number, required: true, min: 1 },
    delayDays: { type: Number, required: true, min: 0 },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
  },
  { _id: false },
);

const metricsSchema = new Schema(
  {
    signals: { type: Number, default: 0 },
    uniqueProspects: { type: Number, default: 0 },
    qualified: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    eligible: { type: Number, default: 0 },
    contacted: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    opportunities: { type: Number, default: 0 },
    readyToBook: { type: Number, default: 0 },
    booked: { type: Number, default: 0 },
  },
  { _id: false },
);

const campaignSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    verticalProfileId: { type: Schema.Types.ObjectId, required: true, index: true },
    verticalProfileVersion: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true },
    source: {
      platform: { type: String, enum: ['LINKEDIN'], default: 'LINKEDIN', required: true },
      postUrl: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['DRAFT','DISCOVERING','PROCESSING','READY_FOR_REVIEW','APPROVED','SENDING','COMPLETED','PARTIAL_FAILURE','FAILED','CANCELLED'],
      default: 'DRAFT',
      required: true,
      index: true,
    },
    discovery: {
      provider: { type: String, enum: ['APIFY'], default: 'APIFY' },
      runId: String,
      startedAt: Date,
      completedAt: Date,
      errorCode: String,
    },
    sequence: {
      approvalStatus: { type: String, enum: ['NOT_GENERATED','DRAFT','APPROVED','REAPPROVAL_REQUIRED'], default: 'NOT_GENERATED', required: true },
      draftVersion: { type: Number, default: 0, required: true },
      approvedVersion: Number,
      approvedAt: Date,
      steps: { type: [sequenceStepSchema], default: [] },
    },
    metricsSnapshot: { type: metricsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'campaigns' },
);

campaignSchema.index({ workspaceId: 1, createdAt: -1 });

export type Campaign = InferSchemaType<typeof campaignSchema>;
export const CampaignModel: Model<Campaign> = model<Campaign>('Campaign', campaignSchema);
