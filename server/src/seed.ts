import { AdminUserModel, normalizeEmail } from './modules/auth/admin-user.model';
import { DEFAULT_SCRYPT_PARAMS, hashPassword, type ScryptParams } from './modules/auth/password';
import { WorkspaceModel } from './modules/workspaces/workspace.model';

export interface SeedOwnerInput {
  workspaceName: string;
  adminEmail: string;
  adminInitialPassword: string;
  scryptParams?: ScryptParams;
}

export interface SeedOwnerResult {
  /** True when this run created the admin user; false when one already existed. */
  created: boolean;
  workspaceId: string;
  adminEmail: string;
}

const DEFAULT_WORKSPACE_NAME = 'LeadRadar';

/**
 * Creates the single workspace and admin user when they are absent.
 *
 * Explicit and idempotent (docs/SPEC.md §9.1): an existing admin is left completely
 * untouched, so a password rotated after the first seed survives every later run and
 * every restart. Nothing here logs a credential.
 */
export async function seedOwner(input: SeedOwnerInput): Promise<SeedOwnerResult> {
  const email = normalizeEmail(input.adminEmail);

  const workspace =
    (await WorkspaceModel.findOne()) ??
    (await WorkspaceModel.create({ name: input.workspaceName || DEFAULT_WORKSPACE_NAME }));

  const existing = await AdminUserModel.findOne({ email });
  if (existing) {
    return { created: false, workspaceId: workspace._id.toString(), adminEmail: email };
  }

  const passwordHash = await hashPassword(
    input.adminInitialPassword,
    input.scryptParams ?? DEFAULT_SCRYPT_PARAMS,
  );

  try {
    await AdminUserModel.create({ workspaceId: workspace._id, email, passwordHash });
  } catch (error) {
    // A concurrent seed lost the race; the unique index is the arbiter.
    if (isDuplicateKeyError(error)) {
      return { created: false, workspaceId: workspace._id.toString(), adminEmail: email };
    }
    throw error;
  }

  return { created: true, workspaceId: workspace._id.toString(), adminEmail: email };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}
