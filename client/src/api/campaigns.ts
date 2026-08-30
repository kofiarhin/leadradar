import type {
  CampaignDto,
  CampaignListResponse,
  CampaignResponse,
  CreateCampaignRequest,
  UpdateSequenceRequest,
} from '@leadradar/shared';

import { apiRequest } from './client';

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
