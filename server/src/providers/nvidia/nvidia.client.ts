import { z } from 'zod';

export const NVIDIA_CONFIDENCE_THRESHOLD = 0.7;
export const NVIDIA_PROMPT_VERSION = 'v1-2026-09-11';
export const NVIDIA_SCHEMA_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 15_000;

const qualificationSchema = z.object({
  decision: z.enum(['QUALIFIED', 'REVIEW', 'REJECTED']),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(500),
});

const replySchema = z.object({
  intent: z.enum(['POSITIVE','QUESTION','LATER','REFERRAL','NEGATIVE','UNSUBSCRIBE','OUT_OF_OFFICE','REVIEW']),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(500),
  recommendedAction: z.enum(['REPLY','BOOK_CALL','FOLLOW_UP_LATER','STOP','REVIEW']),
});

const sequenceSchema = z.object({
  steps: z.array(z.object({
    order: z.number().int().min(1),
    delayDays: z.number().int().min(0),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(5000),
  })).min(2).max(3),
});

const draftReplySchema = z.object({ draft: z.string().trim().min(1).max(5000) });

export type QualificationResult = z.infer<typeof qualificationSchema>;
export type ReplyClassification = z.infer<typeof replySchema>;
export type SequenceDraft = z.infer<typeof sequenceSchema>;

export interface NvidiaClientOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  confidenceThreshold?: number;
}

export class NvidiaClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly confidenceThreshold: number;

  constructor(private readonly options: NvidiaClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://integrate.api.nvidia.com/v1';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.confidenceThreshold = options.confidenceThreshold ?? NVIDIA_CONFIDENCE_THRESHOLD;
  }

  async qualify(input: unknown): Promise<QualificationResult> {
    try {
      const result = await this.completeValidated(
        qualificationSchema,
        'Return prospect qualification JSON only with decision QUALIFIED, REVIEW, or REJECTED; confidence 0-1; and a short reason.',
        input,
      );
      if (result.confidence < this.confidenceThreshold) return { ...result, decision: 'REVIEW' };
      return result;
    } catch {
      return {
        decision: 'REVIEW',
        confidence: 0,
        reason: 'AI qualification was unavailable or invalid; human review required.',
      };
    }
  }

  async classifyReply(input: unknown): Promise<ReplyClassification> {
    try {
      const result = await this.completeValidated(
        replySchema,
        'Return reply classification JSON only with intent, confidence 0-1, summary, and recommendedAction limited to REPLY, BOOK_CALL, FOLLOW_UP_LATER, STOP, or REVIEW.',
        input,
      );
      if (result.confidence < this.confidenceThreshold) {
        return { ...result, intent: 'REVIEW', recommendedAction: 'REVIEW' };
      }
      return result;
    } catch {
      return {
        intent: 'REVIEW',
        confidence: 0,
        summary: 'AI classification was unavailable or invalid; human review required.',
        recommendedAction: 'REVIEW',
      };
    }
  }

  async draftSequence(input: unknown): Promise<SequenceDraft> {
    return this.completeValidated(
      sequenceSchema,
      'Return a 2-3 step outreach sequence JSON only.',
      input,
    );
  }

  async draftReply(input: unknown): Promise<string> {
    const value = await this.completeValidated(
      draftReplySchema,
      'Return JSON with a single string field named draft.',
      input,
    );
    return value.draft;
  }

  private async completeValidated<T>(schema: z.ZodType<T>, system: string, input: unknown): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const prompt = attempt === 0
          ? system
          : `${system} The previous response was invalid. Repair it and return only schema-valid JSON.`;
        return schema.parse(await this.complete(prompt, input));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('NVIDIA_INVALID_RESPONSE');
  }

  private async complete(system: string, input: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
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
    } catch (error) {
      if (controller.signal.aborted) throw new Error('NVIDIA_TIMEOUT');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
