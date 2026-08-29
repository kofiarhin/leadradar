import { z } from 'zod';

/**
 * Login request shape, validated identically on both sides so the client cannot
 * submit something the server would reject for a different reason.
 */
export const loginRequestSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(1024),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
