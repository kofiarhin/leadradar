import { ERROR_CODES, type AppErrorResponse } from '@leadradar/shared';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error';

/**
 * Single exit point for every error response.
 *
 * Only an AppError's message reaches the client. Anything else becomes a generic 500,
 * so an internal message, a stack trace, or a secret-bearing driver error cannot leak.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? '';

  if (error instanceof AppError) {
    const body: AppErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  // Malformed JSON is surfaced by the body parser as a SyntaxError.
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'The request body was not valid JSON.',
        requestId,
      },
    } satisfies AppErrorResponse);
    return;
  }

  console.error(
    `[${requestId}] Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
  );

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Something went wrong.',
      requestId,
    },
  } satisfies AppErrorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      requestId: req.requestId ?? '',
    },
  } satisfies AppErrorResponse);
}
