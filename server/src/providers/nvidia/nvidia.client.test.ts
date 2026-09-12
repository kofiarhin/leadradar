import { NvidiaClient } from './nvidia.client';

function response(content: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

describe('NvidiaClient', () => {
  it('accepts schema-valid qualification JSON above the confidence threshold', async () => {
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

  it('routes low-confidence qualification to REVIEW', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ decision: 'QUALIFIED', confidence: 0.69, reason: 'Weak signal.' })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.qualify({ prospect: 'context' })).resolves.toEqual({
      decision: 'REVIEW',
      confidence: 0.69,
      reason: 'Weak signal.',
    });
  });

  it('retries invalid qualification output once and accepts the repaired response', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ decision: 'MAYBE', confidence: 2, reason: '' })))
      .mockResolvedValueOnce(response(JSON.stringify({ decision: 'REJECTED', confidence: 0.9, reason: 'No fit.' })));
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.qualify({ prospect: 'context' })).resolves.toEqual({
      decision: 'REJECTED',
      confidence: 0.9,
      reason: 'No fit.',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails safe to REVIEW after two invalid qualification responses', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ decision: 'MAYBE', confidence: 2, reason: '' })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.qualify({ prospect: 'context' })).resolves.toEqual({
      decision: 'REVIEW',
      confidence: 0,
      reason: 'AI qualification was unavailable or invalid; human review required.',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('enforces the reply recommendedAction enum', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({
        intent: 'POSITIVE',
        confidence: 0.9,
        summary: 'Interested.',
        recommendedAction: 'DO_ANYTHING',
      })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.classifyReply({ body: 'Interested.' })).resolves.toEqual({
      intent: 'REVIEW',
      confidence: 0,
      summary: 'AI classification was unavailable or invalid; human review required.',
      recommendedAction: 'REVIEW',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('requires a 2-3 step sequence and retries once before failing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(JSON.stringify({ steps: [{ order: 1, delayDays: 0, subject: 'Hi', body: 'One message only' }] })),
    );
    const client = new NvidiaClient({ apiKey: 'test', model: 'model', fetchImpl });

    await expect(client.draftSequence({ campaign: 'context' })).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
