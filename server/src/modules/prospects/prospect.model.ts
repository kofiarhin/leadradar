import { Schema, model, type Model, Types } from 'mongoose';

export interface ProspectIdentity {
  firstName?: string;
  lastName?: string;
  displayName: string;
  linkedinUrl?: string;
  normalizedLinkedinUrl?: string;
  role?: string;
  company?: string;
  companyDomain?: string;
  location?: string;
  countryCode?: string;
  companyType?: string;
}

export interface ProspectQualification {
  status: 'PENDING' | 'QUALIFIED' | 'REVIEW' | 'REJECTED' | 'ERROR';
  confidence?: number;
  reason?: string;
  evaluatedAt?: Date;
  model?: string;
  promptVersion?: string;
  schemaVersion?: string;
  verticalProfileVersion?: number;
}

export interface ProspectContact {
  status: 'NOT_ENRICHED' | 'ENRICHING' | 'VERIFIED' | 'NOT_FOUND' | 'INVALID' | 'REVIEW' | 'ERROR';
  businessEmail?: string;
  normalizedEmail?: string;
  provider?: string;
  providerReference?: string;
  verificationConfidence?: number;
  verifiedAt?: Date;
}

export interface ProspectOutreach {
  status: 'NOT_ELIGIBLE' | 'ELIGIBLE' | 'QUEUED' | 'CONTACTED' | 'PAUSED' | 'REPLIED' | 'COMPLETED' | 'BLOCKED' | 'ERROR';
  provider?: string;
  providerLeadId?: string;
  providerSequenceId?: string;
  activeCampaignId?: Types.ObjectId;
  firstContactedAt?: Date;
  lastContactedAt?: Date;
  pausedAt?: Date;
}

export interface ProspectLatestIntent {
  intent: 'POSITIVE' | 'QUESTION' | 'LATER' | 'REFERRAL' | 'NEGATIVE' | 'UNSUBSCRIBE' | 'OUT_OF_OFFICE' | 'REVIEW';
  confidence?: number;
  classifiedAt?: Date;
  model?: string;
  promptVersion?: string;
  schemaVersion?: string;
}

export interface Prospect {
  workspaceId: Types.ObjectId;
  identity: ProspectIdentity;
  qualification: ProspectQualification;
  contact: ProspectContact;
  outreach: ProspectOutreach;
  latestIntent?: ProspectLatestIntent;
  createdAt: Date;
  updatedAt: Date;
}

const prospectSchema = new Schema<Prospect>(
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
      promptVersion: String,
      schemaVersion: String,
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
      model: String,
      promptVersion: String,
      schemaVersion: String,
    },
  },
  { timestamps: true, collection: 'prospects' },
);

prospectSchema.index({ workspaceId: 1, 'identity.normalizedLinkedinUrl': 1 }, { unique: true, sparse: true });
prospectSchema.index({ workspaceId: 1, 'contact.normalizedEmail': 1 }, { unique: true, sparse: true });
prospectSchema.index({ workspaceId: 1, 'identity.displayName': 1, 'identity.company': 1 });

export const ProspectModel: Model<Prospect> = model<Prospect>('Prospect', prospectSchema);
