import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const campaignProspectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, required: true, index: true },
    prospectId: { type: Schema.Types.ObjectId, required: true, index: true },
    primarySignalId: { type: Schema.Types.ObjectId, required: true },
    qualificationDecision: { type: String, enum: ['PENDING','QUALIFIED','REVIEW','REJECTED','ERROR'], default: 'PENDING', required: true, index: true },
    outreachPolicyDecision: { type: String, enum: ['ALLOWED','REVIEW','BLOCKED'] },
    suppressionDecision: { type: String, enum: ['CLEAR','BLOCKED'] },
    releaseStatus: { type: String, enum: ['PENDING','REVIEW','READY','RELEASED','SKIPPED','BLOCKED'], default: 'PENDING', required: true, index: true },
  },
  { timestamps: true, collection: 'campaignProspects' },
);

campaignProspectSchema.index({ workspaceId: 1, campaignId: 1, prospectId: 1 }, { unique: true });
campaignProspectSchema.index({ workspaceId: 1, campaignId: 1, releaseStatus: 1 });

export type CampaignProspect = InferSchemaType<typeof campaignProspectSchema>;
export const CampaignProspectModel: Model<CampaignProspect> = model<CampaignProspect>('CampaignProspect', campaignProspectSchema);
