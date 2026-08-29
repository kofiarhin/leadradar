import type { SessionResponse } from '@leadradar/shared';

import { invalidCredentials } from '../../errors/app-error';
import { WorkspaceModel } from '../workspaces/workspace.model';
import { AdminUserModel, normalizeEmail } from './admin-user.model';
import { DEFAULT_SCRYPT_PARAMS, hashPassword, verifyPassword } from './password';

/**
 * A well-formed hash of a value nobody knows, verified against when an email matches
 * no account. Without it, an unknown email would answer measurably faster than a wrong
 * password and disclose which accounts exist. Built once, lazily.
 */
let dummyHashPromise: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(
    `no-such-account-${Math.random()}`,
    DEFAULT_SCRYPT_PARAMS,
  );
  return dummyHashPromise;
}

export interface AuthenticatedOwner {
  adminUserId: string;
  workspaceId: string;
  response: SessionResponse;
}

/**
 * Verifies credentials and returns the session payload.
 *
 * Throws the same error for an unknown email and a wrong password.
 */
export async function authenticateOwner(
  email: string,
  password: string,
): Promise<AuthenticatedOwner> {
  const normalized = normalizeEmail(email);
  const admin = await AdminUserModel.findOne({ email: normalized }).select('+passwordHash');

  if (!admin) {
    await verifyPassword(password, await getDummyHash());
    throw invalidCredentials();
  }

  const matches = await verifyPassword(password, admin.passwordHash);
  if (!matches) {
    throw invalidCredentials();
  }

  const workspace = await WorkspaceModel.findById(admin.workspaceId);
  if (!workspace) {
    throw invalidCredentials();
  }

  return {
    adminUserId: admin._id.toString(),
    workspaceId: workspace._id.toString(),
    response: {
      user: { id: admin._id.toString(), email: admin.email },
      workspace: { id: workspace._id.toString(), name: workspace.name },
    },
  };
}

/** Builds the session body for an already-authenticated request. */
export async function readSession(
  adminUserId: string,
  workspaceId: string,
): Promise<SessionResponse | undefined> {
  const [admin, workspace] = await Promise.all([
    AdminUserModel.findById(adminUserId),
    WorkspaceModel.findById(workspaceId),
  ]);

  if (!admin || !workspace) {
    return undefined;
  }

  return {
    user: { id: admin._id.toString(), email: admin.email },
    workspace: { id: workspace._id.toString(), name: workspace.name },
  };
}
