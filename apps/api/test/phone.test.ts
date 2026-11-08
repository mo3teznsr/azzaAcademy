import { describe, expect, test } from 'bun:test';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { COUNTRIES, contactSettingsInput, instructorApplicationInput, isValidPhone, toE164, updateProfileInput } from '@azza/shared';
import { createUserHooks, signUpPhoneHook } from '../src/auth/auth';

describe('phone helpers', () => {
  test('AE: 9-digit mobiles and 8-digit landlines, trunk 0 and punctuation stripped', () => {
    expect(toE164('AE', '050 123 4567')).toBe('+971501234567');
    expect(toE164('ae', '(050)-123.4567')).toBe('+971501234567');
    expect(isValidPhone('+971501234567')).toBe(true);
    expect(isValidPhone('+97142345678')).toBe(true); // Dubai landline, 8 digits
  });

  test('SA', () => {
    expect(toE164('SA', '0512345678')).toBe('+966512345678');
    expect(isValidPhone('+966512345678')).toBe(true);
  });

  test('too short and too long for the country are refused', () => {
    expect(isValidPhone(toE164('AE', '5012345'))).toBe(false); // 7 national digits
    expect(isValidPhone(toE164('AE', '5012345678'))).toBe(false); // 10
    expect(isValidPhone(toE164('SA', '51234567890'))).toBe(false);
    expect(isValidPhone('+9745012345')).toBe(false); // QA needs 8
  });

  test('shape, unknown calling codes and international input', () => {
    expect(isValidPhone('971501234567')).toBe(false); // no +
    expect(isValidPhone('+0971501234567')).toBe(false);
    expect(isValidPhone('+1234567890123456')).toBe(false); // > 15 digits
    expect(isValidPhone('+8091234567')).toBe(false); // 80x is not a calling code
    expect(isValidPhone('+12025550123')).toBe(true); // NANP, 10 digits
    expect(toE164('AE', '+966 51 234 5678')).toBe('+966512345678');
    expect(toE164('AE', '00966512345678')).toBe('+966512345678');
  });

  test('the country list: every ISO country, GCC first, AE default', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(245);
    expect(COUNTRIES.slice(0, 6).map((c) => c.iso2)).toEqual(['AE', 'SA', 'QA', 'KW', 'BH', 'OM']);
    expect(COUNTRIES[0]).toMatchObject({ iso2: 'AE', dialCode: '971', nameEn: 'United Arab Emirates', flag: '🇦🇪' });
    expect(COUNTRIES.find((c) => c.iso2 === 'EG')?.nameAr).toBe('مصر');
  });

  test('profile, instructor application and contact phone must be E.164 when present', () => {
    expect(updateProfileInput.safeParse({ phone: '0501234567' }).success).toBe(false);
    expect(updateProfileInput.parse({ phone: '+971501234567' }).phone).toBe('+971501234567');
    expect(updateProfileInput.parse({ phone: '' }).phone).toBeNull(); // clears
    expect(updateProfileInput.parse({}).phone).toBeUndefined();
    expect(instructorApplicationInput.shape.phone.safeParse('+97150').success).toBe(false);
    expect(instructorApplicationInput.shape.phone.safeParse('+966512345678').success).toBe(true);
    expect(contactSettingsInput.safeParse({ contactPhone: '+97150' }).success).toBe(false);
  });
});

