import { createApp } from './app';
import { loadConfig } from './config/env';
import { connectToDatabase } from './db/connection';

/**
 * Web process entry point. The only place that opens a port.
 *
 * Configuration is validated and the database connection established before the server
 * accepts traffic, so a misconfigured deploy fails loudly instead of serving errors.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  await connectToDatabase(config.mongodbUri);

  const app = createApp(config);
  app.listen(config.port, () => {
    console.log(`LeadRadar API listening on port ${config.port} (${config.nodeEnv}).`);
  });
}

main().catch((error: unknown) => {
  console.error(
    `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
