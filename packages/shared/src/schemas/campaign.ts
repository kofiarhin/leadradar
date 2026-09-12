import { z } from 'zod';

const linkedInPostUrlSchema = z
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['www.linkedin.com', 'linkedin.com'].includes(url.hostname.toLowerCase()) &&
        (url.pathname.includes('/posts/') || url.pathname.includes('/feed/update/'))
      );
    } catch {
      return false;
    }
  }, 'A supported public LinkedIn post URL is required.');

export const createCampaignRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  postUrl: linkedInPostUrlSchema,
});

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;