describe('sign-up requires a valid phone', () => {
  function auth(hook = signUpPhoneHook) {
    const db: { user: unknown[]; session: unknown[]; account: unknown[]; verification: unknown[] } = { user: [], session: [], account: [], verification: [] };
    const instance = betterAuth({
      secret: 'x'.repeat(40),
      baseURL: 'http://localhost:4000',
      basePath: '/api/auth',
      database: memoryAdapter(db),
      user: { additionalFields: { phone: { type: 'string', required: false }, displayCurrency: { type: 'string', required: false, defaultValue: 'AED' } } },
      emailAndPassword: { enabled: true },
      hooks: { before: hook },
    });
    return { instance, db };
  }
  const signUp = (a: ReturnType<typeof auth>['instance'], body: Record<string, unknown>) =>
    a.handler(new Request('http://localhost:4000/api/auth/sign-up/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4000' }, body: JSON.stringify(body) }));
  const base = { name: 'Sara', email: 'sara@x.test', password: 'password123' };

  test('without a phone: 400 PHONE_REQUIRED', async () => {
    const { instance, db } = auth();
    const res = await signUp(instance, base);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('PHONE_REQUIRED');
    expect(db.user).toHaveLength(0);
  });

  test('with a bad phone: 400 PHONE_INVALID', async () => {
    const { instance, db } = auth();
    const res = await signUp(instance, { ...base, phone: '+97150' });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('PHONE_INVALID');
    expect(db.user).toHaveLength(0);
  });

  test('with a good phone: stored in E.164', async () => {
    const { instance, db } = auth();
    const res = await signUp(instance, { ...base, phone: '+971 50 123 4567' });
    expect(res.status).toBe(200);
    expect((db.user[0] as { phone: string }).phone).toBe('+971501234567');
  });

  test('server-side sign-ups (seed, scripts) are not checked', async () => {
    const { instance, db } = auth();
    await instance.api.signUpEmail({ body: base });
    expect(db.user).toHaveLength(1);
  });
});

describe('better-auth user writes cannot bypass phone and currency validation', () => {
  const enabled = new Set(['AED', 'SAR', 'USD']);
  const currencies = { isSelectable: async (c: string) => enabled.has(c) };
  function auth() {
    const db: { user: Array<Record<string, unknown>>; session: unknown[]; account: unknown[]; verification: unknown[] } = { user: [], session: [], account: [], verification: [] };
    const instance = betterAuth({
      secret: 'x'.repeat(40),
      baseURL: 'http://localhost:4000',
      basePath: '/api/auth',
      database: memoryAdapter(db),
      user: { additionalFields: { phone: { type: 'string', required: false }, displayCurrency: { type: 'string', required: false, defaultValue: 'AED' } } },
      emailAndPassword: { enabled: true },
      hooks: { before: createUserHooks(currencies) },
    });
    return { instance, db };
  }
  const post = (a: ReturnType<typeof auth>['instance'], path: string, body: unknown, cookie?: string) =>
    a.handler(new Request(`http://localhost:4000/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4000', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }));
  const signedUp = async (extra: Record<string, unknown> = {}) => {
    const a = auth();
    const res = await post(a.instance, '/sign-up/email', { name: 'Sara', email: 'sara@x.test', password: 'password123', phone: '+971501234567', ...extra });
    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    return { ...a, cookie };
  };

  test('sign-up: an unavailable displayCurrency falls back to AED; an enabled one is kept', async () => {
    expect((await signedUp({ displayCurrency: 'QAR' })).db.user[0]!.displayCurrency).toBe('AED');
    expect((await signedUp({ displayCurrency: 'nope' })).db.user[0]!.displayCurrency).toBe('AED');
    expect((await signedUp({ displayCurrency: 'sar' })).db.user[0]!.displayCurrency).toBe('SAR');
  });

  test('update-user: a bad phone is refused, a good one normalised, empty clears', async () => {
    const { instance, db, cookie } = await signedUp();
    const bad = await post(instance, '/update-user', { phone: '+97150' }, cookie);
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe('PHONE_INVALID');
    expect(db.user[0]!.phone).toBe('+971501234567');
    expect((await post(instance, '/update-user', { phone: '+966 51 234 5678' }, cookie)).status).toBe(200);
    expect(db.user[0]!.phone).toBe('+966512345678');
    expect((await post(instance, '/update-user', { phone: '' }, cookie)).status).toBe(200);
    expect(db.user[0]!.phone).toBeNull();
  });

  test('update-user: displayCurrency must be enabled', async () => {
    const { instance, db, cookie } = await signedUp();
    const bad = await post(instance, '/update-user', { displayCurrency: 'QAR' }, cookie);
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe('CURRENCY_UNAVAILABLE');
    expect(db.user[0]!.displayCurrency).toBe('AED');
    expect((await post(instance, '/update-user', { displayCurrency: 'usd', name: 'Sara K' }, cookie)).status).toBe(200);
    expect(db.user[0]).toMatchObject({ displayCurrency: 'USD', name: 'Sara K' });
  });
});
