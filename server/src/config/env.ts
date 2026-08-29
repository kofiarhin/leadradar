import { z } from 'zod';

/** Minimum length for the session signing secret. */
const SESSION_SECRET_MIN_LENGTH = 32;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.url(),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(SESSION_SECRET_MIN_LENGTH),
  ADMIN_EMAIL: z.email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(1),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  appUrl: string;
  mongodbUri: string;
  sessionSecret: string;
  adminEmail: string;
  adminInitialPassword: string;
}

/**
 * Validates the environment and returns typed configuration.
 *
 * Errors name the offending variables only. Values are never included, because this
 * message reaches logs and a failed start-up is a common place for a secret to leak.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const variables = result.error.issues
      .map((issue) => String(issue.path[0]))
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort();

    throw new ConfigError(
      `Invalid or missing environment configuration: ${variables.join(', ')}. ` +
        'See .env.example for the expected values.',
    );
  }

  const parsed = result.data;

  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    port: parsed.PORT,
    appUrl: parsed.APP_URL,
    mongodbUri: parsed.MONGODB_URI,
    sessionSecret: parsed.SESSION_SECRET,
    adminEmail: parsed.ADMIN_EMAIL,
    adminInitialPassword: parsed.ADMIN_INITIAL_PASSWORD,
  };
}
