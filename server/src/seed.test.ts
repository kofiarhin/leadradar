import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../test/db';
import { AdminUserModel } from './modules/auth/admin-user.model';
import { verifyPassword } from './modules/auth/password';
import { WorkspaceModel } from './modules/workspaces/workspace.model';
import { seedOwner } from './seed';

const seedInput = {
  workspaceName: 'LeadRadar',
  adminEmail: 'Owner@Example.Test',
  adminInitialPassword: 'an-initial-password',
  scryptParams: { N: 1024, r: 8, p: 1 },
};

describe('seedOwner', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('creates exactly one workspace and one admin user', async () => {
    const result = await seedOwner(seedInput);

    expect(result.created).toBe(true);
    await expect(WorkspaceModel.countDocuments()).resolves.toBe(1);
    await expect(AdminUserModel.countDocuments()).resolves.toBe(1);
  });

  it('normalizes the admin email to lowercase', async () => {
    await seedOwner(seedInput);

    const admin = await AdminUserModel.findOne().lean();
    expect(admin?.email).toBe('owner@example.test');
  });

  it('stores a verifiable hash and never the plaintext password', async () => {
    await seedOwner(seedInput);

    const admin = await AdminUserModel.findOne().select('+passwordHash').lean();
    expect(admin?.passwordHash).toBeDefined();
    expect(admin?.passwordHash).not.toContain(seedInput.adminInitialPassword);

    await expect(
      verifyPassword(seedInput.adminInitialPassword, admin?.passwordHash as string),
    ).resolves.toBe(true);
  });

  it('scopes the admin user to the created workspace', async () => {
    await seedOwner(seedInput);

    const workspace = await WorkspaceModel.findOne().lean();
    const admin = await AdminUserModel.findOne().lean();

    expect(admin?.workspaceId.toString()).toBe(workspace?._id.toString());
  });

  it('is idempotent: a second run creates nothing further', async () => {
    await seedOwner(seedInput);
    const second = await seedOwner(seedInput);

    expect(second.created).toBe(false);
    await expect(WorkspaceModel.countDocuments()).resolves.toBe(1);
    await expect(AdminUserModel.countDocuments()).resolves.toBe(1);
  });

  it('never overwrites a password changed after the first seed', async () => {
    await seedOwner(seedInput);

    const rotated = 'a-rotated-password';
    const { hashPassword } = await import('./modules/auth/password');
    const rotatedHash = await hashPassword(rotated, seedInput.scryptParams);
    await AdminUserModel.updateOne({}, { $set: { passwordHash: rotatedHash } });

    await seedOwner(seedInput);

    const admin = await AdminUserModel.findOne().select('+passwordHash').lean();
    expect(admin?.passwordHash).toBe(rotatedHash);
    await expect(verifyPassword(rotated, admin?.passwordHash as string)).resolves.toBe(true);
    await expect(
      verifyPassword(seedInput.adminInitialPassword, admin?.passwordHash as string),
    ).resolves.toBe(false);
  });

  it('does not create a second admin when one already exists under a different case', async () => {
    await seedOwner(seedInput);
    await seedOwner({ ...seedInput, adminEmail: 'OWNER@EXAMPLE.TEST' });

    await expect(AdminUserModel.countDocuments()).resolves.toBe(1);
  });

  it('excludes passwordHash from ordinary queries', async () => {
    await seedOwner(seedInput);

    const admin = await AdminUserModel.findOne().lean();
    expect(admin).not.toHaveProperty('passwordHash');
  });
});
