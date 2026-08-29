import { API_BASE_PATH, ERROR_CODES } from '@leadradar/shared';
import request from 'supertest';

import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../test/db';
import { createApp } from '../../app';
import { seedOwner } from '../../seed';

const password = 'an-initial-password';
const email = 'owner@example.test';
const scryptParams = { N: 1024, r: 8, p: 1 };

const app = createApp();

async function seed(): Promise<void> {
  await seedOwner({
    workspaceName: 'LeadRadar',
    adminEmail: email,
    adminInitialPassword: password,
    scryptParams,
  });
}

describe('POST /auth/login', () => {
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

  it('authenticates the seeded owner and sets an HttpOnly session cookie', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
    expect(response.body.workspace.name).toBe('LeadRadar');

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toMatch(/HttpOnly/i);
  });

  it('never exposes the password hash or the plaintext password', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email, password });

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('scrypt$');
    expect(body).not.toContain(password);
  });

  it('accepts the email in any case', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email: 'OWNER@Example.Test', password });

    expect(response.status).toBe(200);
  });

  it('returns an identical failure for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email, password: 'not-the-password' });

    const unknownEmail = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email: 'nobody@example.test', password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    expect(unknownEmail.body.error.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(Object.keys(wrongPassword.body.error).sort()).toEqual(
      Object.keys(unknownEmail.body.error).sort(),
    );
  });

  it('does not set a session cookie on a failed login', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email, password: 'not-the-password' });

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects a malformed body with VALIDATION_ERROR and a requestId', async () => {
    const response = await request(app).post(`${API_BASE_PATH}/auth/login`).send({ email });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(typeof response.body.error.requestId).toBe('string');
    expect(response.body.error.requestId.length).toBeGreaterThan(0);
  });

  it('rejects a body that is valid JSON of the wrong shape', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email: 'not-an-email', password: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('does not echo the submitted password in a validation error', async () => {
    const response = await request(app)
      .post(`${API_BASE_PATH}/auth/login`)
      .send({ email: 'not-an-email', password: 'secret-value-here' });

    expect(JSON.stringify(response.body)).not.toContain('secret-value-here');
  });
});
