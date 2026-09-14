import { Schema, model, type Model, Types } from 'mongoose';

export interface CampaignSequenceStep {
  order: number;
  delayDays: number;
  subject?: string;
  body: string;
}

export interface CampaignMetrics {
  signals: number;
  uniqueProspects: number;
  qualified: number;
  verified: number;
  eligible: number;
  contacted: number;
  replies: number;
  opportunities: number;
  readyToBook: number;
  booked: number;
}

export interface Campaign {
  workspaceId: Types.ObjectId;
  verticalProfileId: Types.ObjectId;
  verticalProfileVersion: number;
  name: string;
  source: {
    platform: 'LINKEDIN';
    postUrl: string;
  };
  status:
    | 'DRAFT'
    | 'DISCOVERING'
    | 'PROCESSING'
    | 'READY_FOR_REVIEW'
    | 'APPROVED'
    | 'SENDING'
    | 'COMPLETED'
    | 'PARTIAL_FAILURE'
    | 'FAILED'
    | 'CANCELLED';
  discovery?: {
    provider: 'APIFY';
    runId?: string;
    startedAt?: Date;
    completedAt?: Date;
    errorCode?: string;
  };
  sequence: {
    approvalStatus: 'NOT_GENERATED' | 'DRAFT' | 'APPROVED' | 'REAPPROVAL_REQUIRED';
    draftVersion: number;
    approvedVersion?: number;
    approvedAt?: Date;
    approvedProspectIds: Types.ObjectId[];
    model?: string;
    promptVersion?: string;
    schemaVersion?: string;
    providerSequenceId?: string;
    providerState: 'NOT_PREPARED' | 'PREPARING' | 'PREPARED' | 'STARTED' | 'ERROR';
    providerConfiguredVersion?: number;
    providerStartedAt?: Date;
    providerLastErrorCode?: string;
    steps: CampaignSequenceStep[];
  };
  metricsSnapshot: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const sequenceStepSchema = new Schema<CampaignSequenceStep>(
  {
    order: { type: Number, required: true, min: 1 },
    delayDays: { type: Number, required: true, min: 0 },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
  },
  { _id: false },
);

const metricsSchema = new Schema<CampaignMetrics>(
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

const campaignSchema = new Schema<Campaign>(
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
      approvedProspectIds: { type: [Schema.Types.ObjectId], default: [] },
      model: String,
      promptVersion: String,
      schemaVersion: String,
      providerSequenceId: String,
      providerState: {
        type: String,
        enum: ['NOT_PREPARED','PREPARING','PREPARED','STARTED','ERROR'],
        default: 'NOT_PREPARED',
        required: true,
      },
      providerConfiguredVersion: Number,
      providerStartedAt: Date,
      providerLastErrorCode: String,
      steps: { type: [sequenceStepSchema], default: [] },
    },
    metricsSnapshot: { type: metricsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'campaigns' },
);

campaignSchema.index({ workspaceId: 1, createdAt: -1 });

export const CampaignModel: Model<Campaign> = model<Campaign>('Campaign', campaignSchema);
