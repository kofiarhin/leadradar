import mongoose from 'mongoose';

import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection';

/** Connects to the in-memory MongoDB published by global setup. */
export async function connectTestDatabase(): Promise<void> {
  await connectToDatabase(process.env.MONGODB_URI as string);
}

/**
 * Empties every collection in the test database.
 *
 * Listed from the driver rather than from mongoose.connection.collections, because
 * connect-mongo creates `sessions` outside Mongoose and it would otherwise survive
 * between tests.
 */
export async function clearTestDatabase(): Promise<void> {
  const collections = await mongoose.connection.db?.collections();
  await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDatabase(): Promise<void> {
  await disconnectFromDatabase();
}
