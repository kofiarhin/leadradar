import type {
  CampaignDto,
  CampaignListResponse,
  CampaignResponse,
  CreateCampaignRequest,
  UpdateSequenceRequest,
} from '@leadradar/shared';

import { apiRequest } from './client';

export interface CampaignProspectView {
  campaignProspect: {
    prospectId: string;
    qualificationDecision: string;
    outreachPolicyDecision?: string;
    suppressionDecision?: string;
    releaseStatus: string;
  };
  prospect?: {
    _id: string;
    identity: { displayName: string; role?: string; company?: string };
    qualification: { status: string; reason?: string };
    contact: { status: string; businessEmail?: string };
    outreach: { status: string };
  };
  primarySignal?: {
    _id: string;
    content: string;
    source: { postUrl: string };
  };
}

export async function createCampaign(input: CreateCampaignRequest): Promise<CampaignDto> {
  const response = await apiRequest<CampaignResponse>('/campaigns', { method: 'POST', body: input });
  return response.campaign;
}

export async function fetchCampaigns(): Promise<CampaignDto[]> {
  const response = await apiRequest<CampaignListResponse>('/campaigns');
  return response.campaigns;
}

export async function fetchCampaign(campaignId: string): Promise<CampaignDto> {
  const response = await apiRequest<CampaignResponse>(`/campaigns/${campaignId}`);
  return response.campaign;
}

export async function fetchCampaignProspects(campaignId: string): Promise<CampaignProspectView[]> {
  const response = await apiRequest<{ prospects: CampaignProspectView[] }>(`/campaigns/${campaignId}/prospects`);
  return response.prospects;
}

export async function generateCampaignSequence(campaignId: string): Promise<CampaignDto> {
  const response = await apiRequest<CampaignResponse>(`/campaigns/${campaignId}/sequence/generate`, {
    method: 'POST',
    body: {},
  });
  return response.campaign;
}

export async function updateCampaignSequence(
  campaignId: string,
  input: UpdateSequenceRequest,
): Promise<CampaignDto> {
  const response = await apiRequest<CampaignResponse>(`/campaigns/${campaignId}/sequence`, {
    method: 'PUT',
    body: input,
  });
  return response.campaign;
}

export async function approveCampaign(campaignId: string): Promise<CampaignDto> {
  const response = await apiRequest<CampaignResponse>(`/campaigns/${campaignId}/approve`, {
    method: 'POST',
    body: { approved: true },
  });
  return response.campaign;
}
