import express from 'express';
import request from 'supertest';

import type { AppConfig } from '../../config/env';
import { MessageModel } from '../conversations/message.model';
import { evaluateOutreachPolicyForSend } from '../outreach-policy/outreach-policy.service';
import { OpportunityModel } from './opportunity.model';
import { ProspectModel } from '../prospects/prospect.model';
import { createOpportunityRouter } from './opportunity.routes';

jest.mock('./opportunity.model', () => ({
  OpportunityModel: { findOne: jest.fn(), find: jest.fn() },
}));

jest.mock('../prospects/prospect.model', () => ({
  ProspectModel: { findOne: jest.fn() },
}));

jest.mock('../conversations/message.model', () => ({
  MessageModel: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../outreach-policy/outreach-policy.service', () => ({
  evaluateOutreachPolicyForSend: jest.fn(),
}));

jest.mock('../../middleware/require-auth', () => ({
  authContext: () => ({ workspaceId: '507f1f77bcf86cd799439011' }),
}));

jest.mock('../../middleware/request-guards', () => ({
  createOriginGuard: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireJsonContentType: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const baseConfig = {
  nodeEnv: 'test',
  isProduction: false,
  port: 3000,
  appUrl: 'http://localhost:5173',
  mongodbUri: 'mongodb://localhost/test',
  sessionSecret: 'x'.repeat(32),
  adminEmail: 'owner@example.com',
  adminInitialPassword: 'password',
} as const;

const disabledConfig = {
  ...baseConfig,
  outboundMode: 'disabled',
} satisfies AppConfig;

const enabledConfig = {
  ...baseConfig,
  outboundMode: 'enabled',
  hunterApiKey: 'hunter-test',
  hunterEmailAccountId: 'account-test',
} satisfies AppConfig;

function mockOpportunityAndProspect(): void {
  jest.mocked(OpportunityModel.findOne).mockResolvedValue({
    _id: '507f1f77bcf86cd799439013',
    prospectId: '507f1f77bcf86cd799439012',
    conversationId: '507f1f77bcf86cd799439014',
    campaignId: '507f1f77bcf86cd799439015',
    status: 'READY_TO_REPLY',
  } as never);
  jest.mocked(ProspectModel.findOne).mockResolvedValue({
    _id: '507f1f77bcf86cd799439012',
    contact: { status: 'VERIFIED', normalizedEmail: 'buyer@example.com' },
    identity: { countryCode: 'FR', companyType: 'BUSINESS' },
  } as never);
}

describe('opportunity manual reply', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockOpportunityAndProspect();
    jest.mocked(MessageModel.findOne).mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    } as never);
  });

  it('fails closed when live outbound is disabled', async () => {
    const app = express();
    app.use('/opportunities', createOpportunityRouter(disabledConfig));

    const response = await request(app)
      .post('/opportunities/507f1f77bcf86cd799439013/reply')
      .send({ body: 'Reviewed reply' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUTBOUND_DISABLED');
  });

  it('rechecks outreach policy and refuses unresolved REVIEW immediately before send', async () => {
    jest.mocked(evaluateOutreachPolicyForSend).mockResolvedValue({
      decision: 'REVIEW',
      reasonCodes: ['JURISDICTION_REVIEW_REQUIRED'],
    });
    const app = express();
    app.use('/opportunities', createOpportunityRouter(enabledConfig));

    const response = await request(app)
      .post('/opportunities/507f1f77bcf86cd799439013/reply')
      .send({ body: 'Reviewed reply' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUTREACH_REVIEW_REQUIRED');
    expect(evaluateOutreachPolicyForSend).toHaveBeenCalledWith(expect.objectContaining({
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      allowExistingRelationship: true,
    }));
  });
});
