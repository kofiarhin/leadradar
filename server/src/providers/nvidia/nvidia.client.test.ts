import { NvidiaClient } from './nvidia.client';

function response(content: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

describe('NvidiaClient', () => {
  it('accepts schema-valid qualification JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ decision: 'QUALIFIED', confidence: 0.91, reason: 'Decision-maker with buying intent.' })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.qualify({ prospect: 'context' })).resolves.toEqual({
      decision: 'QUALIFIED',
      confidence: 0.91,
      reason: 'Decision-maker with buying intent.',
    });
  });

  it('rejects invalid qualification output instead of guessing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ decision: 'MAYBE', confidence: 2, reason: '' })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.qualify({ prospect: 'context' })).rejects.toThrow();
  });

  it('requires a 2-3 step sequence', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ steps: [{ order: 1, delayDays: 0, subject: 'Hi', body: 'One message only' }] })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.draftSequence({ campaign: 'context' })).rejects.toThrow();
  });
});
