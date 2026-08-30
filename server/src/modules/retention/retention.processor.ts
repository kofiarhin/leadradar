import { SignalModel } from '../signals/signal.model';

export async function applyRetention(now: Date = new Date()): Promise<void> {
  await SignalModel.deleteMany({
    retentionClass: 'REJECTED_TEMPORARY',
    expiresAt: { $lte: now },
  });
}
