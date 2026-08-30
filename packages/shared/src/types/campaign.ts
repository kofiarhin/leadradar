export type CampaignStatus =
  | 'DRAFT'
  | 'DISCOVERING'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'SENDING'
  | 'COMPLETED'
  | 'PARTIAL_FAILURE'
  | 'FAILED'
  | 'CANCELLED';

export type SequenceApprovalStatus =
  | 'NOT_GENERATED'
  | 'DRAFT'
  | 'APPROVED'
  | 'REAPPROVAL_REQUIRED';

export interface CampaignSequenceStepDto {
  order: number;
  delayDays: number;
  subject?: string;
  body: string;
}

export interface CampaignMetricsDto {
  signals: number;
  uniqueProspects: number;
  qualified: number;
  verified: number;
  eligible: number;
  contacted: number;
  replies: number;
  opportunities: number;
  readyToBook: number;
  booked: number;
}

export interface CampaignDto {
  id: string;
  workspaceId: string;
  verticalProfileId: string;
  verticalProfileVersion: number;
  name: string;
  source: { platform: 'LINKEDIN'; postUrl: string };
  status: CampaignStatus;
  discovery?: {
    provider: 'APIFY';
    runId?: string;
    startedAt?: string;
    completedAt?: string;
    errorCode?: string;
  };
  sequence: {
    approvalStatus: SequenceApprovalStatus;
    draftVersion: number;
    approvedVersion?: number;
    approvedAt?: string;
    steps: CampaignSequenceStepDto[];
  };
  metricsSnapshot: CampaignMetricsDto;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignResponse { campaign: CampaignDto }
export interface CampaignListResponse { campaigns: CampaignDto[] }
