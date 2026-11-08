import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { checkoutInput, currencyInput, formatMoney, convertFromAed, updateCurrencyInput, updateProfileInput } from '@azza/shared';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { adminCurrencyRoutes, currencyRoutes } from '../src/modules/currencies/currency.routes';
import { CurrencyService, DEFAULT_CURRENCIES, type CurrencyRecord, type CurrencyRepository, type CurrencyWrite } from '../src/modules/currencies/currency.service';
import { MeService } from '../src/modules/me/me.service';
import { FxService } from '../src/modules/payments/fx.service';
import { adminFinanceRoutes, paymentRoutes } from '../src/modules/payments/payments.routes';
import { FixedClock } from '../src/infrastructure/clock';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

class MemCurrencies implements CurrencyRepository {
  rows = new Map<string, CurrencyRecord>(DEFAULT_CURRENCIES.map((c) => [c.code, { ...c, enabled: true, updatedAt: new Date('2026-11-01T00:00:00Z') }]));
  /** userId → displayCurrency, like User.displayCurrency. */
  users = new Map<string, string>([['sara', 'SAR'], ['omar', 'USD'], ['maya', 'SAR']]);
  async list(all: boolean) {
    return [...this.rows.values()].filter((c) => all || c.enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }
  async find(code: string) {
    return this.rows.get(code) ?? null;
  }
  async create(d: Omit<CurrencyRecord, 'updatedAt'>) {
    const row = { ...d, updatedAt: new Date('2026-11-08T00:00:00Z') };
    this.rows.set(d.code, row);
    return row;
  }
  async update(code: string, d: CurrencyWrite) {
    const row = { ...this.rows.get(code)!, ...d, updatedAt: new Date('2026-11-08T00:00:00Z') };
    this.rows.set(code, row);
    return row;
  }
  async deleteAndResetUsers(code: string) {
    this.rows.delete(code);
    return this.resetUsers(code);
  }
  async resetUsers(code: string) {
    let n = 0;
    for (const [u, c] of this.users) if (c === code) (this.users.set(u, 'AED'), n++);
    return n;
  }
}

const setup = () => {
  const repo = new MemCurrencies();
  return { repo, svc: new CurrencyService(repo, () => {}) };
};
const codeOf = (p: Promise<unknown>) => p.then(() => 'OK', (e: { code?: string; status?: number }) => `${e.status} ${e.code}`);
const euro = { code: 'EUR', nameEn: 'Euro', nameAr: 'يورو', symbol: '€', decimals: 2, ratePerAed: 0.25, enabled: true, sortOrder: 4 };

describe('CurrencyService', () => {
  test('add, edit, reorder; GET /currencies lists enabled ones sorted', async () => {
    const { svc } = setup();
    expect((await svc.create(euro)).code).toBe('EUR');
    await svc.update('EUR', { sortOrder: 0, nameEn: 'Euro (EU)' });
    const list = await svc.list();
    expect(list.base).toBe('AED');
    expect(list.items.map((c) => c.code)).toEqual(['AED', 'EUR', 'SAR', 'QAR', 'USD']);
    expect(list.items[1]).toEqual({ code: 'EUR', nameEn: 'Euro (EU)', nameAr: 'يورو', symbol: '€', decimals: 2, ratePerAed: 0.25, sortOrder: 0 });
  });

  test('a duplicate code is a 409', async () => {
    const { svc } = setup();
    expect(await codeOf(svc.create({ ...euro, code: 'SAR' }))).toBe('409 CONFLICT');
    expect(await codeOf(svc.create({ ...euro, code: 'AED' }))).toBe('409 CONFLICT');
  });

  test('AED is locked: no delete, no disable, rate stays 1', async () => {
    const { svc } = setup();
    expect(await codeOf(svc.delete('AED'))).toBe('422 BASE_CURRENCY_LOCKED');
    expect(await codeOf(svc.update('AED', { enabled: false }))).toBe('422 BASE_CURRENCY_LOCKED');
    expect(await codeOf(svc.update('AED', { ratePerAed: 3.67 }))).toBe('422 BASE_CURRENCY_LOCKED');
    expect(await codeOf(svc.setRate('AED', 2))).toBe('422 BASE_CURRENCY_LOCKED');
    expect(await codeOf(svc.update('AED', { ratePerAed: 1, nameEn: 'Dirham' }))).toBe('OK');
  });

  test('delete moves its users back to AED; orders keep their own snapshot', async () => {
    const { svc, repo } = setup();
    await svc.delete('SAR');
    expect(repo.rows.has('SAR')).toBe(false);
    expect(Object.fromEntries(repo.users)).toEqual({ sara: 'AED', omar: 'USD', maya: 'AED' });
    expect(await codeOf(svc.delete('SAR'))).toBe('404 NOT_FOUND');
  });

  test('disabling hides it from GET /currencies and moves its users to AED', async () => {
    const { svc, repo } = setup();
    await svc.update('USD', { enabled: false });
    expect((await svc.list()).items.map((c) => c.code)).toEqual(['AED', 'SAR', 'QAR']);
    expect((await svc.adminList()).items.map((c) => [c.code, c.enabled])).toContainEqual(['USD', false]);
    expect(repo.users.get('omar')).toBe('AED');
    expect(await svc.effective('USD')).toBe('AED');
    expect(await svc.effective('GBP')).toBe('AED');
    expect(await svc.effective('SAR')).toBe('SAR');
  });

  test('a disabled or unknown currency cannot be chosen (profile and checkout)', async () => {
    const { svc } = setup();
    await svc.update('QAR', { enabled: false });
    expect(await codeOf(svc.assertSelectable('QAR'))).toBe('422 CURRENCY_UNAVAILABLE');
    expect(await codeOf(svc.assertSelectable('GBP'))).toBe('422 CURRENCY_UNAVAILABLE');
    expect((await svc.assertSelectable('sar')).code).toBe('SAR');

    // Checkout reads the display rate through FxService.rateFor, which refuses the same codes.
    const fx = new FxService(svc);
    expect(await fx.rateFor('SAR')).toBe(1.0211);
    expect(await fx.rateFor('AED')).toBe(1);
    expect(await codeOf(fx.rateFor('QAR'))).toBe('422 CURRENCY_UNAVAILABLE');
    expect(await codeOf(fx.rateFor('GBP'))).toBe('422 CURRENCY_UNAVAILABLE');
  });

  test('profile: the preference is validated on update and falls back to AED on read', async () => {
    const { svc, repo } = setup();
    const saved: unknown[] = [];
    let stored = 'USD';
    const meRepo = {
      updateProfile: async (_id: string, input: { displayCurrency?: string }) => (saved.push(input), input),
      profile: async () => ({ id: 'sara', displayCurrency: stored }),
      counts: async () => ({}),
    };
    const me = new MeService(meRepo as never, { now: () => new Date() }, {} as never, undefined, svc);
    expect(await codeOf(me.updateProfile({ id: 'sara', role: 'STUDENT' }, { displayCurrency: 'GBP' }))).toBe('422 CURRENCY_UNAVAILABLE');
    await svc.update('QAR', { enabled: false });
    expect(await codeOf(me.updateProfile({ id: 'sara', role: 'STUDENT' }, { displayCurrency: 'QAR' }))).toBe('422 CURRENCY_UNAVAILABLE');
    await me.updateProfile({ id: 'sara', role: 'STUDENT' }, { displayCurrency: 'SAR' });
    expect(saved).toEqual([{ displayCurrency: 'SAR' }]);

    expect((await me.profile('sara')).displayCurrency).toBe('USD');
    repo.rows.delete('USD'); // removed behind our back: read-time fallback
    expect((await me.profile('sara')).displayCurrency).toBe('AED');
    stored = 'AED';
  });
});

describe('checkout display currency (display only)', () => {
  function checkout(svc: CurrencyService) {
    const clock = new FixedClock(new Date('2026-11-02T10:00:00Z'));
    const repo = new InMemoryPaymentsRepository(() => clock.now());
    repo.batches.set('b08', {
      id: 'b08', code: 'B08', status: 'ENROLLING', capacity: 5, waitlistEnabled: true, priceFils: 88_000, timezone: 'Asia/Dubai',
      teacherId: 'lina', courseId: 'pdf', courseTitle: 'PDF', firstSessionAt: new Date('2026-12-01T14:00:00Z'),
    });
    const machine = new EnrollmentStateMachine();
    const notifier = new RecordingNotifier();
    const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
    return new CheckoutService(repo, new CheckoutStrategyRegistry([]), new PriceCalculator(5), new FxService(svc), machine, lifecycle, new ReferenceGenerator(), notifier);
  }

  test('a disabled or unknown display currency falls back to AED instead of failing', async () => {
    const { svc } = setup();
    await svc.update('QAR', { enabled: false });
    for (const code of ['QAR', 'GBP']) {
      const q = await checkout(svc).quote({ batchId: 'b08', displayCurrency: code });
      expect(q.totalFils).toBe(92_400);
      expect(q.display).toEqual({ currency: 'AED', amount: 924, rate: 1 });
    }
  });

  test('the display amount uses the currency’s decimals (USD at 2)', async () => {
    const { svc } = setup();
    expect((await checkout(svc).quote({ batchId: 'b08', displayCurrency: 'USD' })).display).toEqual({ currency: 'USD', amount: 252, rate: 0.2723 });
    await svc.update('USD', { decimals: 2 });
    expect((await checkout(svc).quote({ batchId: 'b08', displayCurrency: 'USD' })).display).toEqual({ currency: 'USD', amount: 251.61, rate: 0.2723 });
    expect(await svc.displayFor('usd')).toEqual({ currency: 'USD', rate: 0.2723, decimals: 2 });
  });
});

describe('schemas', () => {
  test('codes are 3-letter ISO 4217, uppercased; validation of existence is the API’s', () => {
    expect(checkoutInput.parse({ batchId: 'b', method: 'STRIPE', displayCurrency: 'eur' }).displayCurrency).toBe('EUR');
    expect(checkoutInput.safeParse({ batchId: 'b', method: 'STRIPE', displayCurrency: 'EURO' }).success).toBe(false);
    expect(updateProfileInput.safeParse({ displayCurrency: '12A' }).success).toBe(false);
    expect(currencyInput.safeParse({ ...euro, decimals: 4 }).success).toBe(false);
    expect(currencyInput.safeParse({ ...euro, ratePerAed: 0 }).success).toBe(false);
    expect(currencyInput.parse({ code: 'gbp', nameEn: 'Pound', nameAr: 'جنيه', ratePerAed: 0.21 })).toMatchObject({ code: 'GBP', decimals: 2, enabled: true, sortOrder: 0 });
    expect(updateCurrencyInput.safeParse({}).success).toBe(false);
    expect(updateCurrencyInput.parse({ enabled: false })).toEqual({ enabled: false }); // no defaults sneak into a PATCH
  });

  test('formatMoney takes the currency’s decimals and keeps ≈ for non-base', () => {
    expect(formatMoney(12.5, 'AED')).toBe('AED 12.50');
    expect(formatMoney(12.5, 'EUR', 'en', 2)).toBe('≈ EUR 12.50');
    expect(formatMoney(13, 'SAR')).toBe('≈ SAR 13');
    expect(convertFromAed(10_000, 'EUR', 0.2512, 2)).toBe(25.12);
    expect(convertFromAed(10_000, 'SAR', 1.0211)).toBe(102);
  });
});

describe('HTTP', () => {
  const user = (role: CurrentUser['role']): CurrentUser => ({ id: 'u1', name: 'U', email: 'u@x.test', role, locale: 'en', timezone: 'Asia/Dubai' });
  const make = (who: CurrentUser | null) => {
    const { svc, repo } = setup();
    const fx = new FxService(svc);
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => (c.set('user', who), next()));
    a.route('/admin', adminCurrencyRoutes(svc));
    a.route('/', currencyRoutes(svc));
    a.route('/', paymentRoutes({ fx } as never));
    a.route('/admin', adminFinanceRoutes({ fx } as never));
    return { app: a, repo };
  };
  const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('GET /currencies and the legacy GET /fx-rates are public', async () => {
    const { app } = make(null);
    const res = await app.request('/currencies');
    expect(res.status).toBe(200);
    expect((await res.json()).items.map((c: { code: string }) => c.code)).toEqual(['AED', 'SAR', 'QAR', 'USD']);
    const fx = await (await app.request('/fx-rates')).json();
    expect(fx).toMatchObject({ base: 'AED', rates: { SAR: 1.0211, QAR: 0.9912, USD: 0.2723 } });
  });

  test('admin currency endpoints are admin-only', async () => {
    for (const [who, status] of [[null, 401], [user('STUDENT'), 403], [user('TEACHER'), 403]] as const) {
      const { app } = make(who);
      expect((await app.request('/admin/currencies')).status).toBe(status);
      expect((await app.request('/admin/currencies', json('POST', euro))).status).toBe(status);
      expect((await app.request('/admin/currencies/SAR', json('PATCH', { enabled: false }))).status).toBe(status);
      expect((await app.request('/admin/currencies/SAR', { method: 'DELETE' })).status).toBe(status);
      expect((await app.request('/admin/fx-rates', json('PUT', { currency: 'SAR', ratePerAed: 1 }))).status).toBe(status);
    }
  });

  test('admins: create 201, duplicate 409, AED locked 422, delete, and PUT /admin/fx-rates still works', async () => {
    const { app, repo } = make(user('ADMIN'));
    expect((await app.request('/admin/currencies', json('POST', euro))).status).toBe(201);
    expect((await app.request('/admin/currencies', json('POST', euro))).status).toBe(409);
    expect((await app.request('/admin/currencies', json('POST', { ...euro, code: 'EURO' }))).status).toBe(400);
    const locked = await app.request('/admin/currencies/AED', { method: 'DELETE' });
    expect(locked.status).toBe(422);
    expect((await locked.json()).error.code).toBe('BASE_CURRENCY_LOCKED');
    expect((await app.request('/admin/currencies/aed', json('PATCH', { enabled: false }))).status).toBe(422);
    expect((await app.request('/admin/currencies/GBP', json('PATCH', { enabled: false }))).status).toBe(404);
    expect((await app.request('/admin/currencies/QAR', { method: 'DELETE' })).status).toBe(200);
    expect(repo.rows.has('QAR')).toBe(false);

    const fx = await app.request('/admin/fx-rates', json('PUT', { currency: 'SAR', ratePerAed: 1.02 }));
    expect(fx.status).toBe(200);
    expect((await fx.json()).rates).toEqual({ SAR: 1.02, USD: 0.2723, EUR: 0.25 });
    expect((await app.request('/admin/currencies')).status).toBe(200);
  });
});
