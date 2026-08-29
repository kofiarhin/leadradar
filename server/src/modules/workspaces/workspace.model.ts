import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

/**
 * V1 has one owner and one workspace, but every durable business record carries a
 * workspaceId so a multi-tenant path stays open (docs/SPEC.md §5.1).
 */
const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'workspaces' },
);

export type Workspace = InferSchemaType<typeof workspaceSchema>;

export const WorkspaceModel: Model<Workspace> = model<Workspace>('Workspace', workspaceSchema);
