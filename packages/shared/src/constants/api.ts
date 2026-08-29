/** Base prefix for every LeadRadar API route (docs/SPEC.md §8). */
export const API_BASE_PATH = '/api/v1';

/**
 * Stable error codes (docs/SPEC.md §16). Client copy may be friendlier, but these
 * codes are the contract that behaviour and tests depend on.
 */
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
