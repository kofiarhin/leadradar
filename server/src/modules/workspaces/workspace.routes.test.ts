import { API_BASE_PATH, ERROR_CODES } from '@leadradar/shared';
import request from 'supertest';

import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../test/db';
import { createApp } from '../../app';
import { seedOwner } from '../../seed';
import { WorkspaceModel } from './workspace.model';

const password = 'an-initial-password';
const email = 'owner@example.test';
const app = createApp();

describe('GET /workspace', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await seedOwner({
      workspaceName: 'LeadRadar',
      adminEmail: email,
      adminInitialPassword: password,
      scryptParams: { N: 1024, r: 8, p: 1 },
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  async function loginAgent(): Promise<ReturnType<typeof request.agent>> {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);
    return agent;
  }

  it('denies an unauthenticated request', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/workspace`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
  });

  it('returns the workspace identified by the session', async () => {
    const agent = await loginAgent();

    const response = await agent.get(`${API_BASE_PATH}/workspace`);

    expect(response.status).toBe(200);
    expect(response.body.workspace.name).toBe('LeadRadar');
  });

  it('ignores a workspace id supplied by the client', async () => {
    const other = await WorkspaceModel.create({ name: 'Someone Else' });
    const agent = await loginAgent();

    const response = await agent
      .get(`${API_BASE_PATH}/workspace`)
      .query({ workspaceId: other._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.workspace.name).toBe('LeadRadar');
    expect(response.body.workspace.id).not.toBe(other._id.toString());
  });

  it('denies access again once the session has been ended', async () => {
    const agent = await loginAgent();
    await agent.post(`${API_BASE_PATH}/auth/logout`).expect(204);

    const response = await agent.get(`${API_BASE_PATH}/workspace`);
    expect(response.status).toBe(401);
  });
});
