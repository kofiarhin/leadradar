import type { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown(): Promise<void> {
  const server = globalThis.__MONGO_SERVER__ as MongoMemoryServer | undefined;
  await server?.stop();
}
