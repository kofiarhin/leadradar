import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  var __MONGO_SERVER__: MongoMemoryServer | undefined;
}

/**
 * Starts an in-memory MongoDB and publishes its URI as MONGODB_URI.
 *
 * The application reads MONGODB_URI through its normal configuration path, so no
 * test-specific persistence branch exists in runtime code. Every other value the
 * config requires is set here to a test-only placeholder; none is a real secret.
 */
export default async function globalSetup(): Promise<void> {
  const server = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = server;

  process.env.MONGODB_URI = server.getUri('leadradar-test');
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.PORT = process.env.PORT ?? '3000';
  process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? 'test-session-secret-value-not-a-real-secret';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'owner@example.test';
  process.env.ADMIN_INITIAL_PASSWORD =
    process.env.ADMIN_INITIAL_PASSWORD ?? 'test-initial-password';
}
