import { OutreachPolicyEvaluationModel } from './outreach-policy.model';
import {
  evaluateOutreachPolicy,
  evaluateOutreachPolicyForSend,
  OUTREACH_POLICY_VERSION,
} from './outreach-policy.service';
import { SuppressionModel } from '../suppression/suppression.model';
import { ProspectModel } from '../prospects/prospect.model';

jest.mock('../suppression/suppression.model', () => ({
  SuppressionModel: { findOne: jest.fn() },
}));

jest.mock('../prospects/prospect.model', () => ({
  ProspectModel: { findOne: jest.fn() },
}));

jest.mock('./outreach-policy.model', () => ({
  OutreachPolicyEvaluationModel: { findOne: jest.fn() },
}));

const suppressionFindOne = jest.mocked(SuppressionModel.findOne);
const prospectFindOne = jest.mocked(ProspectModel.findOne);
const evaluationFindOne = jest.mocked(OutreachPolicyEvaluationModel.findOne);

describe('evaluateOutreachPolicy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    suppressionFindOne.mockResolvedValue(null as never);
    prospectFindOne.mockResolvedValue({ outreach: { status: 'NOT_ELIGIBLE' } } as never);
    evaluationFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    } as never);
  });

  it('allows known business contacts in GB and US', async () => {
    await expect(evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'GB',
      companyType: 'BUSINESS',
    })).resolves.toEqual({ decision: 'ALLOWED', reasonCodes: ['AUTO_ALLOWED_REGION'] });

    await expect(evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'US',
      companyType: 'BUSINESS',
    })).resolves.toEqual({ decision: 'ALLOWED', reasonCodes: ['AUTO_ALLOWED_REGION'] });
  });

  it('routes unknown or non-allowed jurisdictions to REVIEW', async () => {
    await expect(evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      companyType: 'BUSINESS',
    })).resolves.toEqual({ decision: 'REVIEW', reasonCodes: ['UNKNOWN_JURISDICTION'] });

    await expect(evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'FR',
      companyType: 'BUSINESS',
    })).resolves.toEqual({ decision: 'REVIEW', reasonCodes: ['JURISDICTION_REVIEW_REQUIRED'] });
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
    prospectFindOne.mockResolvedValue({ outreach: { status: 'CONTACTED' } } as never);

    const result = await evaluateOutreachPolicy({
      workspaceId: '507f1f77bcf86cd799439011',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'GB',
      companyType: 'BUSINESS',
    });

    expect(result).toEqual({ decision: 'BLOCKED', reasonCodes: ['ACTIVE_RELATIONSHIP'] });
  });

  it('honors a current manual ALLOWED review when the automatic region rule returns REVIEW', async () => {
    evaluationFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ decision: 'ALLOWED' }) }),
    } as never);

    const result = await evaluateOutreachPolicyForSend({
      workspaceId: '507f1f77bcf86cd799439011',
      campaignId: '507f1f77bcf86cd799439013',
      prospectId: '507f1f77bcf86cd799439012',
      normalizedEmail: 'buyer@example.com',
      countryCode: 'FR',
      companyType: 'BUSINESS',
    });

    expect(result).toEqual({ decision: 'ALLOWED', reasonCodes: ['MANUAL_REVIEW_ALLOWED'] });
    expect(evaluationFindOne).toHaveBeenCalledWith(expect.objectContaining({
      policyVersion: `${OUTREACH_POLICY_VERSION}:manual-review`,
    }));
  });
});
