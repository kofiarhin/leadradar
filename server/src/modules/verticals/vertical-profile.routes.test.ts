import { API_BASE_PATH } from '@leadradar/shared';
import request from 'supertest';

import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../test/db';
import { createApp } from '../../app';
import { seedOwner } from '../../seed';

const password = 'an-initial-password';
const email = 'owner@example.test';
const app = createApp();

const validProfile = {
  name: 'Primary ICP',
  offer: 'Lead generation for B2B teams',
  targetRoles: ['Founder', 'Head of Sales'],
  targetIndustries: ['SaaS'],
  targetRegions: ['United Kingdom'],
  positiveSignals: ['Discussing pipeline'],
  negativeSignals: ['Student'],
  outreachGoal: 'BOOK_CALL' as const,
  outreachTone: 'Concise and professional',
};

describe('vertical profile routes', () => {
  beforeAll(connectTestDatabase);

  beforeEach(async () => {
    await seedOwner({
      workspaceName: 'LeadRadar',
      adminEmail: email,
      adminInitialPassword: password,
      scryptParams: { N: 1024, r: 8, p: 1 },
    });
  });

  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  async function loginAgent(): Promise<ReturnType<typeof request.agent>> {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);
    return agent;
  }

  it('denies unauthenticated reads', async () => {
    await request(app).get(`${API_BASE_PATH}/vertical-profile`).expect(401);
  });

  it('returns 404 until the owner creates a profile', async () => {
    const agent = await loginAgent();
    await agent.get(`${API_BASE_PATH}/vertical-profile`).expect(404);
  });

  it('creates, reads and versions the workspace profile', async () => {
    const agent = await loginAgent();

    const created = await agent
      .put(`${API_BASE_PATH}/vertical-profile`)
      .set('Origin', 'http://localhost:5173')
      .send(validProfile)
      .expect(201);

    expect(created.body.verticalProfile.version).toBe(1);
    expect(created.body.verticalProfile.offer).toBe(validProfile.offer);

    const read = await agent.get(`${API_BASE_PATH}/vertical-profile`).expect(200);
    expect(read.body.verticalProfile.id).toBe(created.body.verticalProfile.id);

    const updated = await agent
      .put(`${API_BASE_PATH}/vertical-profile`)
      .set('Origin', 'http://localhost:5173')
      .send({ ...validProfile, outreachTone: 'Warm and concise' })
      .expect(200);

    expect(updated.body.verticalProfile.version).toBe(2);
    expect(updated.body.verticalProfile.outreachTone).toBe('Warm and concise');
  });

  it('rejects invalid profile input', async () => {
    const agent = await loginAgent();

    await agent
      .put(`${API_BASE_PATH}/vertical-profile`)
      .set('Origin', 'http://localhost:5173')
      .send({ ...validProfile, targetRoles: [] })
      .expect(400);
  });

  it('rejects state changes from an untrusted origin', async () => {
    const agent = await loginAgent();

    await agent
      .put(`${API_BASE_PATH}/vertical-profile`)
      .set('Origin', 'https://attacker.example')
      .send(validProfile)
      .expect(403);
  });
});
