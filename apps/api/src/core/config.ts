import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  API_URL: z.url().default('http://localhost:4000'),
  WEB_URL: z.url().default('http://localhost:3000'),
  TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),
  /** Local-disk FileStorage root (receipts); defaults to apps/api/uploads. */
  UPLOADS_DIR: z.string().optional(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default('http://localhost:4000'),

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

  TEACHER_SHARE_PERCENT: z.coerce.number().min(0).max(100).default(60),
  EARNING_HOLD_DAYS: z.coerce.number().int().min(0).default(14),
  MIN_PAYOUT_AED: z.coerce.number().min(0).default(200),
  BANK_TRANSFER_HOLD_HOURS: z.coerce.number().int().min(1).default(48),
  VAT_PERCENT: z.coerce.number().min(0).max(100).default(5),
});

export type AppConfig = z.infer<typeof envSchema> & { trustedOrigins: string[] };

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  return {
    ...parsed.data,
    trustedOrigins: parsed.data.TRUSTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  };
}
