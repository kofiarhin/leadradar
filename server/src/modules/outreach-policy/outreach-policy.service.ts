import { SuppressionModel } from '../suppression/suppression.model';
import { ProspectModel } from '../prospects/prospect.model';

export const OUTREACH_POLICY_VERSION = 'v1-2026-08-30';

export interface OutreachPolicyResult {
  decision: 'ALLOWED' | 'REVIEW' | 'BLOCKED';
  reasonCodes: string[];
}

export async function evaluateOutreachPolicy(input: {
  workspaceId: unknown;
  prospectId: unknown;
  normalizedEmail?: string;
  countryCode?: string;
  companyType?: string;
}): Promise<OutreachPolicyResult> {
  const reasons: string[] = [];

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

  if (['CONTACTED', 'PAUSED', 'REPLIED'].includes(prospect.outreach.status)) {
    return { decision: 'BLOCKED', reasonCodes: ['ACTIVE_RELATIONSHIP'] };
  }

  if (!input.countryCode) reasons.push('UNKNOWN_JURISDICTION');
  if (!input.companyType) reasons.push('UNKNOWN_COMPANY_TYPE');

  if (reasons.length > 0) return { decision: 'REVIEW', reasonCodes: reasons };

  // V1 intentionally does not encode legal advice. This policy only allows clearly
  // identified business prospects in configured jurisdictions; unknown facts stay REVIEW.
  return { decision: 'ALLOWED', reasonCodes: ['BUSINESS_CONTACT_IDENTIFIED'] };
}
