import { JobModel } from '../jobs/job.model';
import { enqueueJob } from '../jobs/job.service';
import { SignalModel } from '../signals/signal.model';
import { WorkspaceModel } from '../workspaces/workspace.model';

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function applyRetention(workspaceId: string, now: Date = new Date()): Promise<void> {
  await SignalModel.deleteMany({
    workspaceId,
    retentionClass: 'REJECTED_TEMPORARY',
    expiresAt: { $lte: now },
  });
}

export async function ensureRetentionJobs(runAt: Date = new Date()): Promise<void> {
  const workspaces = await WorkspaceModel.find({}).select('_id').lean();
  await Promise.all(
    workspaces.map(async (workspace) => {
      const existing = await JobModel.exists({
        workspaceId: workspace._id,
        type: 'APPLY_RETENTION',
        status: { $in: ['PENDING', 'RUNNING'] },
      });
      if (!existing) {
        const workspaceId = workspace._id.toString();
        const scheduledFor = runAt.toISOString();
        await enqueueJob({
          workspaceId: workspace._id,
          type: 'APPLY_RETENTION',
          idempotencyKey: `APPLY_RETENTION:${workspaceId}:${scheduledFor}`,
          payload: { workspaceId, scheduledFor },
          runAt,
        });
      }
    }),
  );
}

export function nextRetentionRunAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + RETENTION_INTERVAL_MS);
}
