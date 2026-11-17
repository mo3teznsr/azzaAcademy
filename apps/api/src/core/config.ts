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

  /**
   * Sign in with Google (optional; off unless both are set). From Google Cloud Console → APIs & Services → Credentials →
   * "OAuth client ID" of type *Web application*. Its "Authorized redirect URI" must be `${BETTER_AUTH_URL}/api/auth/callback/google`
   * (e.g. https://api.azza.academy/api/auth/callback/google) and its "Authorized JavaScript origin" the web app (WEB_URL).
   */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Extra Google OAuth client ids (comma-separated) whose ID tokens are accepted, for native sign-in from the iOS and Android apps. */
  GOOGLE_NATIVE_CLIENT_IDS: z.string().default(''),

  /**
   * Sign in with Apple (optional; off unless the Services ID, team, key id and key are all set). From Apple Developer →
   * Certificates, Identifiers & Profiles:
   * - APPLE_SIGNIN_CLIENT_ID: a *Services ID* (e.g. `academy.azza.signin`) with Sign in with Apple enabled, its domain set to the
   *   API host and its Return URL to `${BETTER_AUTH_URL}/api/auth/callback/apple`.
   * - APPLE_TEAM_ID: the 10-character Team ID (top right of the developer account).
   * - APPLE_SIGNIN_KEY_ID + the key: a *Key* with "Sign in with Apple" enabled, downloaded once as a .p8. Give it by path
   *   (preferred) or inline with literal `\n` for newlines. The client secret is signed from it at runtime (no expiry to manage).
   * ID tokens from the iOS app (audience = APPLE_BUNDLE_ID) are accepted too.
   */
  APPLE_SIGNIN_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_SIGNIN_KEY_ID: z.string().optional(),
  APPLE_SIGNIN_PRIVATE_KEY_PATH: z.string().optional(),
  APPLE_SIGNIN_PRIVATE_KEY: z.string().optional(),

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

  /**
   * Adaptive streaming of lesson videos through Bunny Stream (optional; off unless the library id, API key and CDN host are
   * set — lessons then play their uploaded MP4). See `BunnyStreamTranscoder` for the setup. The webhook is verified with the
   * read-only API key; the token key signs playback URLs when the library's pull zone has token authentication on.
   */
  BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
  BUNNY_STREAM_API_KEY: z.string().optional(),
  BUNNY_STREAM_READONLY_API_KEY: z.string().optional(),
  BUNNY_STREAM_CDN_HOST: z.string().optional(),
  BUNNY_STREAM_TOKEN_KEY: z.string().optional(),
  /** Send a lesson's video to the transcoder as soon as it is saved (else only via the admin action / backfill). */
  VIDEO_TRANSCODE_ON_UPLOAD: z.enum(['true', 'false']).default('true'),
  /** Hourly job that sends lessons uploaded before streaming was set up, a few at a time (the admin backfill does it on demand). */
  VIDEO_TRANSCODE_BACKFILL: z.enum(['true', 'false']).default('false'),
  /** Offline lesson downloads play at most this many days without the app re-checking access online. */
  OFFLINE_DOWNLOAD_MAX_DAYS: z.coerce.number().int().min(1).max(90).default(30),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /**
   * Teacher payouts through a provider (off by default: the payout CSV and "mark paid" stay the way). `stripe_connect`
   * sends each READY payout of an approved run to the teacher's Stripe connected account and pays it out to their UAE
   * bank in AED. Uses STRIPE_PAYOUTS_SECRET_KEY, else STRIPE_SECRET_KEY. The Connect webhook endpoint
   * (`/api/webhooks/payouts`, events payout.paid/failed/canceled/updated on connected accounts) has its own secret.
   */
  PAYOUT_PROVIDER: z.enum(['none', 'stripe_connect']).default('none'),
  STRIPE_PAYOUTS_SECRET_KEY: z.string().optional(),
  STRIPE_PAYOUTS_WEBHOOK_SECRET: z.string().optional(),

  /** Tabby "pay in 4" (UAE). The method is offered only when the secret key and merchant code are set.
   * `sk_test_…` keys hit Tabby's test environment on the same base URL. The public key is not used by the
   * API (no Tabby JS on the web) but is kept with the others. Webhooks are registered with
   * `header: { title: TABBY_WEBHOOK_HEADER, value: TABBY_WEBHOOK_SECRET }` and verified by that header. */
  TABBY_SECRET_KEY: z.string().optional(),
  TABBY_PUBLIC_KEY: z.string().optional(),
  TABBY_MERCHANT_CODE: z.string().optional(),
  TABBY_WEBHOOK_SECRET: z.string().optional(),
  TABBY_WEBHOOK_HEADER: z.string().min(1).default('X-Tabby-Webhook-Secret'),
  TABBY_API_URL: z.url().default('https://api.tabby.ai'),

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
  /** Apple's App Store commission on in-app purchases, in percent of the price before VAT (15 = Small Business Program). */
  APPLE_COMMISSION_PERCENT: z.coerce.number().int().min(0).max(30).default(15),
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

