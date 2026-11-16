import { describe, expect, test } from 'bun:test';
import { generateKeyPairSync, verify } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createUserHooks } from '../src/auth/auth';
import {
  appleClientSecret,
  appleSecretSource,
  createSocialSignUpHook,
  enabledSocialProviders,
  isSocialSignUpPath,
  localeFromAcceptLanguage,
  phoneRequiredAtSignUp,
  socialAuthOptions,
  socialSignUpProfile,
} from '../src/auth/social';
import { resolveSocialAuth } from '../src/core/config';

const { privateKey: P256 } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PEM = P256.export({ type: 'pkcs8', format: 'pem' }).toString();
const apple = { clientId: 'academy.azza.signin', teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: PEM, audience: ['academy.azza.signin', 'com.futuretech.azza'] };
const noEnv = { APPLE_BUNDLE_ID: 'com.futuretech.azza', GOOGLE_NATIVE_CLIENT_IDS: '' };

describe('social sign-in config', () => {
  test('each provider is off until all its pieces are set', () => {
    expect(resolveSocialAuth(noEnv)).toEqual({ google: null, apple: null });
    expect(resolveSocialAuth({ ...noEnv, GOOGLE_CLIENT_ID: 'web' }).google).toBeNull();
    expect(resolveSocialAuth({ ...noEnv, APPLE_SIGNIN_CLIENT_ID: 'a', APPLE_TEAM_ID: 't', APPLE_SIGNIN_KEY_ID: 'k' }).apple).toBeNull();
    expect(enabledSocialProviders(resolveSocialAuth(noEnv))).toEqual({ google: false, apple: false });
  });

  test('Google: web client first, native client ids accepted as ID-token audiences', () => {
    const g = resolveSocialAuth({ ...noEnv, GOOGLE_CLIENT_ID: 'web', GOOGLE_CLIENT_SECRET: 's', GOOGLE_NATIVE_CLIENT_IDS: 'ios, android,web' }).google;
    expect(g).toEqual({ clientIds: ['web', 'ios', 'android'], clientSecret: 's' });
  });

  test('Apple: key inline (escaped newlines) or by path; the iOS bundle id is an accepted audience; unreadable key = off', () => {
    const env = { ...noEnv, APPLE_SIGNIN_CLIENT_ID: 'academy.azza.signin', APPLE_TEAM_ID: 'TEAM123456', APPLE_SIGNIN_KEY_ID: 'KEY1234567' };
    const inline = resolveSocialAuth({ ...env, APPLE_SIGNIN_PRIVATE_KEY: PEM.replace(/\n/g, '\\n') }).apple;
    expect(inline?.privateKey).toBe(PEM);
    expect(inline?.audience).toEqual(['academy.azza.signin', 'com.futuretech.azza']);
    expect(resolveSocialAuth({ ...env, APPLE_SIGNIN_PRIVATE_KEY_PATH: '/k.p8' }, () => PEM).apple?.privateKey).toBe(PEM);
    const unreadable = resolveSocialAuth({ ...env, APPLE_SIGNIN_PRIVATE_KEY_PATH: '/missing.p8' }, () => {
      throw new Error('ENOENT');
    });
    expect(unreadable.apple).toBeNull();
  });

  test('providers and the Apple origin are added only when configured', () => {
    expect(socialAuthOptions({ google: null, apple: null })).toEqual({ socialProviders: {}, trustedOrigins: [] });
    const both = socialAuthOptions({ google: { clientIds: ['web', 'ios'], clientSecret: 's' }, apple });
    expect(Object.keys(both.socialProviders)).toEqual(['google', 'apple']);
    expect(both.trustedOrigins).toEqual(['https://appleid.apple.com']);
    expect((both.socialProviders.apple as { clientSecret: string }).clientSecret.split('.')).toHaveLength(3);
  });
});

describe('Apple client secret', () => {
  test('an ES256 JWT for the Services ID, verifiable with the key', () => {
    const jwt = appleClientSecret(apple, 1_700_000_000);
    const [h, p, s] = jwt.split('.') as [string, string, string];
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({
      iss: 'TEAM123456',
      iat: 1_700_000_000,
      exp: 1_700_000_000 + 180 * 86400,
      aud: 'https://appleid.apple.com',
      sub: 'academy.azza.signin',
    });
    expect(verify('sha256', Buffer.from(`${h}.${p}`), { key: P256, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))).toBe(true);
  });

  test('reused while fresh, renewed in its last 30 days', () => {
    let now = 1_700_000_000;
    const next = appleSecretSource(apple, () => now);
    const first = next();
    now += 100 * 86400;
    expect(next()).toBe(first);
    now += 60 * 86400;
    expect(next()).not.toBe(first);
  });
});

