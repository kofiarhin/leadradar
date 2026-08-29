import { Schema, Types, model, type Model } from 'mongoose';

export interface AdminUser {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<AdminUser>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Excluded by default so a hash cannot reach a response through a routine query.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: 'adminUsers' },
);

export const AdminUserModel: Model<AdminUser> = model<AdminUser>('AdminUser', adminUserSchema);

/** Single normalization used by both seeding and login, so lookups always agree. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