/** Social sign-in providers that are fully configured; `null` = that button is hidden and the provider is off. */
export interface SocialAuthConfig {
  google: { clientIds: string[]; clientSecret: string } | null;
  apple: { clientId: string; teamId: string; keyId: string; privateKey: string; audience: string[] } | null;
}

export type AppConfig = z.infer<typeof envSchema> & {
  trustedOrigins: string[];
  appleEnvironments: AppleEnvironment[];
  appStoreConnect: AppStoreConnectConfig | null;
  socialAuth: SocialAuthConfig;
};

const csv = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/** Never throws: a provider with missing pieces (or an unreadable Apple key) is simply off. Keys are never logged. */
export function resolveSocialAuth(
  env: Pick<
    z.infer<typeof envSchema>,
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
    | 'GOOGLE_NATIVE_CLIENT_IDS'
    | 'APPLE_SIGNIN_CLIENT_ID'
    | 'APPLE_TEAM_ID'
    | 'APPLE_SIGNIN_KEY_ID'
    | 'APPLE_SIGNIN_PRIVATE_KEY_PATH'
    | 'APPLE_SIGNIN_PRIVATE_KEY'
    | 'APPLE_BUNDLE_ID'
  >,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf8'),
): SocialAuthConfig {
  const googleId = env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  // The web client id comes first: better-auth uses the first one for the redirect flow, all of them as ID-token audiences.
  const google = googleId && googleSecret ? { clientIds: [...new Set([googleId, ...csv(env.GOOGLE_NATIVE_CLIENT_IDS)])], clientSecret: googleSecret } : null;

  const clientId = env.APPLE_SIGNIN_CLIENT_ID?.trim();
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_SIGNIN_KEY_ID?.trim();
  let privateKey: string | undefined;
  if (clientId && teamId && keyId) {
    if (env.APPLE_SIGNIN_PRIVATE_KEY_PATH?.trim()) {
      try {
        privateKey = readFile(env.APPLE_SIGNIN_PRIVATE_KEY_PATH.trim());
      } catch {
        console.warn('[auth] APPLE_SIGNIN_PRIVATE_KEY_PATH could not be read; Sign in with Apple is off');
      }
    }
    if (!privateKey && env.APPLE_SIGNIN_PRIVATE_KEY?.trim()) privateKey = env.APPLE_SIGNIN_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  const apple =
    clientId && teamId && keyId && privateKey?.includes('PRIVATE KEY')
      ? { clientId, teamId, keyId, privateKey, audience: [...new Set([clientId, env.APPLE_BUNDLE_ID])] }
      : null;
  return { google, apple };
}

/** Bunny Stream transcoding is on only with a library id, an API key and the CDN host. */
export const bunnyStreamConfigured = (c: Pick<AppConfig, 'BUNNY_STREAM_LIBRARY_ID' | 'BUNNY_STREAM_API_KEY' | 'BUNNY_STREAM_CDN_HOST'>) =>
  !!(c.BUNNY_STREAM_LIBRARY_ID?.trim() && c.BUNNY_STREAM_API_KEY?.trim() && c.BUNNY_STREAM_CDN_HOST?.trim());

/** Tabby is offered only with a secret key and a merchant code. */
export const tabbyConfigured = (c: Pick<AppConfig, 'TABBY_SECRET_KEY' | 'TABBY_MERCHANT_CODE'>) => !!(c.TABBY_SECRET_KEY?.trim() && c.TABBY_MERCHANT_CODE?.trim());

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
  if (parsed.data.TABBY_SECRET_KEY && parsed.data.TABBY_MERCHANT_CODE && !parsed.data.TABBY_WEBHOOK_SECRET && parsed.data.NODE_ENV === 'production') {
    throw new Error('Invalid environment:\n  TABBY_WEBHOOK_SECRET is required when Tabby is configured');
  }
  if (bunnyStreamConfigured(parsed.data) && !parsed.data.BUNNY_STREAM_READONLY_API_KEY && parsed.data.NODE_ENV === 'production') {
    throw new Error('Invalid environment:\n  BUNNY_STREAM_READONLY_API_KEY is required when Bunny Stream is configured (it verifies webhooks)');
  }
  if (appleEnvironments.includes('Production') && !parsed.data.APPLE_APP_APPLE_ID) {
    throw new Error('Invalid environment:\n  APPLE_APP_APPLE_ID is required when APPLE_IAP_ENVIRONMENT includes Production');
  }
  return {
    ...parsed.data,
    appleEnvironments: appleEnvironments as AppleEnvironment[],
    appStoreConnect: resolveAppStoreConnect(parsed.data),
    socialAuth: resolveSocialAuth(parsed.data),
    trustedOrigins: parsed.data.TRUSTED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  };
}
