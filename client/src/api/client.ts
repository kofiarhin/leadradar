import { API_BASE_PATH, type AppErrorResponse } from '@leadradar/shared';

/** An API response that carried a structured error envelope (docs/SPEC.md §16). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}

/**
 * The single place the client talks to the API.
 *
 * Components never call fetch directly; they consume the hooks built on top of this.
 * Credentials are always included so the session cookie travels with every request.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const envelope = payload as AppErrorResponse | undefined;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'UNKNOWN',
      envelope?.error?.message ?? 'Something went wrong.',
    );
  }

  return payload as T;
}
