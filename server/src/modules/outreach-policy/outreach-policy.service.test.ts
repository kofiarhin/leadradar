import { evaluateOutreachPolicy } from './outreach-policy.service';
import { SuppressionModel } from '../suppression/suppression.model';
import { ProspectModel } from '../prospects/prospect.model';

jest.mock('../suppression/suppression.model', () => ({
  SuppressionModel: { findOne: jest.fn() },
}));

jest.mock('../prospects/prospect.model', () => ({
  ProspectModel: { findOne: jest.fn() },
}));

const suppressionFindOne = jest.mocked(SuppressionModel.findOne);
const prospectFindOne = jest.mocked(ProspectModel.findOne);

describe('evaluateOutreachPolicy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    suppressionFindOne.mockResolvedValue(null as never);
    prospectFindOne.mockResolvedValue(null as never);
  });

  it('defaults unknown jurisdiction to REVIEW', async () => {
    const result = await evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
    });

    expect(result).toEqual({ decision: 'REVIEW', reasonCodes: ['UNKNOWN_JURISDICTION'] });
  });

  it('blocks a suppressed prospect before evaluating geography', async () => {
    suppressionFindOne.mockResolvedValue({ _id: 'suppression' } as never);

    const result = await evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'GB',
      companyType: 'BUSINESS',
    });

    expect(result).toEqual({ decision: 'BLOCKED', reasonCodes: ['SUPPRESSED'] });
  });

  it('blocks when another active outreach relationship exists', async () => {
    prospectFindOne.mockResolvedValue({ _id: 'active' } as never);

    const result = await evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'GB',
      companyType: 'BUSINESS',
    });

    expect(result).toEqual({ decision: 'BLOCKED', reasonCodes: ['ACTIVE_RELATIONSHIP'] });
  });
});
