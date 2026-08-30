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
  APIFY_TOKEN: z.string().min(1).optional(),
  APIFY_ACTOR_ID: z.string().min(1).optional(),
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_MODEL: z.string().min(1).optional(),
  HUNTER_API_KEY: z.string().min(1).optional(),
  HUNTER_EMAIL_ACCOUNT_ID: z.string().min(1).optional(),
  HUNTER_WEBHOOK_SECRET: z.string().min(24).optional(),
  OUTBOUND_MODE: z.enum(['disabled', 'enabled']).default('disabled'),
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
  apifyToken?: string;
  apifyActorId?: string;
  nvidiaApiKey?: string;
  nvidiaModel?: string;
  hunterApiKey?: string;
  hunterEmailAccountId?: string;
  hunterWebhookSecret?: string;
  outboundMode: 'disabled' | 'enabled';
}

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
    ...(parsed.APIFY_TOKEN ? { apifyToken: parsed.APIFY_TOKEN } : {}),
    ...(parsed.APIFY_ACTOR_ID ? { apifyActorId: parsed.APIFY_ACTOR_ID } : {}),
    ...(parsed.NVIDIA_API_KEY ? { nvidiaApiKey: parsed.NVIDIA_API_KEY } : {}),
    ...(parsed.NVIDIA_MODEL ? { nvidiaModel: parsed.NVIDIA_MODEL } : {}),
    ...(parsed.HUNTER_API_KEY ? { hunterApiKey: parsed.HUNTER_API_KEY } : {}),
    ...(parsed.HUNTER_EMAIL_ACCOUNT_ID ? { hunterEmailAccountId: parsed.HUNTER_EMAIL_ACCOUNT_ID } : {}),
    ...(parsed.HUNTER_WEBHOOK_SECRET ? { hunterWebhookSecret: parsed.HUNTER_WEBHOOK_SECRET } : {}),
    outboundMode: parsed.OUTBOUND_MODE,
  };
}
