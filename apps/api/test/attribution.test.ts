import { describe, expect, test } from 'bun:test';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { cleanAttribution } from '@azza/shared';
import { signUpPhoneHook } from '../src/auth/auth';

describe('attribution cleaning', () => {
  test('keeps known keys with text, trimmed and capped', () => {
    expect(cleanAttribution({ utm_source: ' instagram ', utm_campaign: 'ramadan', evil: 'x', gclid: '' })).toEqual({ utm_source: 'instagram', utm_campaign: 'ramadan' });
    expect(cleanAttribution(JSON.stringify({ fbclid: 'a'.repeat(400) }))?.fbclid).toHaveLength(300);
    expect(cleanAttribution({ utm_source: 7 })).toBeNull();
    expect(cleanAttribution('not json')).toBeNull();
    expect(cleanAttribution(['utm_source'])).toBeNull();
    expect(cleanAttribution(null)).toBeNull();
  });
});

describe('sign-up records where the user came from, once', () => {
  function auth() {
    const db: { user: Array<Record<string, unknown>>; session: unknown[]; account: unknown[]; verification: unknown[] } = { user: [], session: [], account: [], verification: [] };
    const instance = betterAuth({
      secret: 'x'.repeat(40),
      baseURL: 'http://localhost:4000',
      basePath: '/api/auth',
      database: memoryAdapter(db),
      user: { additionalFields: { phone: { type: 'string', required: false }, acquisition: { type: 'string', required: false } } },
      emailAndPassword: { enabled: true },
      hooks: { before: signUpPhoneHook },
    });
    return { instance, db };
  }
  const post = (a: ReturnType<typeof auth>['instance'], path: string, body: Record<string, unknown>) =>
    a.handler(new Request(`http://localhost:4000/api/auth${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4000' }, body: JSON.stringify(body) }));
  const base = { name: 'Sara', email: 'sara@x.test', password: 'password123', phone: '+971501234567' };

  test('known tags are stored as JSON; unknown ones are dropped', async () => {
    const { instance, db } = auth();
    const res = await post(instance, '/sign-up/email', { ...base, acquisition: JSON.stringify({ utm_source: 'tiktok', utm_campaign: 'launch', spam: 'x' }) });
    expect(res.status).toBe(200);
    expect(JSON.parse(String(db.user[0]!.acquisition))).toEqual({ utm_source: 'tiktok', utm_campaign: 'launch' });
  });

  test('nothing usable stores nothing', async () => {
    const { instance, db } = auth();
    await post(instance, '/sign-up/email', { ...base, acquisition: '{"spam":"x"}' });
    expect(db.user[0]!.acquisition ?? null).toBeNull();
  });
});
