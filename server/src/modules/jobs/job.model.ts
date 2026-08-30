import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export const JOB_TYPES = [
  'INGEST_DISCOVERY_RESULTS',
  'QUALIFY_PROSPECT',
  'ENRICH_PROSPECT',
  'EVALUATE_OUTREACH_POLICY',
  'RELEASE_CAMPAIGN_PROSPECT',
  'PROCESS_REPLY',
  'CLASSIFY_REPLY',
  'RECOMPUTE_CAMPAIGN_METRICS',
  'APPLY_RETENTION',
] as const;

const jobSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: JOB_TYPES, required: true, index: true },
    status: { type: String, enum: ['PENDING','RUNNING','SUCCEEDED','FAILED','DEAD'], default: 'PENDING', required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    runAt: { type: Date, default: () => new Date(), required: true, index: true },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: 3, required: true },
    lockedAt: Date,
    lockedBy: String,
    completedAt: Date,
    lastErrorCode: String,
    lastErrorMessage: String,
  },
  { timestamps: true, collection: 'jobs' },
);

jobSchema.index({ status: 1, runAt: 1, lockedAt: 1 });

export type Job = InferSchemaType<typeof jobSchema>;
export const JobModel: Model<Job> = model<Job>('Job', jobSchema);