describe('social sign-up profile', () => {
  test('phone is asked up front only by the email sign-up', () => {
    expect(phoneRequiredAtSignUp('/sign-up/email')).toBe(true);
    expect(phoneRequiredAtSignUp('/sign-in/social')).toBe(false);
    expect(phoneRequiredAtSignUp('/callback/:id')).toBe(false);
    expect(isSocialSignUpPath('/callback/:id')).toBe(true);
    expect(isSocialSignUpPath('/sign-in/social')).toBe(true);
    expect(isSocialSignUpPath('/sign-up/email')).toBe(false);
    expect(isSocialSignUpPath(undefined)).toBe(false);
  });

  test('Accept-Language: first supported language by quality', () => {
    expect(localeFromAcceptLanguage('ar-AE,ar;q=0.9,en;q=0.8')).toBe('ar');
    expect(localeFromAcceptLanguage('fr-FR,en-GB;q=0.7,ar;q=0.9')).toBe('ar');
    expect(localeFromAcceptLanguage('en-US')).toBe('en');
    expect(localeFromAcceptLanguage('fr, de;q=0.5')).toBeUndefined();
    expect(localeFromAcceptLanguage('ar;q=0, en;q=0.1')).toBe('en');
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
  });

  test('page values win when valid; junk is dropped', async () => {
    const only = async (c: string) => c === 'SAR' || c === 'AED';
    expect(await socialSignUpProfile({ additionalData: { locale: 'ar', timezone: 'Asia/Riyadh', displayCurrency: 'sar' } }, only)).toEqual({
      locale: 'ar',
      timezone: 'Asia/Riyadh',
      displayCurrency: 'SAR',
    });
    expect(await socialSignUpProfile({ additionalData: { locale: 'xx', timezone: 'Mars/Base', displayCurrency: 'EUR' }, acceptLanguage: 'ar' }, only)).toEqual({ locale: 'ar' });
    expect(await socialSignUpProfile({ additionalData: 'nope' }, only)).toEqual({});
  });

  test('first-touch attribution is cleaned and stored as JSON, like the email sign-up', async () => {
    const yes = async () => true;
    const p = await socialSignUpProfile({ additionalData: { acquisition: { utm_source: ' instagram ', utm_campaign: 'ramadan', junk: 'x' } } }, yes);
    expect(JSON.parse(p.acquisition ?? 'null')).toEqual({ utm_source: 'instagram', utm_campaign: 'ramadan' });
    expect(await socialSignUpProfile({ additionalData: { acquisition: { junk: 'x' } } }, yes)).toEqual({});
    expect(await socialSignUpProfile({ additionalData: { acquisition: 'not json' } }, yes)).toEqual({});
  });
});

