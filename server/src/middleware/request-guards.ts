import { ERROR_CODES } from '@leadradar/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { AppError, forbidden } from '../errors/app-error';
import type { AppConfig } from '../config/env';

/**
 * Cross-site request forgery defence.
 *
 * Origin validation is the primary control; the SameSite cookie attribute is defence
 * in depth behind it. Comparison is an exact match on the parsed origin, never a
 * substring or prefix test, so `https://app.example.com.attacker.test` cannot pass.
 */
export function createOriginGuard(config: AppConfig): RequestHandler {
  const allowedOrigins = new Set([new URL(config.appUrl).origin]);

  return function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
    const origin = req.get('origin');

    if (origin) {
      let parsed: string;
      try {
        parsed = new URL(origin).origin;
      } catch {
        next(forbidden('The request origin is not allowed.'));
        return;
      }

      next(allowedOrigins.has(parsed) ? undefined : forbidden('The request origin is not allowed.'));
      return;
    }

    // No Origin header. Browsers still describe the relationship here.
    const fetchSite = req.get('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      next(forbidden('The request origin is not allowed.'));
      return;
    }

    // Neither header: a non-browser client. CSRF needs a browser to attach the cookie.
    next();
  };
}

/**
 * Blocks the body types an HTML form can submit without script, so a cross-site form
 * post cannot reach a handler even if origin headers were somehow absent.
 *
 * A request carrying no Content-Type at all is allowed through: it has no body, and an
 * HTML form always sets an enctype, so it cannot be produced this way. Logout is the
 * ordinary case, and origin validation still applies to it.
 */
export function requireJsonContentType(req: Request, _res: Response, next: NextFunction): void {
  const contentType = req.get('content-type');

  if (contentType && !req.is('application/json')) {
    next(new AppError(415, ERROR_CODES.VALIDATION_ERROR, 'Requests must use application/json.'));
    return;
  }

  next();
}

export interface LoginRateLimitOptions {
  windowMs: number;
  max: number;
}

export const DEFAULT_LOGIN_RATE_LIMIT: LoginRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  max: 10,
};

/**
 * Login throttling (docs/SPEC.md §28).
 *
 * The default memory store is per-process, which suits the single-dyno V1 target. It
 * must become a shared store before the web process scales beyond one instance.
 */
export function createLoginRateLimiter(
  options: LoginRateLimitOptions = DEFAULT_LOGIN_RATE_LIMIT,
): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new AppError(429, ERROR_CODES.RATE_LIMITED, 'Too many attempts. Try again later.'),
      );
    },
  });
}
