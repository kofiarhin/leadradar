import type {
  CampaignDto,
  CampaignListResponse,
  CampaignResponse,
  CreateCampaignRequest,
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
