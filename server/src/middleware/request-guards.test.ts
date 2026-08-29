import { API_BASE_PATH, ERROR_CODES } from '@leadradar/shared';
import request from 'supertest';

import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../test/db';
import { createApp } from '../app';
import { loadConfig } from '../config/env';
import { seedOwner } from '../seed';

const password = 'an-initial-password';
const email = 'owner@example.test';
const loginPath = `${API_BASE_PATH}/auth/login`;

const config = loadConfig();
const allowedOrigin = new URL(config.appUrl).origin;
const allowedHost = new URL(config.appUrl).host;

/** A fresh app gives each test its own rate-limiter state. */
function freshApp(max = 50) {
  return createApp(config, { loginRateLimit: { windowMs: 60_000, max } });
}

describe('state-changing request guards', () => {
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

  describe('origin validation', () => {
    it('accepts a login from the configured application origin', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Origin', allowedOrigin)
        .send({ email, password });

      expect(response.status).toBe(200);
    });

    it('rejects a login from an untrusted origin', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Origin', 'https://attacker.test')
        .send({ email, password });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(typeof response.body.error.requestId).toBe('string');
    });

    it('compares origins exactly, not by substring', async () => {
      const lookalikes = [
        `https://${allowedHost}.attacker.test`,
        `https://prefix-${allowedHost}`,
        `${allowedOrigin}.attacker.test`,
        `${allowedOrigin}@attacker.test`,
      ];

      for (const origin of lookalikes) {
        const response = await request(freshApp())
          .post(loginPath)
          .set('Origin', origin)
          .send({ email, password });

        expect([403, 200]).toContain(response.status);
        expect(response.status).toBe(403);
      }
    });

    it('rejects a cross-site request identified only by Sec-Fetch-Site', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ email, password });

      expect(response.status).toBe(403);
    });

    it('accepts same-origin and none Sec-Fetch-Site values', async () => {
      for (const value of ['same-origin', 'none']) {
        const response = await request(freshApp())
          .post(loginPath)
          .set('Sec-Fetch-Site', value)
          .send({ email, password });

        expect(response.status).toBe(200);
      }
    });

    it('allows a non-browser client that sends neither header', async () => {
      const response = await request(freshApp()).post(loginPath).send({ email, password });

      expect(response.status).toBe(200);
    });

    it('applies the same validation to logout', async () => {
      const response = await request(freshApp())
        .post(`${API_BASE_PATH}/auth/logout`)
        .set('Origin', 'https://attacker.test');

      expect(response.status).toBe(403);
    });

    it('rejects an untrusted origin without consuming a rate-limit attempt', async () => {
      const app = freshApp(2);

      // Three cross-site attempts would exhaust a limit of two if they counted.
      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post(loginPath)
          .set('Origin', 'https://attacker.test')
          .send({ email, password: 'wrong' })
          .expect(403);
      }

      const legitimate = await request(app).post(loginPath).send({ email, password });
      expect(legitimate.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('never exposes a cross-origin response', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Origin', allowedOrigin)
        .send({ email, password });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('exposes nothing to an untrusted origin either', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Origin', 'https://attacker.test')
        .send({ email, password });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('content type', () => {
    it('rejects a form-encoded login', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .type('form')
        .send({ email, password });

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('rejects a text/plain login', async () => {
      const response = await request(freshApp())
        .post(loginPath)
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({ email, password }));

      expect(response.status).toBe(415);
    });

    it('allows a bodyless request that sends no content type', async () => {
      // Logout carries no body; an HTML form always sets an enctype, so this is not a
      // form-submission vector, and origin validation still guards it.
      const response = await request(freshApp()).post(`${API_BASE_PATH}/auth/logout`);

      expect(response.status).toBe(204);
    });

    it('accepts an ordinary JSON login', async () => {
      const response = await request(freshApp()).post(loginPath).send({ email, password });

      expect(response.status).toBe(200);
    });
  });

  describe('login rate limiting', () => {
    it('throttles repeated failed logins', async () => {
      const app = freshApp(3);

      for (let i = 0; i < 3; i += 1) {
        await request(app).post(loginPath).send({ email, password: 'wrong' }).expect(401);
      }

      const limited = await request(app).post(loginPath).send({ email, password: 'wrong' });

      expect(limited.status).toBe(429);
      expect(limited.body.error.code).toBe(ERROR_CODES.RATE_LIMITED);
      expect(typeof limited.body.error.requestId).toBe('string');
    });

    it('throttles by attempt count regardless of whether the password was right', async () => {
      const app = freshApp(2);

      await request(app).post(loginPath).send({ email, password: 'wrong' }).expect(401);
      await request(app).post(loginPath).send({ email, password }).expect(200);

      const limited = await request(app).post(loginPath).send({ email, password });
      expect(limited.status).toBe(429);
    });
  });
});
