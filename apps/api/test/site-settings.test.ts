import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { contactSettingsInput, ruleSettingsInput } from '@azza/shared';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { FixedClock } from '../src/infrastructure/clock';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { adminRoutes } from '../src/modules/admin/admin.routes';
import type { CourseRecord, CourseRepository } from '../src/modules/courses/course.repository';
import { CourseService } from '../src/modules/courses/course.service';
import { BankTransferCheckout } from '../src/modules/payments/checkout/bank-transfer-checkout';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';
import { PayoutService } from '../src/modules/payouts/payout.service';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { adminSettingsRoutes, siteSettingsRoutes } from '../src/modules/settings/settings.routes';
import { SettingsService } from '../src/modules/settings/settings.service';
import type { CutSettings, SettingsRepository } from '../src/modules/settings/settings.repository';
import { EMPTY_SITE_SETTINGS, type SiteSettingsRepository, type SiteSettingsRow } from '../src/modules/settings/site-settings.repository';
import { SiteSettingsService, type SiteSettingsDeps } from '../src/modules/settings/site-settings.service';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

/** One PlatformSettings row shared by every "instance" built on it, like the database. */
class MemSiteSettings implements SiteSettingsRepository {
  row: SiteSettingsRow | null = null;
  reads = 0;
  async get() {
    this.reads++;
    return this.row ? { ...this.row, socials: { ...this.row.socials } } : null;
  }
  async save(data: Partial<SiteSettingsRow>) {
    this.row = { ...(this.row ?? EMPTY_SITE_SETTINGS), ...data };
    return { ...this.row };
  }
}

class MemCuts implements SettingsRepository {
  value: CutSettings = { liveCutPercent: 70, recordedCutPercent: 60 };
  async getCuts() { return this.value; }
  async saveCuts(c: CutSettings) { return (this.value = c); }
  async setCourseCut() { return null; }
}

const DEFAULTS = { vatPercent: 5, earningHoldDays: 14, minPayoutAed: 200, bankTransferHoldHours: 48 };
const INTEGRATIONS = { stripe: true, appleIap: true, livekit: false, smtp: false, push: false, appStoreConnect: false };

function build(repo = new MemSiteSettings(), extra: Partial<SiteSettingsDeps> = {}) {
  let t = 0;
  const now = { advance: (ms: number) => (t += ms) };
  const svc = new SiteSettingsService(repo, {
    defaults: DEFAULTS,
    integrations: INTEGRATIONS,
    cuts: async () => ({ liveCutPercent: 70, recordedCutPercent: 60 }),
    now: () => t,
    log: () => {},
    ...extra,
  });
  return { svc, repo, now };
}

