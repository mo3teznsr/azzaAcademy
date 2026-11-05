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

  /** App Review demo accounts, comma-separated emails: may enter their batch's live room at any time (see DemoReviewers). */
  DEMO_REVIEWER_EMAILS: z.string().default(''),

  TEACHER_SHARE_PERCENT: z.coerce.number().min(0).max(100).default(60),
  EARNING_HOLD_DAYS: z.coerce.number().int().min(0).default(14),
  MIN_PAYOUT_AED: z.coerce.number().min(0).default(200),
  BANK_TRANSFER_HOLD_HOURS: z.coerce.number().int().min(1).default(48),
  VAT_PERCENT: z.coerce.number().min(0).max(100).default(5),
});

export const APPLE_ENVIRONMENTS = ['Production', 'Sandbox'] as const;
export type AppleEnvironment = (typeof APPLE_ENVIRONMENTS)[number];

export type AppConfig = z.infer<typeof envSchema> & { trustedOrigins: string[]; appleEnvironments: AppleEnvironment[] };

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
    trustedOrigins: parsed.data.TRUSTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  };
}
