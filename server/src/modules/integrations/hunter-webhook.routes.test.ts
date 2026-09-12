import express from 'express';
import request from 'supertest';

import type { AppConfig } from '../../config/env';
import { createHunterWebhookRouter } from './hunter-webhook.routes';

function config(secret?: string): AppConfig {
  return {
    nodeEnv: 'test',
    isProduction: false,
    port: 3000,
    appUrl: 'http://localhost:5173',
    mongodbUri: 'mongodb://localhost/test',
    sessionSecret: 'x'.repeat(32),
    adminEmail: 'owner@example.com',
    adminInitialPassword: 'password',
    ...(secret ? { hunterWebhookSecret: secret } : {}),
    outboundMode: 'disabled',
  };
}

function appFor(secret?: string) {
  const app = express();
  app.use('/webhooks', createHunterWebhookRouter(config(secret)));
  return app;
}

describe('Hunter webhook authentication', () => {
  it('fails closed when webhook authentication is not configured', async () => {
    const result = await request(appFor()).post('/webhooks/hunter').send({});
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('HUNTER_WEBHOOK_NOT_CONFIGURED');
  });

  it('rejects an invalid shared secret before processing payload data', async () => {
    const result = await request(appFor('s'.repeat(32)))
      .post('/webhooks/hunter?token=wrong')
      .send({ event: 'message.replied' });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('INVALID_WEBHOOK_AUTH');
  });

  it('ignores authenticated non-reply events', async () => {
    const secret = 's'.repeat(32);
    const result = await request(appFor(secret))
      .post(`/webhooks/hunter?token=${secret}`)
      .send({ id: 'event-1', event: 'message.sent' });
    expect(result.status).toBe(202);
    expect(result.body).toMatchObject({ accepted: true, ignored: true });
  });
});