describe('business rules (DB override, env fallback)', () => {
  test('env defaults apply until an admin edits; null resets', async () => {
    const { svc } = build();
    expect(await svc.rules()).toEqual(DEFAULTS);

    const view = await svc.updateRules({ vatPercent: 0, minPayoutAed: 500 });
    expect(view.rules).toMatchObject({ VAT_PERCENT: 0, MIN_PAYOUT_AED: 500, EARNING_HOLD_DAYS: 14, BANK_TRANSFER_HOLD_HOURS: 48, TEACHER_SHARE_PERCENT: 70 });
    expect(view.ruleDefaults).toEqual({ VAT_PERCENT: 5, EARNING_HOLD_DAYS: 14, MIN_PAYOUT_AED: 200, BANK_TRANSFER_HOLD_HOURS: 48 });
    expect(svc.ruleSnapshot().minPayoutAed).toBe(500);

    await svc.updateRules({ minPayoutAed: null }); // absent keys stay as they are
    expect(await svc.rules()).toEqual({ ...DEFAULTS, vatPercent: 0 });
    await svc.updateRules({ vatPercent: null });
    expect(await svc.rules()).toEqual(DEFAULTS);
  });

  test('the sync snapshot is the env defaults before the first load, then the DB values', async () => {
    const repo = new MemSiteSettings();
    repo.row = { ...EMPTY_SITE_SETTINGS, earningHoldDays: 7 };
    const { svc } = build(repo);
    expect(svc.ruleSnapshot().earningHoldDays).toBe(14); // kicks off the load
    await svc.warm();
    expect(svc.ruleSnapshot().earningHoldDays).toBe(7);
  });

  test('another instance sees a change once its 30 s cache is stale', async () => {
    const repo = new MemSiteSettings();
    const a = build(repo);
    const b = build(repo);
    expect((await b.svc.rules()).vatPercent).toBe(5);
    await a.svc.updateRules({ vatPercent: 10 });
    expect((await a.svc.rules()).vatPercent).toBe(10); // the writer at once
    expect((await b.svc.rules()).vatPercent).toBe(5); // cached
    b.now.advance(30_000);
    expect((await b.svc.rules()).vatPercent).toBe(10);
  });

  test('a VAT change re-syncs Stripe prices (fire-and-forget); other changes do not', async () => {
    const calls: number[] = [];
    const { svc } = build(undefined, { onVatChanged: async (v) => calls.push(v) });
    await svc.updateRules({ earningHoldDays: 3 });
    await svc.updateRules({ vatPercent: 5 }); // same effective value
    expect(calls).toEqual([]);
    await svc.updateRules({ vatPercent: 7 });
    await svc.updateRules({ vatPercent: null }); // back to the env 5
    expect(calls).toEqual([7, 5]);
  });

  test('a failing re-sync never fails the update', async () => {
    const { svc } = build(undefined, { onVatChanged: async () => { throw new Error('stripe down'); } });
    expect((await svc.updateRules({ vatPercent: 9 })).rules.VAT_PERCENT).toBe(9);
  });

  test('rule ranges', () => {
    expect(ruleSettingsInput.safeParse({ vatPercent: 31 }).success).toBe(false);
    expect(ruleSettingsInput.safeParse({ earningHoldDays: 91 }).success).toBe(false);
    expect(ruleSettingsInput.safeParse({ minPayoutAed: -1 }).success).toBe(false);
    expect(ruleSettingsInput.safeParse({ bankTransferHoldHours: 0 }).success).toBe(false);
    expect(ruleSettingsInput.safeParse({ bankTransferHoldHours: 169 }).success).toBe(false);
    expect(ruleSettingsInput.parse({ vatPercent: null, bankTransferHoldHours: 168 })).toEqual({ vatPercent: null, bankTransferHoldHours: 168 });
  });
});

