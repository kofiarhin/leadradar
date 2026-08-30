import type {
  UpdateVerticalProfileRequest,
  VerticalProfileResponse,
} from '@leadradar/shared';

import { ApiError, apiRequest } from './client';

export async function fetchVerticalProfile(): Promise<VerticalProfileResponse['verticalProfile'] | null> {
  try {
    const response = await apiRequest<VerticalProfileResponse>('/vertical-profile');
    return response.verticalProfile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveVerticalProfile(
  input: UpdateVerticalProfileRequest,
): Promise<VerticalProfileResponse['verticalProfile']> {
  const response = await apiRequest<VerticalProfileResponse>('/vertical-profile', {
    method: 'PUT',
    body: input,
  });
  return response.verticalProfile;
}
