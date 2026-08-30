export interface ApifyDiscoveryItem {
  providerSignalId: string;
  profileUrl?: string;
  displayName: string;
  commentText: string;
  occurredAt?: string;
  role?: string;
  company?: string;
}

export interface ApifyRun {
  id: string;
  status: string;
}

export interface ApifyClientOptions {
  token: string;
  actorId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ApifyClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: ApifyClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.apify.com/v2';
  }

  private url(path: string): string {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('token', this.options.token);
    return url.toString();
  }

  async startPublicCommentDiscovery(postUrl: string): Promise<ApifyRun> {
    const actorId = encodeURIComponent(this.options.actorId.replace('/', '~'));
    const response = await this.fetchImpl(this.url(`/acts/${actorId}/runs`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postUrls: [postUrl], urls: [postUrl], postUrl }),
    });
    if (!response.ok) throw new Error(`APIFY_START_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: string; status?: string } };
    if (!payload.data?.id) throw new Error('APIFY_INVALID_START_RESPONSE');
    return { id: payload.data.id, status: payload.data.status ?? 'READY' };
  }

  async getRun(runId: string): Promise<ApifyRun> {
    const response = await this.fetchImpl(this.url(`/actor-runs/${encodeURIComponent(runId)}`));
    if (!response.ok) throw new Error(`APIFY_RUN_${response.status}`);
    const payload = (await response.json()) as { data?: { id?: string; status?: string } };
    if (!payload.data?.id || !payload.data.status) throw new Error('APIFY_INVALID_RUN_RESPONSE');
    return { id: payload.data.id, status: payload.data.status };
  }

  async getDiscoveryItems(runId: string): Promise<ApifyDiscoveryItem[]> {
    const response = await this.fetchImpl(
      this.url(`/actor-runs/${encodeURIComponent(runId)}/dataset/items?clean=true`),
    );
    if (!response.ok) throw new Error(`APIFY_DATASET_${response.status}`);
    const payload = (await response.json()) as unknown[];
    return payload.flatMap((raw, index) => normalizeItem(raw, index));
  }
}

function normalizeItem(raw: unknown, index: number): ApifyDiscoveryItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const item = raw as Record<string, unknown>;
  const commentText = firstString(item, ['commentText', 'text', 'comment', 'content']);
  const displayName = firstString(item, ['displayName', 'authorName', 'name', 'author']);
  if (!commentText || !displayName) return [];
  const providerSignalId =
    firstString(item, ['commentId', 'id', 'urn']) ?? `${displayName}:${index}:${commentText.slice(0, 40)}`;
  return [{
    providerSignalId,
    displayName,
    commentText,
    ...(firstString(item, ['profileUrl', 'authorUrl', 'linkedinUrl'])
      ? { profileUrl: firstString(item, ['profileUrl', 'authorUrl', 'linkedinUrl']) }
      : {}),
    ...(firstString(item, ['createdAt', 'postedAt', 'timestamp'])
      ? { occurredAt: firstString(item, ['createdAt', 'postedAt', 'timestamp']) }
      : {}),
    ...(firstString(item, ['role', 'position', 'headline'])
      ? { role: firstString(item, ['role', 'position', 'headline']) }
      : {}),
    ...(firstString(item, ['company', 'companyName'])
      ? { company: firstString(item, ['company', 'companyName']) }
      : {}),
  }];
}

function firstString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
