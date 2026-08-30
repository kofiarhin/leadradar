import { randomUUID } from 'node:crypto';

import { loadConfig } from './config/env';
import { connectToDatabase, disconnectFromDatabase } from './db/connection';
import { recomputeCampaignMetrics } from './modules/campaigns/campaign-metrics.processor';
import { processReplyClassificationJob } from './modules/conversations/classification.processor';
import { processReplyJob } from './modules/conversations/reply.processor';
import { processEnrichmentJob } from './modules/enrichment/enrichment.processor';
import { processDiscoveryJob } from './modules/jobs/discovery.processor';
import { claimNextJob, completeJob, failJob } from './modules/jobs/job.service';
import { processOutreachPolicyJob } from './modules/outreach-policy/outreach-policy.processor';
import { processReleaseJob } from './modules/outreach/release.processor';
import { processQualificationJob } from './modules/qualification/qualification.processor';
import { applyRetention, ensureRetentionJobs, nextRetentionRunAt } from './modules/retention/retention.processor';

const config = loadConfig();
const workerId = `worker-${randomUUID()}`;
let stopping = false;

async function processOne(): Promise<boolean> {
  const job = await claimNextJob(workerId);
  if (!job) return false;

  try {
    if (job.type === 'INGEST_DISCOVERY_RESULTS') {
      await processDiscoveryJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'QUALIFY_PROSPECT') {
      await processQualificationJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'ENRICH_PROSPECT') {
      await processEnrichmentJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'EVALUATE_OUTREACH_POLICY') {
      await processOutreachPolicyJob(job.payload as Record<string, unknown>);
    } else if (job.type === 'RELEASE_CAMPAIGN_PROSPECT') {
      await processReleaseJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'PROCESS_REPLY') {
      await processReplyJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'CLASSIFY_REPLY') {
      await processReplyClassificationJob(job.payload as Record<string, unknown>, config);
    } else if (job.type === 'RECOMPUTE_CAMPAIGN_METRICS') {
      const campaignId = String((job.payload as Record<string, unknown>).campaignId ?? '');
      if (!campaignId) throw new Error('INVALID_METRICS_JOB');
      await recomputeCampaignMetrics(campaignId);
    } else if (job.type === 'APPLY_RETENTION') {
      const workspaceId = String((job.payload as Record<string, unknown>).workspaceId ?? '');
      if (!workspaceId) throw new Error('INVALID_RETENTION_JOB');
      await applyRetention(workspaceId);
    } else {
      throw new Error(`UNSUPPORTED_JOB_TYPE:${job.type}`);
    }

    await completeJob(job);
    if (job.type === 'APPLY_RETENTION') {
      await ensureRetentionJobs(nextRetentionRunAt());
    }
  } catch (error) {
    await failJob(job, error);
  }
  return true;
}

async function main(): Promise<void> {
  await connectToDatabase(config.mongodbUri);
  await ensureRetentionJobs();
  while (!stopping) {
    const processed = await processOne();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  await disconnectFromDatabase();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

void main().catch((error) => {
  console.error('Worker failed to start.', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
