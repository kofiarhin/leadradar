import { JobModel } from './job.model';
import { claimNextJob } from './job.service';

describe('job claiming', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows a stale RUNNING job to be reclaimed while respecting max attempts', async () => {
    const findOneAndUpdate = jest.spyOn(JobModel, 'findOneAndUpdate').mockResolvedValue(null);

    await claimNextJob('worker-test');

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
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
