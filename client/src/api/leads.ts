import { apiRequest } from './client';

export interface LeadRow {
  _id: string;
  identity: { displayName: string; role?: string; company?: string };
  qualification: { status: string; reason?: string };
  contact: { status: string; businessEmail?: string };
  outreach: { status: string };
  latestIntent?: { intent: string; confidence: number };
}

export async function fetchLeads(params: URLSearchParams = new URLSearchParams()): Promise<LeadRow[]> {
  const query = params.toString();
  const response = await apiRequest<{ prospects: LeadRow[] }>(`/leads${query ? `?${query}` : ''}`);
  return response.prospects;
}