describe('a VAT change applies to the next quote without a restart', () => {
  test('checkout quotes and bank-transfer holds read the rules at use time', async () => {
    const { svc } = build();
    await svc.warm();
    const clock = new FixedClock(new Date('2026-11-02T10:00:00Z'));
    const repo = new InMemoryPaymentsRepository(() => clock.now());
    const notifier = new RecordingNotifier();
    repo.addUser('sara');
    repo.batches.set('b08', {
      id: 'b08', code: 'B08', status: 'ENROLLING', capacity: 5, waitlistEnabled: true, priceFils: 100_000, timezone: 'Asia/Dubai',
      teacherId: 'lina', courseId: 'pdf', courseTitle: 'PDF', firstSessionAt: new Date('2026-12-01T14:00:00Z'),
    });
    repo.bankAccounts.push({ id: 'enbd', bankName: 'ENBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 });
    const machine = new EnrollmentStateMachine();
    const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
    const checkout = new CheckoutService(
      repo,
      new CheckoutStrategyRegistry([new BankTransferCheckout(repo, notifier, () => svc.ruleSnapshot().bankTransferHoldHours)]),
      new PriceCalculator(() => svc.ruleSnapshot().vatPercent),
      { rateFor: async () => 1 },
      machine,
      lifecycle,
      new ReferenceGenerator(),
      notifier,
    );

    expect((await checkout.quote({ batchId: 'b08', displayCurrency: 'AED' })).totalFils).toBe(105_000);
    await svc.updateRules({ vatPercent: 10, bankTransferHoldHours: 2 });
    expect((await checkout.quote({ batchId: 'b08', displayCurrency: 'AED' })).totalFils).toBe(110_000);

    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error('unexpected waitlist');
    expect(res.order.vatFils).toBe(10_000);
    expect(res.order.expiresAt?.toISOString()).toBe('2026-11-02T12:00:00.000Z');
  });

  test('the Stripe gateway grosses plan prices up with the VAT in effect at the call', async () => {
    let vat = 5;
    const gateway = new FakePaymentGateway(new PriceCalculator(() => vat));
    expect((await gateway.upsertRecordedProduct({ name: 'C', courseId: 'c1', monthlyFils: 10_000, yearlyFils: 100_000 })).monthlyPriceId).toBe('price_fake_m_10500');
    vat = 0;
    expect((await gateway.upsertRecordedProduct({ name: 'C', courseId: 'c1', monthlyFils: 10_000, yearlyFils: 100_000 })).monthlyPriceId).toBe('price_fake_m_10000');
  });
});

describe('money paths read the rules at use time on every instance', () => {
  function checkoutOn(rulesOf: SiteSettingsService) {
    const clock = new FixedClock(new Date('2026-11-02T10:00:00Z'));
    const repo = new InMemoryPaymentsRepository(() => clock.now());
    const notifier = new RecordingNotifier();
    repo.addUser('sara');
    repo.batches.set('b08', {
      id: 'b08', code: 'B08', status: 'ENROLLING', capacity: 5, waitlistEnabled: true, priceFils: 100_000, timezone: 'Asia/Dubai',
      teacherId: 'lina', courseId: 'pdf', courseTitle: 'PDF', firstSessionAt: new Date('2026-12-01T14:00:00Z'),
    });
    repo.bankAccounts.push({ id: 'enbd', bankName: 'ENBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 });
    const machine = new EnrollmentStateMachine();
    const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
    return new CheckoutService(
      repo,
      new CheckoutStrategyRegistry([new BankTransferCheckout(repo, notifier, async () => (await rulesOf.rules()).bankTransferHoldHours)]),
      new PriceCalculator(999), // never used: the quote awaits the VAT below
      { rateFor: async () => 1 },
      machine,
      lifecycle,
      new ReferenceGenerator(),
      notifier,
      async () => (await rulesOf.rules()).vatPercent,
    );
  }

  test('a cache older than the TTL is reloaded before the quote and the hold use it', async () => {
    const repo = new MemSiteSettings();
    const writer = build(repo);
    const other = build(repo); // another API instance
    const checkout = checkoutOn(other.svc);
    expect((await checkout.quote({ batchId: 'b08', displayCurrency: 'AED' })).totalFils).toBe(105_000); // loads and caches

    await writer.svc.updateRules({ vatPercent: 10, bankTransferHoldHours: 3 });
    other.now.advance(29_999);
    expect((await checkout.quote({ batchId: 'b08', displayCurrency: 'AED' })).totalFils).toBe(105_000); // within the TTL
    other.now.advance(1);
    const readsBefore = repo.reads;
    expect((await checkout.quote({ batchId: 'b08', displayCurrency: 'AED' })).totalFils).toBe(110_000); // stale → reloaded first
    expect(repo.reads).toBe(readsBefore + 1);

    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error('unexpected waitlist');
    expect(res.order.vatFils).toBe(10_000);
    expect(res.order.expiresAt?.toISOString()).toBe('2026-11-02T13:00:00.000Z');
  });

  test('earnings use the hold days in effect when they accrue', async () => {
    const { svc } = build();
    const earnings: Array<{ availableAt: Date }> = [];
    const endedAt = new Date('2026-11-01T10:00:00Z');
    const payoutRepo = {
      sessionForAccrual: async (id: string) => ({
        id, status: 'ENDED' as const, endedAt, endsAt: endedAt, hostId: null, batchId: 'b1',
        batch: { teacherId: 't1', course: { type: 'LIVE' as const, teacherCutPercent: null }, schedule: { sessionCount: 10 }, _count: { sessions: 10 } },
      }),
      batchOrders: async () => [{ totalFils: 105_000, vatFils: 5_000, refundedFils: 0, feeFils: 0 }],
      upsertSessionEarning: async (d: { availableAt: Date }) => (earnings.push(d), d),
    };
    const payouts = new PayoutService(payoutRepo as never, new EarningsCalculator(), new SettingsService(new MemCuts()), {} as never, { now: () => endedAt } as never, async () => {
      const r = await svc.rules();
      return { earningHoldDays: r.earningHoldDays, minPayoutFils: r.minPayoutAed * 100 };
    });
    await payouts.accrueForSession('s1');
    await svc.updateRules({ earningHoldDays: 2 });
    await payouts.accrueForSession('s2');
    expect(earnings.map((e) => e.availableAt.toISOString())).toEqual(['2026-11-15T10:00:00.000Z', '2026-11-03T10:00:00.000Z']);
  });
});

describe('CourseService.resyncRecordedStripePrices', () => {
  const course = (id: string, over: Partial<CourseRecord> = {}) =>
    ({ id, titleEn: id, type: 'RECORDED', status: 'PUBLISHED', monthlyPriceFils: 10_000, yearlyPriceFils: 100_000, stripeProductId: `prod_${id}`, stripeMonthlyPriceId: 'old_m', stripeYearlyPriceId: 'old_y', ...over }) as CourseRecord;

  test('re-syncs every priced published recorded course and keeps going after a failure', async () => {
    const rows = [course('a'), course('b'), course('free', { monthlyPriceFils: null })];
    const filters: unknown[] = [];
    const updates: Array<[string, unknown]> = [];
    const repo = {
      list: async (f: unknown) => (filters.push(f), { items: rows, total: rows.length }),
      update: async (id: string, d: unknown) => (updates.push([id, d]), rows.find((r) => r.id === id)!),
    } as unknown as CourseRepository;
    let vat = 7;
    const gateway = new FakePaymentGateway(new PriceCalculator(() => vat));
    const payments = {
      upsertRecordedProduct: async (args: Parameters<FakePaymentGateway['upsertRecordedProduct']>[0]) => {
        if (args.courseId === 'b') throw new Error('stripe down');
        return gateway.upsertRecordedProduct(args);
      },
    };
    const service = new CourseService(repo, new RecordingNotifier(), { now: () => new Date() }, undefined, payments);
    const totals = await service.resyncRecordedStripePrices(() => {});
    expect(totals).toEqual({ synced: 1, failed: 1, skipped: 1 });
    expect(filters[0]).toMatchObject({ type: 'RECORDED', status: 'PUBLISHED' });
    expect(updates).toEqual([['a', { stripeProductId: 'prod_a', stripeMonthlyPriceId: 'price_fake_m_10700', stripeYearlyPriceId: 'price_fake_y_107000' }]]);
  });
});

describe('contact validation', () => {
  test('bad URLs and WhatsApp digits are refused; blanks clear', () => {
    expect(contactSettingsInput.safeParse({ socials: { instagram: 'not a url' } }).success).toBe(false);
    expect(contactSettingsInput.safeParse({ socials: { instagram: 'http://instagram.com/azza' } }).success).toBe(false); // https only
    expect(contactSettingsInput.safeParse({ socials: { myspace: 'https://myspace.com/a' } }).success).toBe(false);
    expect(contactSettingsInput.safeParse({ whatsappNumber: '+971501234567' }).success).toBe(false);
    expect(contactSettingsInput.safeParse({ whatsappNumber: '97150 123 4567' }).success).toBe(false);
    expect(contactSettingsInput.safeParse({ whatsappNumber: '1234567' }).success).toBe(false); // < 8
    expect(contactSettingsInput.safeParse({ whatsappNumber: '1234567890123456' }).success).toBe(false); // > 15
    expect(contactSettingsInput.safeParse({ contactEmail: 'nope' }).success).toBe(false);
    expect(contactSettingsInput.safeParse({ contactPhone: '050 123 4567' }).success).toBe(false); // E.164 only
    expect(contactSettingsInput.safeParse({ addressEn: 'x'.repeat(301) }).success).toBe(false);
    expect(contactSettingsInput.parse({ whatsappNumber: '971501234567', contactPhone: '+971501234567', contactEmail: '', socials: { x: '' } })).toEqual({
      whatsappNumber: '971501234567',
      contactPhone: '+971501234567',
      contactEmail: null,
      socials: { x: null },
    });
  });

  test('socials merge: null removes one link, others stay', async () => {
    const { svc } = build();
    await svc.updateContact({ socials: { instagram: 'https://instagram.com/azza', x: 'https://x.com/azza' } });
    const view = await svc.updateContact({ whatsappNumber: '971501234567', socials: { x: null } });
    expect(view.socials).toEqual({ instagram: 'https://instagram.com/azza' });
    expect(view.contact).toEqual({ contactEmail: null, contactPhone: null, whatsappNumber: '971501234567', addressEn: null, addressAr: null });
  });
});

describe('HTTP', () => {
  const user = (role: CurrentUser['role']): CurrentUser => ({ id: 'u1', name: 'U', email: 'u@x.test', role, locale: 'en', timezone: 'Asia/Dubai' });
  const make = (who: CurrentUser | null) => {
    const { svc, repo } = build();
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => (c.set('user', who), next()));
    a.route('/admin', adminRoutes({} as never, svc));
    a.route('/admin', adminSettingsRoutes(new SettingsService(new MemCuts()), svc));
    a.route('/', siteSettingsRoutes(svc));
    return { app: a, svc, repo };
  };
  const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('GET /site-settings is public, cacheable, and returns only the set socials', async () => {
    const { app, svc } = make(null);
    await svc.updateContact({ contactEmail: 'hello@azza.test', whatsappNumber: '971501234567', socials: { instagram: 'https://instagram.com/azza', tiktok: null } });
    const res = await app.request('/site-settings');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await res.json()).toEqual({
      contactEmail: 'hello@azza.test',
      contactPhone: null,
      whatsappNumber: '971501234567',
      addressEn: null,
      addressAr: null,
      socials: { instagram: 'https://instagram.com/azza' },
    });
  });

  test('admin settings endpoints are admin-only', async () => {
    for (const [who, status] of [[null, 401], [user('STUDENT'), 403], [user('TEACHER'), 403]] as const) {
      const { app } = make(who);
      expect((await app.request('/admin/settings')).status).toBe(status);
      expect((await app.request('/admin/settings/rules', json('PUT', { vatPercent: 1 }))).status).toBe(status);
      expect((await app.request('/admin/settings/contact', json('PUT', { contactPhone: '+971501234567' }))).status).toBe(status);
    }
  });

  test('admins read and update; bad input is a 400', async () => {
    const { app, repo } = make(user('ADMIN'));
    const get = await (await app.request('/admin/settings')).json();
    expect(get).toEqual({
      rules: { VAT_PERCENT: 5, EARNING_HOLD_DAYS: 14, MIN_PAYOUT_AED: 200, BANK_TRANSFER_HOLD_HOURS: 48, TEACHER_SHARE_PERCENT: 70 },
      ruleDefaults: { VAT_PERCENT: 5, EARNING_HOLD_DAYS: 14, MIN_PAYOUT_AED: 200, BANK_TRANSFER_HOLD_HOURS: 48 },
      integrations: INTEGRATIONS,
      contact: { contactEmail: null, contactPhone: null, whatsappNumber: null, addressEn: null, addressAr: null },
      socials: {},
    });
    const put = await app.request('/admin/settings/rules', json('PUT', { vatPercent: 8 }));
    expect(put.status).toBe(200);
    expect((await put.json()).rules.VAT_PERCENT).toBe(8);
    expect(repo.row?.vatPercent).toBe(8);

    const bad = await app.request('/admin/settings/contact', json('PUT', { whatsappNumber: '+97150' }));
    expect(bad.status).toBe(400);
    expect((await app.request('/admin/settings/contact', json('PUT', { socials: { x: 'ftp://x.com' } }))).status).toBe(400);
    expect((await app.request('/admin/settings/rules', json('PUT', { vatPercent: 50 }))).status).toBe(400);
    const ok = await app.request('/admin/settings/contact', json('PUT', { addressEn: 'Dubai', socials: { youtube: 'https://youtube.com/@azza' } }));
    expect(await ok.json()).toMatchObject({ contact: { addressEn: 'Dubai' }, socials: { youtube: 'https://youtube.com/@azza' } });
  });
});
