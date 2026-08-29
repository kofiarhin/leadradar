import MongoStore from 'connect-mongo';
import type { RequestHandler } from 'express';
import session from 'express-session';
import mongoose from 'mongoose';

import type { AppConfig } from '../config/env';

declare module 'express-session' {
  interface SessionData {
    adminUserId?: string;
    workspaceId?: string;
  }
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Resolves the underlying MongoClient once the Mongoose connection is actually open.
 *
 * The app is built before the database connection is opened (server.ts connects, and
 * tests connect in setup), so this waits for the `connected` event rather than reading
 * a client that does not exist yet.
 */
type MongooseMongoClient = ReturnType<typeof mongoose.connection.getClient>;

function mongoClientPromise(): Promise<MongooseMongoClient> {
  const connection = mongoose.connection;

  if (connection.readyState === 1) {
    return Promise.resolve(connection.getClient());
  }

  return new Promise((resolve, reject) => {
    connection.once('connected', () => resolve(connection.getClient()));
    connection.once('error', reject);
  });
}

/**
 * Server-side sessions stored in MongoDB.
 *
 * Required rather than preferred: docs/PRD.md §13 demands server-verifiable session
 * data, and docs/SPEC.md notes session state must not depend on local process memory
 * because the web process may scale past one instance. The store reuses the Mongoose
 * connection rather than opening a second pool.
 */
export function createSessionMiddleware(config: AppConfig): RequestHandler {
  const store = MongoStore.create({
    // connect-mongo resolves its own copy of the mongodb driver, so the client Mongoose
    // hands us is the same object at runtime but a nominally different type (the two
    // declarations carry separate private fields). This is the single boundary where
    // that difference is bridged; the session round-trip is covered by tests.
    clientPromise: mongoClientPromise() as unknown as Parameters<
      typeof MongoStore.create
    >[0]['clientPromise'],
    ttl: SESSION_TTL_SECONDS,
    collectionName: 'sessions',
  });

  return session({
    name: 'leadradar.sid',
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: config.isProduction,
      maxAge: SESSION_TTL_SECONDS * 1000,
    },
  });
}
