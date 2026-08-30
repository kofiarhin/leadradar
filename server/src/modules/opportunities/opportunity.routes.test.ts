import express from 'express';
import request from 'supertest';

import type { AppConfig } from '../../config/env';
import { OpportunityModel } from './opportunity.model';
import { ProspectModel } from '../prospects/prospect.model';
import { createOpportunityRouter } from './opportunity.routes';

jest.mock('./opportunity.model', () => ({
  OpportunityModel: { findOne: jest.fn(), find: jest.fn() },
}));

jest.mock('../prospects/prospect.model', () => ({
  ProspectModel: { findOne: jest.fn() },
}));

jest.mock('../../middleware/require-auth', () => ({
  authContext: () => ({ workspaceId: '507f1f77bcf86cd799439011' }),
}));

jest.mock('../../middleware/request-guards', () => ({
  createOriginGuard: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireJsonContentType: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const config = {
  nodeEnv: 'test',
  isProduction: false,
  port: 3000,
  appUrl: 'http://localhost:5173',
  mongodbUri: 'mongodb://localhost/test',
  sessionSecret: 'x'.repeat(32),
  adminEmail: 'owner@example.com',
  adminInitialPassword: 'password',
  outboundMode: 'disabled',
} satisfies AppConfig;

describe('opportunity manual reply', () => {
  it('fails closed when live outbound is disabled', async () => {
    jest.mocked(OpportunityModel.findOne).mockResolvedValue({
      _id: '507f1f77bcf86cd799439013',
      prospectId: '507f1f77bcf86cd799439012',
      conversationId: '507f1f77bcf86cd799439014',
      status: 'READY_TO_REPLY',
    } as never);
    jest.mocked(ProspectModel.findOne).mockResolvedValue({
      contact: { normalizedEmail: 'buyer@example.com' },
    } as never);

    const app = express();
    app.use('/opportunities', createOpportunityRouter(config));

    const response = await request(app)
      .post('/opportunities/507f1f77bcf86cd799439013/reply')
      .send({ body: 'Reviewed reply' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUTBOUND_DISABLED');
  });
});
