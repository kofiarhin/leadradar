import { JobModel } from './job.model';
import { buildJobIdempotencyKey, claimNextJob, enqueueJob } from './job.service';

describe('job service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the same deterministic key regardless of payload key order', () => {
    expect(buildJobIdempotencyKey('ENRICH_PROSPECT', { campaignId: 'c1', prospectId: 'p1' }))
      .toBe(buildJobIdempotencyKey('ENRICH_PROSPECT', { prospectId: 'p1', campaignId: 'c1' }));
  });

  it('upserts new jobs by idempotency key instead of creating duplicates', async () => {
    const updateOne = jest.spyOn(JobModel, 'updateOne').mockResolvedValue({ acknowledged: true } as never);

    await enqueueJob({
      workspaceId: '507f1f77bcf86cd799439011',
      type: 'ENRICH_PROSPECT',
      payload: { campaignId: 'campaign', prospectId: 'prospect' },
    });

    expect(updateOne).toHaveBeenCalledTimes(1);
    const filter = updateOne.mock.calls[0]?.[0];
    const update = updateOne.mock.calls[0]?.[1];
    const options = updateOne.mock.calls[0]?.[2];
    expect(filter).toEqual({ idempotencyKey: expect.stringMatching(/^ENRICH_PROSPECT:/) });
    expect(update).toMatchObject({
      $setOnInsert: {
        workspaceId: '507f1f77bcf86cd799439011',
        type: 'ENRICH_PROSPECT',
        idempotencyKey: expect.stringMatching(/^ENRICH_PROSPECT:/),
        payload: { campaignId: 'campaign', prospectId: 'prospect' },
      },
    });
    expect(options).toEqual({ upsert: true });
  });

  it('allows a stale RUNNING job to be reclaimed while respecting max attempts', async () => {
    const findOneAndUpdate = jest.spyOn(JobModel, 'findOneAndUpdate').mockResolvedValue(null);

    await claimNextJob('worker-test');

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const filter = findOneAndUpdate.mock.calls[0]?.[0];
    const update = findOneAndUpdate.mock.calls[0]?.[1];
    const options = findOneAndUpdate.mock.calls[0]?.[2];
    expect(filter).toMatchObject({
      $and: [
        {
          $or: [
            { status: 'PENDING', runAt: { $lte: expect.any(Date) } },
            { status: 'RUNNING', lockedAt: { $lte: expect.any(Date) } },
          ],
        },
        { $expr: { $lt: ['$attempts', '$maxAttempts'] } },
      ],
    });
    expect(update).toMatchObject({
      $set: { status: 'RUNNING', lockedAt: expect.any(Date), lockedBy: 'worker-test' },
      $inc: { attempts: 1 },
    });
    expect(options).toMatchObject({ new: true });
  });
});