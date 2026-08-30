import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    decision: { type: String, enum: ['ALLOWED','REVIEW','BLOCKED'], required: true, index: true },
    policyVersion: { type: String, required: true },
    reasonCodes: { type: [String], default: [] },
    evaluatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'outreachPolicyEvaluations' },
);

schema.index({ workspaceId: 1, campaignId: 1, prospectId: 1, evaluatedAt: -1 });

export type OutreachPolicyEvaluation = InferSchemaType<typeof schema>;
export const OutreachPolicyEvaluationModel: Model<OutreachPolicyEvaluation> = model<OutreachPolicyEvaluation>('OutreachPolicyEvaluation', schema);
