import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const prospectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    identity: {
      firstName: String,
      lastName: String,
      displayName: { type: String, required: true },
      linkedinUrl: String,
      normalizedLinkedinUrl: String,
      role: String,
      company: String,
      companyDomain: String,
      location: String,
      countryCode: String,
      companyType: String,
    },
    qualification: {
      status: { type: String, enum: ['PENDING','QUALIFIED','REVIEW','REJECTED','ERROR'], default: 'PENDING', required: true, index: true },
      confidence: Number,
      reason: String,
      evaluatedAt: Date,
      model: String,
      verticalProfileVersion: Number,
    },
    contact: {
      status: { type: String, enum: ['NOT_ENRICHED','ENRICHING','VERIFIED','NOT_FOUND','INVALID','REVIEW','ERROR'], default: 'NOT_ENRICHED', required: true, index: true },
      businessEmail: String,
      normalizedEmail: String,
      provider: String,
      providerReference: String,
      verificationConfidence: Number,
      verifiedAt: Date,
    },
    outreach: {
      status: { type: String, enum: ['NOT_ELIGIBLE','ELIGIBLE','QUEUED','CONTACTED','PAUSED','REPLIED','COMPLETED','BLOCKED','ERROR'], default: 'NOT_ELIGIBLE', required: true, index: true },
      provider: String,
      providerLeadId: String,
      providerSequenceId: String,
      activeCampaignId: Schema.Types.ObjectId,
      firstContactedAt: Date,
      lastContactedAt: Date,
      pausedAt: Date,
    },
    latestIntent: {
      intent: { type: String, enum: ['POSITIVE','QUESTION','LATER','REFERRAL','NEGATIVE','UNSUBSCRIBE','OUT_OF_OFFICE','REVIEW'] },
      confidence: Number,
      classifiedAt: Date,
    },
  },
  { timestamps: true, collection: 'prospects' },
);

prospectSchema.index({ workspaceId: 1, 'identity.normalizedLinkedinUrl': 1 }, { unique: true, sparse: true });
prospectSchema.index({ workspaceId: 1, 'contact.normalizedEmail': 1 }, { unique: true, sparse: true });
prospectSchema.index({ workspaceId: 1, 'identity.displayName': 1, 'identity.company': 1 });

export type Prospect = InferSchemaType<typeof prospectSchema>;
export const ProspectModel: Model<Prospect> = model<Prospect>('Prospect', prospectSchema);
