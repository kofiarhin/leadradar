import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema(
  {
    provider: { type: String, enum: ['APIFY','HUNTER'], required: true, index: true },
    providerEventId: { type: String, required: true },
    eventType: { type: String, required: true },
    payloadHash: { type: String, required: true },
    status: { type: String, enum: ['RECEIVED','PROCESSING','PROCESSED','FAILED'], default: 'RECEIVED', required: true, index: true },
    attempts: { type: Number, default: 0, required: true },
    receivedAt: { type: Date, default: () => new Date(), required: true },
    processedAt: Date,
    lastErrorCode: String,
  },
  { collection: 'integrationEvents' },
);

schema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export type IntegrationEvent = InferSchemaType<typeof schema>;
export const IntegrationEventModel: Model<IntegrationEvent> = model<IntegrationEvent>('IntegrationEvent', schema);
