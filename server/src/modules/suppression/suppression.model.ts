import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    normalizedEmail: { type: String, index: true },
    prospectId: { type: Schema.Types.ObjectId, index: true },
    reason: { type: String, enum: ['UNSUBSCRIBE','DO_NOT_CONTACT','COMPLAINT','HARD_BOUNCE'], required: true },
    source: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'suppressions' },
);

schema.index({ workspaceId: 1, normalizedEmail: 1 }, { sparse: true });
schema.index({ workspaceId: 1, prospectId: 1 }, { sparse: true });

export type Suppression = InferSchemaType<typeof schema>;
export const SuppressionModel: Model<Suppression> = model<Suppression>('Suppression', schema);
