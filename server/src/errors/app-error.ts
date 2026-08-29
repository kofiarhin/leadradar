import { ERROR_CODES, type ErrorCode } from '@leadradar/shared';

/** An error with a deliberate public status, code, and message (docs/SPEC.md §16). */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: ErrorCode | string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * One message for a wrong password and for an unknown account, so a response never
 * discloses whether an email is registered.
 */
export function invalidCredentials(): AppError {
  return new AppError(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password.');
}

export function authRequired(): AppError {
  return new AppError(401, ERROR_CODES.AUTH_REQUIRED, 'Authentication is required.');
}

export function validationError(message = 'The request was not valid.'): AppError {
  return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message);
}

export function forbidden(message = 'The request was refused.'): AppError {
  return new AppError(403, ERROR_CODES.FORBIDDEN, message);
}
