import { apiRequest } from './client';

export interface OpportunityRow {
  _id: string;
  prospectId: string;
  status: string;
  intent: string;
  priority: string;
  confidence: number;
  summary: string;
  recommendedAction: string;
  draftReply?: string;
  bookedAt?: string;
}

export async function fetchOpportunities(): Promise<OpportunityRow[]> {
  const response = await apiRequest<{ opportunities: OpportunityRow[] }>('/opportunities');
  return response.opportunities;
}

export async function updateOpportunityStatus(id: string, status: string): Promise<OpportunityRow> {
  const response = await apiRequest<{ opportunity: OpportunityRow }>(`/opportunities/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return response.opportunity;
}

export async function sendOpportunityReply(
  id: string,
  input: { body: string; subject?: string },
): Promise<void> {
  await apiRequest(`/opportunities/${id}/reply`, {
    method: 'POST',
    body: input,
  });
}
