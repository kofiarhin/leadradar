import { createHash } from 'node:crypto';
import { Types } from 'mongoose';

import { JobModel, type Job } from './job.model';

const JOB_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function buildJobIdempotencyKey(type: Job['type'], payload: Record<string, unknown>): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(canonicalize(payload)))
    .digest('hex');
  return `${type}:${digest}`;
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);
}

export async function enqueueJob(input: {
  workspaceId: string | Types.ObjectId;
  type: Job['type'];
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  runAt?: Date;
  maxAttempts?: number;
}): Promise<void> {
  const idempotencyKey = input.idempotencyKey ?? buildJobIdempotencyKey(input.type, input.payload);
  try {
    await JobModel.updateOne(
      { idempotencyKey },
      {
        $setOnInsert: {
          workspaceId: input.workspaceId,
          type: input.type,
          idempotencyKey,
          payload: input.payload,
          runAt: input.runAt ?? new Date(),
          ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (isDuplicateKey(error)) return;
    throw error;
  }
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
