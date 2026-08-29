import { API_BASE_PATH, ERROR_CODES } from '@leadradar/shared';
import mongoose from 'mongoose';
import request from 'supertest';

import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../test/db';
import { createApp } from '../../app';
import { seedOwner } from '../../seed';

const password = 'an-initial-password';
const email = 'owner@example.test';
const app = createApp();

async function seed(): Promise<void> {
  await seedOwner({
    workspaceName: 'LeadRadar',
    adminEmail: email,
    adminInitialPassword: password,
    scryptParams: { N: 1024, r: 8, p: 1 },
  });
}

describe('session lifecycle', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await seed();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('returns the authenticated owner for a valid session', async () => {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);

    const response = await agent.get(`${API_BASE_PATH}/auth/session`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
    expect(response.body.workspace.name).toBe('LeadRadar');
  });

  it('rejects a session read with no cookie', async () => {
    const response = await request(app).get(`${API_BASE_PATH}/auth/session`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
  });

  it('rejects a forged session cookie', async () => {
    const response = await request(app)
      .get(`${API_BASE_PATH}/auth/session`)
      .set('Cookie', 'leadradar.sid=s%3Anot-a-real-session-id.invalidsignature');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
  });

  it('regenerates the session identifier on login', async () => {
    const agent = request.agent(app);

    const first = await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password });
    const firstCookie = (first.headers['set-cookie'] as unknown as string[])[0];

    const second = await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password });
    const secondCookie = (second.headers['set-cookie'] as unknown as string[])[0];

    expect(firstCookie).toBeDefined();
    expect(secondCookie).toBeDefined();
    expect(secondCookie).not.toEqual(firstCookie);
  });

  it('ends the session on logout', async () => {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);

    const logout = await agent.post(`${API_BASE_PATH}/auth/logout`);
    expect(logout.status).toBe(204);

    const afterLogout = await agent.get(`${API_BASE_PATH}/auth/session`);
    expect(afterLogout.status).toBe(401);
  });

  it('removes the stored session record on logout', async () => {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);

    const sessions = mongoose.connection.collection('sessions');
    await expect(sessions.countDocuments()).resolves.toBeGreaterThan(0);

    await agent.post(`${API_BASE_PATH}/auth/logout`).expect(204);

    await expect(sessions.countDocuments()).resolves.toBe(0);
  });

  it('is idempotent when logging out without a session', async () => {
    const response = await request(app).post(`${API_BASE_PATH}/auth/logout`);

    expect(response.status).toBe(204);
  });

  it('treats a cookie whose stored record is gone as unauthenticated, not an error', async () => {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);

    await mongoose.connection.collection('sessions').deleteMany({});

    const response = await agent.get(`${API_BASE_PATH}/auth/session`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTH_REQUIRED);
  });

  it('rejects a session whose admin user no longer exists', async () => {
    const agent = request.agent(app);
    await agent.post(`${API_BASE_PATH}/auth/login`).send({ email, password }).expect(200);

    await mongoose.connection.collection('adminUsers').deleteMany({});

    const response = await agent.get(`${API_BASE_PATH}/auth/session`);
    expect(response.status).toBe(401);
  });
});
