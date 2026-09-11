import { ApifyClient } from './apify.client';

function response(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as Response;
}

describe('ApifyClient discovery normalization', () => {
  it('uses provider comment identity when available', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response([
      { commentId: 'comment-123', displayName: 'Ada Lovelace', commentText: 'Interested.' },
    ]));
    const client = new ApifyClient({ token: 'test', actorId: 'actor', fetchImpl });

    await expect(client.getDiscoveryItems('run-1', 'https://linkedin.com/posts/1')).resolves.toEqual([
      expect.objectContaining({ providerSignalId: 'comment-123' }),
    ]);
  });

  it('builds a stable fallback identity without using result position', async () => {
    const item = {
      displayName: 'Ada Lovelace',
      profileUrl: 'https://linkedin.com/in/ada',
      commentText: 'Interested in learning more about this.',
    };
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response([item, { displayName: 'Other Person', commentText: 'Other comment' }]))
      .mockResolvedValueOnce(response([{ displayName: 'Other Person', commentText: 'Other comment' }, item]));
    const client = new ApifyClient({ token: 'test', actorId: 'actor', fetchImpl });
    const postUrl = 'https://linkedin.com/posts/1';

    const first = await client.getDiscoveryItems('run-1', postUrl);
    const second = await client.getDiscoveryItems('run-2', postUrl);
    const firstId = first.find((value) => value.displayName === 'Ada Lovelace')?.providerSignalId;
    const secondId = second.find((value) => value.displayName === 'Ada Lovelace')?.providerSignalId;

    expect(firstId).toMatch(/^fallback:[a-f0-9]{64}$/);
    expect(secondId).toBe(firstId);
  });
});
