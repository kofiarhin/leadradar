import type { Types } from 'mongoose';

import { ProspectModel } from '../prospects/prospect.model';
import { SuppressionModel } from '../suppression/suppression.model';
import { OutreachPolicyEvaluationModel } from './outreach-policy.model';

export const OUTREACH_POLICY_VERSION = 'v1-2026-09-11-gb-us';
const AUTO_ALLOWED_COUNTRIES = new Set(['GB', 'US']);

export interface OutreachPolicyInput {
  workspaceId: string | Types.ObjectId;
  prospectId: string | Types.ObjectId;
  normalizedEmail?: string;
  countryCode?: string;
  companyType?: string;
  allowExistingRelationship?: boolean;
}

export interface OutreachPolicyResult {
  decision: 'ALLOWED' | 'REVIEW' | 'BLOCKED';
  reasonCodes: string[];
}

export async function evaluateOutreachPolicy(input: OutreachPolicyInput): Promise<OutreachPolicyResult> {
  const suppression = await SuppressionModel.findOne({
    workspaceId: input.workspaceId,
    $or: [
      ...(input.normalizedEmail ? [{ normalizedEmail: input.normalizedEmail }] : []),
      { prospectId: input.prospectId },
    ],
  });
  if (suppression) return { decision: 'BLOCKED', reasonCodes: ['SUPPRESSED'] };

  const prospect = await ProspectModel.findOne({ _id: input.prospectId, workspaceId: input.workspaceId });
  if (!prospect) return { decision: 'BLOCKED', reasonCodes: ['PROSPECT_NOT_FOUND'] };

  if (
    !input.allowExistingRelationship &&
    ['CONTACTED', 'PAUSED', 'REPLIED'].includes(prospect.outreach?.status ?? '')
  ) {
    return { decision: 'BLOCKED', reasonCodes: ['ACTIVE_RELATIONSHIP'] };
  }

  const reasonCodes: string[] = [];
  const countryCode = input.countryCode?.trim().toUpperCase();
  const companyType = input.companyType?.trim();

  if (!countryCode) reasonCodes.push('UNKNOWN_JURISDICTION');
  else if (!AUTO_ALLOWED_COUNTRIES.has(countryCode)) reasonCodes.push('JURISDICTION_REVIEW_REQUIRED');
  if (!companyType) reasonCodes.push('UNKNOWN_COMPANY_TYPE');

  if (reasonCodes.length > 0) return { decision: 'REVIEW', reasonCodes };
  return { decision: 'ALLOWED', reasonCodes: ['AUTO_ALLOWED_REGION'] };
}

export async function evaluateOutreachPolicyForSend(input: OutreachPolicyInput & {
  campaignId?: string | Types.ObjectId;
}): Promise<OutreachPolicyResult> {
  const deterministic = await evaluateOutreachPolicy(input);
  if (deterministic.decision === 'BLOCKED') return deterministic;

  let manualReview: { decision?: string } | null = null;
  if (input.campaignId) {
    manualReview = await OutreachPolicyEvaluationModel.findOne({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      policyVersion: `${OUTREACH_POLICY_VERSION}:manual-review`,
    })
      .sort({ evaluatedAt: -1 })
      .lean();
  }

  if (manualReview?.decision === 'BLOCKED') {
    return { decision: 'BLOCKED', reasonCodes: ['MANUAL_REVIEW_BLOCKED'] };
  }
  if (deterministic.decision === 'ALLOWED') return deterministic;
  if (manualReview?.decision === 'ALLOWED') {
    return { decision: 'ALLOWED', reasonCodes: ['MANUAL_REVIEW_ALLOWED'] };
  }
  return deterministic;
}
