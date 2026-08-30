import { Types } from 'mongoose';

import { JobModel, type Job } from './job.model';

const JOB_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export async function enqueueJob(input: {
  workspaceId: string | Types.ObjectId;
  type: Job['type'];
  payload: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}): Promise<void> {
  await JobModel.create({
    workspaceId: input.workspaceId,
    type: input.type,
    payload: input.payload,
    ...(input.runAt ? { runAt: input.runAt } : {}),
    ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
  });
}

export async function claimNextJob(workerId: string): Promise<InstanceType<typeof JobModel> | null> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - JOB_LOCK_TIMEOUT_MS);
  return JobModel.findOneAndUpdate(
    {
      $and: [
        {
          $or: [
            { status: 'PENDING', runAt: { $lte: now } },
            { status: 'RUNNING', lockedAt: { $lte: staleBefore } },
          ],
        },
        { $expr: { $lt: ['$attempts', '$maxAttempts'] } },
      ],
    },
    {
      $set: { status: 'RUNNING', lockedAt: now, lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { runAt: 1, createdAt: 1 } },
  );
}

export async function completeJob(job: InstanceType<typeof JobModel>): Promise<void> {
  job.set({ status: 'SUCCEEDED', completedAt: new Date(), lockedAt: undefined, lockedBy: undefined });
  await job.save();
}

export async function failJob(job: InstanceType<typeof JobModel>, error: unknown): Promise<boolean> {
  const message = error instanceof Error ? error.message : 'Unknown job failure';
  const exhausted = job.attempts >= job.maxAttempts;
  job.set({
    status: exhausted ? 'DEAD' : 'PENDING',
    runAt: exhausted ? job.runAt : new Date(Date.now() + Math.min(60_000, 2 ** job.attempts * 1_000)),
    lastErrorCode: message.split(':')[0].slice(0, 120),
    lastErrorMessage: message.slice(0, 500),
    lockedAt: undefined,
    lockedBy: undefined,
  });
  await job.save();
  return exhausted;
}
