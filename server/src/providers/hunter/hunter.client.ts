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

  private url(path: string, params: Record<string, string | undefined>): string {
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

  async createSequence(name: string): Promise<string> {
    const response = await this.fetchImpl(this.url('/sequences', {}), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`HUNTER_SEQUENCE_CREATE_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: number | string } };
    if (payload.data?.id === undefined) throw new Error('HUNTER_INVALID_SEQUENCE_RESPONSE');
    return String(payload.data.id);
  }

  async addSequenceRecipient(sequenceId: string, email: string): Promise<string> {
    const response = await this.fetchImpl(this.url(`/sequences/${encodeURIComponent(sequenceId)}/recipients`, {}), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(`HUNTER_RECIPIENT_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: number | string } };
    return String(payload.data?.id ?? email);
  }

  async cancelRecipient(sequenceId: string, recipientId: string): Promise<void> {
    const response = await this.fetchImpl(
      this.url(`/sequences/${encodeURIComponent(sequenceId)}/recipients/${encodeURIComponent(recipientId)}/cancel`, {}),
      { method: 'POST' },
    );
    if (!response.ok) throw new Error(`HUNTER_CANCEL_${response.status}`);
  }
}
