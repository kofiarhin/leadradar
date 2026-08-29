import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const companySizeSchema = new Schema(
  {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 },
  },
  { _id: false },
);

const verticalProfileSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    offer: { type: String, required: true, trim: true },
    targetRoles: { type: [String], required: true },
    targetIndustries: { type: [String], required: true },
    companySize: { type: companySizeSchema, required: false },
    targetRegions: { type: [String], required: true },
    positiveSignals: { type: [String], required: true },
    negativeSignals: { type: [String], required: true },
    outreachGoal: { type: String, enum: ['BOOK_CALL'], required: true, default: 'BOOK_CALL' },
    outreachTone: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true, collection: 'verticalProfiles' },
);

verticalProfileSchema.index({ workspaceId: 1, updatedAt: -1 });

export type VerticalProfile = InferSchemaType<typeof verticalProfileSchema>;
export const VerticalProfileModel: Model<VerticalProfile> = model<VerticalProfile>(
  'VerticalProfile',
  verticalProfileSchema,
);
