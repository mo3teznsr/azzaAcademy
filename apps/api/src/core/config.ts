import { readFileSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  API_URL: z.url().default('http://localhost:4000'),
  WEB_URL: z.url().default('http://localhost:3000'),
  TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),
  /** Local-disk FileStorage root (receipts); defaults to apps/api/uploads. Used only when S3 is not configured. */
  UPLOADS_DIR: z.string().optional(),

  /** S3 + CloudFront FileStorage. Set S3_BUCKET and CLOUDFRONT_URL to enable (required in production). */
  AWS_REGION: z.string().default('me-central-1'),
  S3_BUCKET: z.string().optional(),
  CLOUDFRONT_URL: z.url().optional().or(z.literal('')),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default('http://localhost:4000'),
  /** Parent domain for the session cookie (e.g. `.azza.academy`) so the web app on another subdomain sees it. Empty = host-only. */
  COOKIE_DOMAIN: z.string().optional(),
  CLIENT_IP_HEADER: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Azza <no-reply@example.com>'),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  LIVEKIT_URL: z.string().default(''),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  /** Apple In-App Purchase (iOS seats). Environments whose signed transactions are accepted, comma-separated:
   * `Production`, `Sandbox` (TestFlight, App Review and sandbox testers). Production needs APPLE_APP_APPLE_ID. */
  APPLE_BUNDLE_ID: z.string().min(1).default('com.futuretech.azza'),
  APPLE_IAP_ENVIRONMENT: z.string().default('Sandbox'),
  APPLE_APP_APPLE_ID: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),

  /** App Store Connect API key (automatic App Store product setup). All optional: without them the sync is off.
   * The key is the .p8 file, by path (preferred) or inline with literal `\n` for newlines. */
  ASC_ISSUER_ID: z.string().optional(),
  ASC_KEY_ID: z.string().optional(),
  ASC_PRIVATE_KEY_PATH: z.string().optional(),
  ASC_PRIVATE_KEY: z.string().optional(),

  /** App Review demo accounts, comma-separated emails: may enter their batch's live room at any time (see DemoReviewers). */
  DEMO_REVIEWER_EMAILS: z.string().default(''),

  // TEACHER_SHARE_PERCENT is retired: teacher cuts are admin-editable (PlatformSettings). Old .env files may still set it; it is ignored.
  EARNING_HOLD_DAYS: z.coerce.number().int().min(0).default(14),
  MIN_PAYOUT_AED: z.coerce.number().min(0).default(200),
  BANK_TRANSFER_HOLD_HOURS: z.coerce.number().int().min(1).default(48),
  VAT_PERCENT: z.coerce.number().min(0).max(100).default(5),
});

export const APPLE_ENVIRONMENTS = ['Production', 'Sandbox'] as const;
export type AppleEnvironment = (typeof APPLE_ENVIRONMENTS)[number];

/** Credentials of the App Store Connect API, present only when everything needed is set and the key could be read. */
export interface AppStoreConnectConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
  appAppleId: string;
}

export type AppConfig = z.infer<typeof envSchema> & {
  trustedOrigins: string[];
  appleEnvironments: AppleEnvironment[];
  appStoreConnect: AppStoreConnectConfig | null;
};

/** Never throws: a missing or unreadable key just leaves the sync disabled. The key is never logged. */
export function resolveAppStoreConnect(
  env: Pick<z.infer<typeof envSchema>, 'ASC_ISSUER_ID' | 'ASC_KEY_ID' | 'ASC_PRIVATE_KEY_PATH' | 'ASC_PRIVATE_KEY' | 'APPLE_APP_APPLE_ID'>,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf8'),
): AppStoreConnectConfig | null {
  const issuerId = env.ASC_ISSUER_ID?.trim();
  const keyId = env.ASC_KEY_ID?.trim();
  if (!issuerId || !keyId || !env.APPLE_APP_APPLE_ID) return null;
  let privateKey: string | undefined;
  if (env.ASC_PRIVATE_KEY_PATH?.trim()) {
    try {
      privateKey = readFile(env.ASC_PRIVATE_KEY_PATH.trim());
    } catch {
      console.warn('[app-store] ASC_PRIVATE_KEY_PATH could not be read; App Store sync is disabled');
    }
  }
  if (!privateKey && env.ASC_PRIVATE_KEY?.trim()) privateKey = env.ASC_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (!privateKey?.includes('PRIVATE KEY')) return null;
  return { issuerId, keyId, privateKey, appAppleId: String(env.APPLE_APP_APPLE_ID) };
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  if (Boolean(parsed.data.S3_BUCKET) !== Boolean(parsed.data.CLOUDFRONT_URL)) {
    throw new Error('Invalid environment:\n  S3_BUCKET and CLOUDFRONT_URL must be set together');
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.S3_BUCKET) {
    throw new Error('Invalid environment:\n  S3_BUCKET and CLOUDFRONT_URL are required in production');
  }
  const appleEnvironments = parsed.data.APPLE_IAP_ENVIRONMENT.split(',').map((e) => e.trim()).filter(Boolean);
  const unknown = appleEnvironments.filter((e) => !(APPLE_ENVIRONMENTS as readonly string[]).includes(e));
  if (unknown.length) throw new Error(`Invalid environment:\n  APPLE_IAP_ENVIRONMENT: unknown ${unknown.join(', ')} (use Production and/or Sandbox)`);
  if (appleEnvironments.includes('Production') && !parsed.data.APPLE_APP_APPLE_ID) {
    throw new Error('Invalid environment:\n  APPLE_APP_APPLE_ID is required when APPLE_IAP_ENVIRONMENT includes Production');
  }
  return {
    ...parsed.data,
    appleEnvironments: appleEnvironments as AppleEnvironment[],
    appStoreConnect: resolveAppStoreConnect(parsed.data),
    trustedOrigins: parsed.data.TRUSTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  };
}
