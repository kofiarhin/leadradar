import mongoose, { type Connection, type ConnectOptions } from 'mongoose';

/**
 * Opens the application's MongoDB connection.
 *
 * There is no test-aware branch here by design: the test suite supplies MONGODB_URI
 * from an in-memory MongoDB, so tests exercise this exact path.
 */
export async function connectToDatabase(
  uri: string,
  options: ConnectOptions = {},
): Promise<Connection> {
  await mongoose.connect(uri, options);
  return mongoose.connection;
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
