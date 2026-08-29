import { connectToDatabase, disconnectFromDatabase } from './connection';

/**
 * MONGODB_URI is supplied by the in-memory MongoDB started in global setup, so this
 * exercises the same connection path the running server uses.
 */
describe('connectToDatabase', () => {
  afterEach(async () => {
    await disconnectFromDatabase();
  });

  it('establishes a ready connection using the configured URI', async () => {
    const uri = process.env.MONGODB_URI;
    expect(uri).toBeDefined();

    const connection = await connectToDatabase(uri as string);

    expect(connection.readyState).toBe(1);
  });

  it('rejects an unreachable database rather than resolving', async () => {
    await expect(
      connectToDatabase('mongodb://127.0.0.1:1/leadradar', { serverSelectionTimeoutMS: 200 }),
    ).rejects.toThrow();
  });
});
