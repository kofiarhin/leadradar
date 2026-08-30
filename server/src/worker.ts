import { randomUUID } from 'node:crypto';

import { loadConfig } from './config/env';
import { connectToDatabase, disconnectFromDatabase } from './db/connection';
import { processDiscoveryJob } from './modules/jobs/discovery.processor';
import { claimNextJob, completeJob, failJob } from './modules/jobs/job.service';
import { processQualificationJob } from './modules/qualification/qualification.processor';

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
    } else {
      throw new Error(`UNSUPPORTED_JOB_TYPE:${job.type}`);
    }
    await completeJob(job);
  } catch (error) {
    await failJob(job, error);
  }
  return true;
}

async function main(): Promise<void> {
  await connectToDatabase(config.mongodbUri);
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
