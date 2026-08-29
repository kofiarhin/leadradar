export interface VerticalProfileCompanySize {
  min?: number;
  max?: number;
}

export interface VerticalProfileDto {
  id: string;
  workspaceId: string;
  name: string;
  offer: string;
  targetRoles: string[];
  targetIndustries: string[];
  companySize?: VerticalProfileCompanySize;
  targetRegions: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  outreachGoal: 'BOOK_CALL';
  outreachTone: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface VerticalProfileResponse {
  verticalProfile: VerticalProfileDto;
}