describe('social sign-up through better-auth (native ID token)', () => {
  const GOOGLE_USERS: Record<string, { sub: string; email: string; name: string; email_verified: boolean }> = {
    'tok-new': { sub: 'g-new', email: 'new@x.test', name: 'Noor', email_verified: true },
    'tok-unverified-local': { sub: 'g-2', email: 'sara@x.test', name: 'Sara', email_verified: true },
    'tok-unverified-provider': { sub: 'g-3', email: 'omar@x.test', name: 'Omar', email_verified: false },
    'tok-verified-both': { sub: 'g-4', email: 'lina@x.test', name: 'Lina', email_verified: true },
  };

  function auth() {
    type Row = Record<string, unknown>;
    const db: { user: Row[]; session: Row[]; account: Row[]; verification: Row[] } = { user: [], session: [], account: [], verification: [] };
    const instance = betterAuth({
      secret: 'x'.repeat(40),
      baseURL: 'http://localhost:4000',
      basePath: '/api/auth',
      database: memoryAdapter(db),
      user: {
        additionalFields: {
          role: { type: 'string', required: false, defaultValue: 'STUDENT', input: false },
          locale: { type: 'string', required: false, defaultValue: 'en' },
          timezone: { type: 'string', required: false, defaultValue: 'Asia/Dubai' },
          displayCurrency: { type: 'string', required: false, defaultValue: 'AED' },
          phone: { type: 'string', required: false },
          acquisition: { type: 'string', required: false },
        },
      },
      emailAndPassword: { enabled: true },
      socialProviders: {
        google: {
          clientId: 'web',
          clientSecret: 's',
          verifyIdToken: async (token) => token in GOOGLE_USERS,
          getUserInfo: async (tokens) => {
            const p = GOOGLE_USERS[tokens.idToken ?? ''];
            return p ? { user: { email: p.email, name: p.name, emailVerified: p.email_verified }, data: p as never } : null;
          },
        },
      },
      account: { accountLinking: { enabled: true, allowDifferentEmails: false } },
      databaseHooks: { user: { create: { before: createSocialSignUpHook() } } },
      hooks: { before: createUserHooks() },
    });
    return { instance, db };
  }
  const post = (a: ReturnType<typeof auth>['instance'], path: string, body: unknown, headers: Record<string, string> = {}) =>
    a.handler(new Request(`http://localhost:4000/api/auth${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4000', ...headers }, body: JSON.stringify(body) }));
  const google = (token: string, extra: Record<string, unknown> = {}) => ({ provider: 'google', idToken: { token }, ...extra });

  test('a new Google user needs no phone, is a STUDENT and keeps the page locale', async () => {
    const { instance, db } = auth();
    const res = await post(instance, '/sign-in/social', google('tok-new', { additionalData: { locale: 'ar', timezone: 'Asia/Riyadh', acquisition: { utm_source: 'google' } } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(db.user).toHaveLength(1);
    expect(db.user[0]).toMatchObject({ email: 'new@x.test', role: 'STUDENT', locale: 'ar', timezone: 'Asia/Riyadh', emailVerified: true });
    expect(db.user[0]?.phone ?? null).toBeNull();
    expect(JSON.parse(String(db.user[0]?.acquisition))).toEqual({ utm_source: 'google' });
  });

  test('without page data the browser language is used', async () => {
    const { instance, db } = auth();
    expect((await post(instance, '/sign-in/social', google('tok-new'), { 'Accept-Language': 'ar-AE,en;q=0.5' })).status).toBe(200);
    expect(db.user[0]?.locale).toBe('ar');
  });

  test('email sign-up still requires the phone', async () => {
    const { instance, db } = auth();
    const res = await post(instance, '/sign-up/email', { name: 'Sara', email: 'sara@x.test', password: 'password123' });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('PHONE_REQUIRED');
    expect(db.user).toHaveLength(0);
  });

  test('a Google identity never joins an existing account whose email is not verified', async () => {
    const { instance, db } = auth();
    expect((await post(instance, '/sign-up/email', { name: 'Sara', email: 'sara@x.test', password: 'password123', phone: '0501234567' })).status).toBe(200);
    const res = await post(instance, '/sign-in/social', google('tok-unverified-local'));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(db.account.filter((a) => a.providerId === 'google')).toHaveLength(0);
    expect(db.user).toHaveLength(1);
  });

  test('an unverified provider email never joins an existing verified account', async () => {
    const { instance, db } = auth();
    expect((await post(instance, '/sign-up/email', { name: 'Omar', email: 'omar@x.test', password: 'password123', phone: '0501234567' })).status).toBe(200);
    db.user[0]!.emailVerified = true;
    const res = await post(instance, '/sign-in/social', google('tok-unverified-provider'));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(db.account.filter((a) => a.providerId === 'google')).toHaveLength(0);
  });

  test('verified on both sides: the Google identity links to the existing account (role and phone kept)', async () => {
    const { instance, db } = auth();
    expect((await post(instance, '/sign-up/email', { name: 'Lina', email: 'lina@x.test', password: 'password123', phone: '0501234567' })).status).toBe(200);
    db.user[0]!.emailVerified = true;
    db.user[0]!.role = 'TEACHER';
    expect((await post(instance, '/sign-in/social', google('tok-verified-both'))).status).toBe(200);
    expect(db.user).toHaveLength(1);
    expect(db.user[0]).toMatchObject({ role: 'TEACHER', phone: '+971501234567' });
    expect(db.account.filter((a) => a.providerId === 'google')).toHaveLength(1);
  });
});
