import { apiRequest } from './client';

export interface LeadRow {
  _id: string;
  identity: { displayName: string; role?: string; company?: string; linkedinUrl?: string };
  qualification: { status: string; reason?: string };
  contact: { status: string; businessEmail?: string };
  outreach: { status: string };
  latestIntent?: { intent: string; confidence: number };
}

export interface CampaignProspectRow {
  _id: string;
  campaignId: string;
  prospectId: string;
  qualificationDecision: string;
  outreachPolicyDecision?: string;
  suppressionDecision?: string;
  releaseStatus: string;
}

export interface ProspectSignal {
  _id: string;
  campaignId: string;
  content: string;
  source: { postUrl: string; profileUrl?: string };
  retentionClass: string;
  discoveredAt: string;
}

export interface ProspectCampaign {
  _id: string;
  name: string;
  status: string;
  source: { postUrl: string };
}

export interface ProspectMessage {
  _id: string;
  conversationId: string;
  direction: string;
  kind: string;
  subject?: string;
  bodyText: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
}

export interface ProspectDetailResponse {
  prospect: LeadRow;
  signals: ProspectSignal[];
  campaignProspects: CampaignProspectRow[];
  campaigns: ProspectCampaign[];
  conversations: Array<{ _id: string; providerThreadId?: string; lastMessageAt: string }>;
  messages: ProspectMessage[];
  opportunities: Array<{
    _id: string;
    status: string;
    intent: string;
    priority: string;
    summary: string;
    recommendedAction: string;
    draftReply?: string;
  }>;
}

export async function fetchLeads(params: URLSearchParams = new URLSearchParams()): Promise<LeadRow[]> {
  const query = params.toString();
  const response = await apiRequest<{ prospects: LeadRow[] }>(`/leads${query ? `?${query}` : ''}`);
  return response.prospects;
}

export async function fetchLead(prospectId: string): Promise<ProspectDetailResponse> {
  return apiRequest<ProspectDetailResponse>(`/leads/${prospectId}`);
}

export async function resolveQualificationReview(
  prospectId: string,
  campaignId: string,
  decision: 'QUALIFIED' | 'REJECTED',
): Promise<void> {
  await apiRequest(`/leads/${prospectId}/campaigns/${campaignId}/qualification-review`, {
    method: 'PATCH',
    body: { decision },
  });
}

export async function resolvePolicyReview(
  prospectId: string,
  campaignId: string,
  decision: 'ALLOWED' | 'BLOCKED',
): Promise<void> {
  await apiRequest(`/leads/${prospectId}/campaigns/${campaignId}/policy-review`, {
    method: 'PATCH',
    body: { decision },
  });
}
