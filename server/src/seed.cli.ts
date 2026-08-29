import { loadConfig } from './config/env';
import { connectToDatabase, disconnectFromDatabase } from './db/connection';
import { seedOwner } from './seed';

/**
 * `npm run seed` — explicit, idempotent owner initialization.
 *
 * Seeding is a command, never a side effect of application start-up, so a running
 * server can never silently reset a rotated password.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  await connectToDatabase(config.mongodbUri);

  try {
    const result = await seedOwner({
      workspaceName: 'LeadRadar',
      adminEmail: config.adminEmail,
      adminInitialPassword: config.adminInitialPassword,
    });

    // Reports the branch taken. Never echoes the password.
    console.log(
      result.created
        ? `Created workspace ${result.workspaceId} and admin ${result.adminEmail}.`
        : `Admin ${result.adminEmail} already exists; nothing was changed.`,
    );
  } finally {
    await disconnectFromDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
