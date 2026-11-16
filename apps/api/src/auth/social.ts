import { createPrivateKey, sign } from 'node:crypto';
import { getOAuthState } from 'better-auth/api';
import { LOCALES, cleanAttribution, type Locale } from '@azza/shared';
import type { SocialAuthConfig } from '../core/config';

/**
 * Sign in with Google and Apple.
 *
 * Phone rule: email sign-up still needs a valid phone (see `createUserHooks`). A social sign-up cannot ask for one inside the
 * provider's flow, so it creates the account without a phone; the web app asks for it once, on the first checkout or plan
 * purchase (`PhoneGate`), through `PATCH /api/v1/me`, which validates it like every other phone.
 *
 * Linking: better-auth's defaults are kept on purpose. A Google/Apple identity joins an existing account with the same email only
 * when the provider says the email is verified AND the local account has verified its email too, so an unverified password
 * account (or an unverified provider email) can never take over or be taken over. No provider is "trusted" (that would skip the
 * provider's own `email_verified`).
 */

export type SocialProviderId = 'google' | 'apple';

/** Which providers the sign-in and sign-up pages should show. */
export function enabledSocialProviders(social: SocialAuthConfig): Record<SocialProviderId, boolean> {
  return { google: !!social.google, apple: !!social.apple };
}

/** Endpoints through which a provider can create a user: the redirect callback, and `/sign-in/social` with a native ID token. */
export function isSocialSignUpPath(path: string | undefined): boolean {
  return !!path && (path.startsWith('/callback/') || path === '/sign-in/social');
}

/** Only the email sign-up asks for a phone up front; social sign-ups give it before their first purchase. */
export function phoneRequiredAtSignUp(path: string | undefined): boolean {
  return path === '/sign-up/email';
}

const APPLE_SECRET_TTL = 60 * 60 * 24 * 180; // Apple accepts at most six months.
const APPLE_SECRET_RENEW_BEFORE = 60 * 60 * 24 * 30;

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

/** The Apple "client secret": an ES256 JWT signed with the Sign in with Apple key. */
export function appleClientSecret(apple: NonNullable<SocialAuthConfig['apple']>, nowSec = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: apple.keyId }));
  const payload = b64url(JSON.stringify({ iss: apple.teamId, iat: nowSec, exp: nowSec + APPLE_SECRET_TTL, aud: 'https://appleid.apple.com', sub: apple.clientId }));
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: createPrivateKey(apple.privateKey), dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(signature)}`;
}

/** Hands out a valid Apple client secret, signing a fresh one when the current one has less than 30 days left. */
export function appleSecretSource(apple: NonNullable<SocialAuthConfig['apple']>, now: () => number = () => Math.floor(Date.now() / 1000)) {
  let secret = '';
  let expiresAt = 0;
  return () => {
    const t = now();
    if (!secret || expiresAt - t < APPLE_SECRET_RENEW_BEFORE) {
      secret = appleClientSecret(apple, t);
      expiresAt = t + APPLE_SECRET_TTL;
    }
    return secret;
  };
}

/** better-auth `socialProviders` for whatever is configured, plus the origins Apple's form-post callback needs. */
export function socialAuthOptions(social: SocialAuthConfig) {
  const socialProviders: Record<string, unknown> = {};
  const trustedOrigins: string[] = [];
  if (social.google) {
    socialProviders.google = {
      clientId: social.google.clientIds,
      clientSecret: social.google.clientSecret,
      prompt: 'select_account',
    };
  }
  if (social.apple) {
    const secret = appleSecretSource(social.apple);
    socialProviders.apple = {
      clientId: social.apple.clientId,
      // Read on every authorization-code exchange, so a long-running server renews it before Apple's six-month limit.
      get clientSecret() {
        return secret();
      },
      audience: social.apple.audience,
    };
    trustedOrigins.push('https://appleid.apple.com');
  }
  return { socialProviders, trustedOrigins };
}

/** What the client may pass along a social sign-up (`additionalData`); all of it is untrusted and checked here. */
export interface SocialSignUpInput {
  additionalData?: unknown;
  acceptLanguage?: string | null;
}

export interface SocialSignUpProfile {
  locale?: Locale;
  timezone?: string;
  displayCurrency?: string;
  /** First-touch attribution, stored as JSON like the email sign-up does. */
  acquisition?: string;
}

const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/** First supported language in an Accept-Language header, by quality. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const tags = header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { lang: (tag ?? '').trim().toLowerCase().split('-')[0] ?? '', q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((t) => t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return tags.map((t) => t.lang).find(isLocale);
}

function validTimezone(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v || v.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat('en', { timeZone: v });
    return v;
  } catch {
    return undefined;
  }
}

/** locale / timezone / currency / first-touch attribution for a new social user: what the page sent when valid, else the browser language. */
export async function socialSignUpProfile(input: SocialSignUpInput, isSelectable: (code: string) => Promise<boolean>): Promise<SocialSignUpProfile> {
  const data = (input.additionalData && typeof input.additionalData === 'object' ? input.additionalData : {}) as Record<string, unknown>;
  const out: SocialSignUpProfile = {};
  const locale = isLocale(data.locale) ? data.locale : localeFromAcceptLanguage(input.acceptLanguage);
  if (locale) out.locale = locale;
  const timezone = validTimezone(data.timezone);
  if (timezone) out.timezone = timezone;
  const code = typeof data.displayCurrency === 'string' ? data.displayCurrency.trim().toUpperCase() : '';
  if (/^[A-Z]{3}$/.test(code) && (await isSelectable(code))) out.displayCurrency = code;
  const acquisition = cleanAttribution(data.acquisition);
  if (acquisition) out.acquisition = JSON.stringify(acquisition);
  return out;
}

interface HookContext {
  path?: string;
  body?: unknown;
  headers?: Headers;
  request?: Request;
}

/**
 * `databaseHooks.user.create.before`: a user created by Google or Apple is always a STUDENT, never takes a phone from the
 * provider, and gets locale/timezone/currency and first-touch attribution from the page (the redirect flow keeps them in the OAuth state, the native ID-token
 * flow sends them in the body) or the browser's language. Email sign-ups and server-side creations pass through untouched.
 */
export function createSocialSignUpHook(isSelectable: (code: string) => Promise<boolean> = async () => true, readState: () => Promise<unknown> = getOAuthState) {
  return async (_user: Record<string, unknown>, ctx: HookContext | null) => {
    if (!ctx || !isSocialSignUpPath(ctx.path)) return;
    const additionalData = ctx.path === '/sign-in/social' ? (ctx.body as { additionalData?: unknown } | undefined)?.additionalData : await readState().catch(() => null);
    const acceptLanguage = ctx.headers?.get('accept-language') ?? ctx.request?.headers.get('accept-language') ?? null;
    const profile = await socialSignUpProfile({ additionalData, acceptLanguage }, isSelectable);
    // better-auth merges this over the user it was about to create (a provider never supplies a phone).
    return { data: { ...profile, role: 'STUDENT' } };
  };
}
