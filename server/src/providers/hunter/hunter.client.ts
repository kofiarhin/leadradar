export interface HunterFinderResult {
  email?: string;
  score?: number;
  status?: string;
  linkedinUrl?: string;
}

export interface HunterVerificationResult {
  status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
  score?: number;
}

export interface HunterSequenceStepInput {
  order: number;
  delayDays: number;
  subject?: string;
  body: string;
}

export interface HunterSequenceState {
  id: string;
  status?: string;
  started?: boolean;
  paused?: boolean;
  archived?: boolean;
}

export interface HunterClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class HunterClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: HunterClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.hunter.io/v2';
  }

  private url(path: string, params: Record<string, string | undefined> = {}): string {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    url.searchParams.set('api_key', this.options.apiKey);
    return url.toString();
  }

  async findBusinessEmail(input: {
    firstName?: string;
    lastName?: string;
    domain?: string;
    linkedinUrl?: string;
  }): Promise<HunterFinderResult> {
    const response = await this.fetchImpl(
      this.url('/email-finder', {
        first_name: input.firstName,
        last_name: input.lastName,
        domain: input.domain,
        linkedin: input.linkedinUrl,
      }),
    );
    if (!response.ok) throw new Error(`HUNTER_FINDER_${response.status}`);
    const payload = (await response.json()) as { data?: Record<string, unknown> };
    const data = payload.data ?? {};
    return {
      ...(typeof data.email === 'string' ? { email: data.email } : {}),
      ...(typeof data.score === 'number' ? { score: data.score } : {}),
      ...(typeof data.status === 'string' ? { status: data.status } : {}),
      ...(typeof data.linkedin_url === 'string' ? { linkedinUrl: data.linkedin_url } : {}),
    };
  }

  async verifyEmail(email: string): Promise<HunterVerificationResult> {
    const response = await this.fetchImpl(this.url('/email-verifier', { email }));
    if (!response.ok && response.status !== 202) throw new Error(`HUNTER_VERIFY_${response.status}`);
    const payload = (await response.json()) as { data?: Record<string, unknown> };
    const status = payload.data?.status;
    if (!['valid','invalid','accept_all','webmail','disposable','unknown'].includes(String(status))) {
      throw new Error('HUNTER_INVALID_VERIFY_RESPONSE');
    }
    return {
      status: status as HunterVerificationResult['status'],
      ...(typeof payload.data?.score === 'number' ? { score: payload.data.score as number } : {}),
    };
  }

  async createSequence(name: string, idempotencyKey?: string): Promise<string> {
    const response = await this.fetchImpl(this.url('/sequences'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_CREATE_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: number | string } };
    if (payload.data?.id === undefined) throw new Error('HUNTER_INVALID_SEQUENCE_RESPONSE');
    return String(payload.data.id);
  }

  async addSequenceStep(sequenceId: string, step: HunterSequenceStepInput): Promise<void> {
    const response = await this.fetchImpl(
      this.url(`/sequences/${encodeURIComponent(sequenceId)}/follow-ups`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: step.order - 1,
          wait_days: step.delayDays,
          subject: step.subject ?? '',
          body: step.body,
          message_format: 'text',
        }),
      },
    );
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_STEP_${response.status}`);
  }

  async configureSequence(sequenceId: string, steps: HunterSequenceStepInput[]): Promise<void> {
    for (const step of [...steps].sort((a, b) => a.order - b.order)) {
      await this.addSequenceStep(sequenceId, step);
    }
  }

  async addSequenceRecipient(sequenceId: string, email: string): Promise<string> {
    const response = await this.fetchImpl(
      this.url(`/campaigns/${encodeURIComponent(sequenceId)}/recipients`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email] }),
      },
    );
    if (!response.ok) throw new Error(`HUNTER_RECIPIENT_${response.status}`);
    const payload = (await response.json()) as {
      data?: { skipped_recipients?: Array<{ email?: string; reason?: string }> };
    };
    const skipped = payload.data?.skipped_recipients?.find(
      (value) => value.email?.toLowerCase() === email.toLowerCase(),
    );
    if (skipped && skipped.reason !== 'duplicate') {
      throw new Error(`HUNTER_RECIPIENT_SKIPPED:${skipped.reason ?? 'unknown'}`);
    }
    return email;
  }

  async cancelScheduledEmails(sequenceId: string, email: string): Promise<void> {
    const response = await this.fetchImpl(
      this.url(`/campaigns/${encodeURIComponent(sequenceId)}/recipients`),
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email] }),
      },
    );
    if (!response.ok) throw new Error(`HUNTER_CANCEL_${response.status}`);
  }

  async startSequence(sequenceId: string): Promise<void> {
    const response = await this.fetchImpl(
      this.url(`/campaigns/${encodeURIComponent(sequenceId)}/start`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_START_${response.status}`);
  }

  async pauseSequence(sequenceId: string): Promise<void> {
    const response = await this.fetchImpl(
      this.url(`/sequences/${encodeURIComponent(sequenceId)}/pause`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_PAUSE_${response.status}`);
  }

  async getSequence(sequenceId: string): Promise<HunterSequenceState> {
    const response = await this.fetchImpl(this.url(`/sequences/${encodeURIComponent(sequenceId)}`));
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_GET_${response.status}`);
    const payload = (await response.json()) as {
      data?: { id?: string | number; status?: string; started?: boolean; paused?: boolean; archived?: boolean };
    };
    if (payload.data?.id === undefined) throw new Error('HUNTER_INVALID_SEQUENCE_GET_RESPONSE');
    return {
      id: String(payload.data.id),
      ...(typeof payload.data.status === 'string' ? { status: payload.data.status } : {}),
      ...(typeof payload.data.started === 'boolean' ? { started: payload.data.started } : {}),
      ...(typeof payload.data.paused === 'boolean' ? { paused: payload.data.paused } : {}),
      ...(typeof payload.data.archived === 'boolean' ? { archived: payload.data.archived } : {}),
    };
  }

  async getPendingMessageCount(sequenceId: string): Promise<number> {
    const response = await this.fetchImpl(
      this.url('/messages', { status: 'pending', sequence_id: sequenceId, limit: '1' }),
    );
    if (!response.ok) throw new Error(`HUNTER_MESSAGES_${response.status}`);
    const payload = (await response.json()) as { data?: { messages?: unknown[] } };
    return payload.data?.messages?.length ?? 0;
  }

  async sendManualReply(input: {
    emailAccountId: string;
    to: string;
    subject: string;
    body: string;
    idempotencyKey: string;
  }): Promise<string> {
    const response = await this.fetchImpl(this.url('/messages'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        email_account_id: input.emailAccountId,
        to: input.to,
        subject: input.subject,
        body: input.body,
        message_format: 'text',
      }),
    });
    if (!response.ok) throw new Error(`HUNTER_MANUAL_REPLY_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: number | string } };
    if (payload.data?.id === undefined) throw new Error('HUNTER_INVALID_MANUAL_REPLY_RESPONSE');
    return String(payload.data.id);
  }
}
