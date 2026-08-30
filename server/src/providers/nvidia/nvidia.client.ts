import { z } from 'zod';

const qualificationSchema = z.object({
  decision: z.enum(['QUALIFIED', 'REVIEW', 'REJECTED']),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(500),
});

const replySchema = z.object({
  intent: z.enum(['POSITIVE','QUESTION','LATER','REFERRAL','NEGATIVE','UNSUBSCRIBE','OUT_OF_OFFICE','REVIEW']),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(500),
  recommendedAction: z.string().trim().min(1).max(500),
});

const sequenceSchema = z.object({
  steps: z.array(z.object({
    order: z.number().int().min(1),
    delayDays: z.number().int().min(0),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(5000),
  })).min(2).max(3),
});

export type QualificationResult = z.infer<typeof qualificationSchema>;
export type ReplyClassification = z.infer<typeof replySchema>;
export type SequenceDraft = z.infer<typeof sequenceSchema>;

export interface NvidiaClientOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class NvidiaClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: NvidiaClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://integrate.api.nvidia.com/v1';
  }

  async qualify(input: unknown): Promise<QualificationResult> {
    return qualificationSchema.parse(await this.complete('Return prospect qualification JSON only.', input));
  }

  async classifyReply(input: unknown): Promise<ReplyClassification> {
    return replySchema.parse(await this.complete('Return reply classification JSON only.', input));
  }

  async draftSequence(input: unknown): Promise<SequenceDraft> {
    return sequenceSchema.parse(await this.complete('Return a 2-3 step outreach sequence JSON only.', input));
  }

  async draftReply(input: unknown): Promise<string> {
    const value = await this.complete('Return JSON with a single string field named draft.', input);
    return z.object({ draft: z.string().trim().min(1).max(5000) }).parse(value).draft;
  }

  private async complete(system: string, input: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) throw new Error(`NVIDIA_${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('NVIDIA_EMPTY_RESPONSE');
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error('NVIDIA_INVALID_JSON');
    }
  }
}
