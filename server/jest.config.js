/**
 * Server test configuration.
 *
 * `globalSetup` starts an in-memory MongoDB and exports its connection string as
 * MONGODB_URI, so the suite exercises the ordinary runtime connection path with
 * no external database, no credentials, and no network.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.typecheck.json' }],
  },
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
