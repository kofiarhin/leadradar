import { HunterClient } from './hunter.client';

function response(body: unknown = { data: {} }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HunterClient sequence safety contracts', () => {
  it('cancels scheduled emails with the documented campaign recipient delete contract', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(response());
    const client = new HunterClient({ apiKey: 'test-key', fetchImpl });

    await client.cancelScheduledEmails('sequence-1', 'lead@example.com');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/campaigns/sequence-1/recipients');
    expect(init?.method).toBe('DELETE');
    expect(JSON.parse(String(init?.body))).toEqual({ emails: ['lead@example.com'] });
  });

  it('creates a sequence with the configured sending account', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      response({ data: { id: 42 } }, 201),
    );
    const client = new HunterClient({ apiKey: 'test-key', fetchImpl });

    const id = await client.createSequence('Campaign', 'sequence-key', [128]);

    expect(id).toBe('42');
    const [, init] = fetchImpl.mock.calls[0];
    expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'sequence-key' });
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Campaign',
      email_account_ids: [128],
    });
  });

  it('configures every reviewed sequence step in order', async () => {
    const fetchImpl = jest.fn<typeof fetch>()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response());
    const client = new HunterClient({ apiKey: 'test-key', fetchImpl });

    await client.configureSequence('sequence-1', [
      { order: 2, delayDays: 3, subject: 'Second', body: 'Follow up' },
      { order: 1, delayDays: 0, subject: 'First', body: 'Hello' },
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      step: 0,
      wait_days: 0,
      subject: 'First',
      body: 'Hello',
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toMatchObject({
      step: 1,
      wait_days: 3,
      subject: 'Second',
      body: 'Follow up',
    });
  });

  it('sends a reviewed reply with an explicit sender and idempotency key', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
      response({ data: { message_id: 'message-1' } }),
    );
    const client = new HunterClient({ apiKey: 'test-key', fetchImpl });

    const id = await client.sendManualReply({
      emailAccountId: 128,
      to: 'lead@example.com',
      subject: 'Re: Hello',
      body: 'Reviewed response',
      idempotencyKey: 'reply-key',
    });

    expect(id).toBe('message-1');
    const [, init] = fetchImpl.mock.calls[0];
    expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'reply-key' });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      email_account_id: 128,
      to: 'lead@example.com',
      subject: 'Re: Hello',
      body: 'Reviewed response',
    });
  });
});
