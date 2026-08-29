import { ConfigError, loadConfig } from './env';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  APP_URL: 'http://localhost:5173',
  MONGODB_URI: 'mongodb://localhost:27017/leadradar',
  SESSION_SECRET: 'a-session-secret-that-is-long-enough-to-pass',
  ADMIN_EMAIL: 'owner@example.test',
  ADMIN_INITIAL_PASSWORD: 'an-initial-password',
};

describe('loadConfig', () => {
  it('returns a typed configuration for a valid environment', () => {
    const config = loadConfig(validEnv);

    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(3000);
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/leadradar');
    expect(config.adminEmail).toBe('owner@example.test');
  });

  it('rejects a missing MONGODB_URI and names the variable', () => {
    const { MONGODB_URI, ...withoutUri } = validEnv;

    expect(() => loadConfig(withoutUri)).toThrow(ConfigError);
    expect(() => loadConfig(withoutUri)).toThrow(/MONGODB_URI/);
  });

  it('rejects a SESSION_SECRET below the minimum length', () => {
    expect(() => loadConfig({ ...validEnv, SESSION_SECRET: 'too-short' })).toThrow(
      /SESSION_SECRET/,
    );
  });

  it('never includes a secret value in the error message', () => {
    const secret = 'short-but-identifiable-secret';

    try {
      loadConfig({ ...validEnv, SESSION_SECRET: secret, MONGODB_URI: '' });
      throw new Error('expected loadConfig to throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('SESSION_SECRET');
      expect(message).not.toContain(secret);
      expect(message).not.toContain(validEnv.ADMIN_INITIAL_PASSWORD);
    }
  });

  it('rejects an APP_URL that is not a valid URL', () => {
    expect(() => loadConfig({ ...validEnv, APP_URL: 'not-a-url' })).toThrow(/APP_URL/);
  });
});
