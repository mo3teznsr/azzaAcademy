import { describe, expect, test } from 'bun:test';
import type { AppError } from '../src/core/errors';
import type { AppleNotification, AppleSignedDataVerifier, AppleTransaction } from '../src/core/ports';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { AppleIapService } from '../src/modules/payments/apple/apple-iap.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import type {
  NewSubscription,
  NewSubscriptionPayment,
  SubscribableCourse,
  SubscriptionPatch,
  SubscriptionPaymentRow,
  SubscriptionRepository,
  SubscriptionRow,
  SubscriptionUser,
} from '../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../src/modules/subscriptions/subscription.service';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code ?? null);
const DAY = 86_400_000;
const T0 = new Date('2026-11-20T10:00:00Z');
const MONTH_END = new Date(T0.getTime() + 30 * DAY);
const MONTHLY = 'com.futuretech.azza.rec.logo-design.monthly';
const YEARLY = 'com.futuretech.azza.rec.logo-design.yearly';

const COURSE: SubscribableCourse = {
  id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', coverImageUrl: null, type: 'RECORDED', status: 'PUBLISHED',
  monthlyPriceFils: 10_000, yearlyPriceFils: 100_000, stripeMonthlyPriceId: 'price_m', stripeYearlyPriceId: 'price_y',
  appleMonthlyProductId: MONTHLY, appleYearlyProductId: YEARLY,
};
const NO_APPLE: SubscribableCourse = { ...COURSE, id: 'nc', slug: 'no-apple', appleMonthlyProductId: null, appleYearlyProductId: null };
const sam = { id: 'sam', name: 'Sam', email: 'sam@example.com', locale: 'en' };

type Pay = NewSubscriptionPayment & { id: string; refundedFils: number };

class MemRepo implements SubscriptionRepository {
  courses = [COURSE, NO_APPLE];
  users: SubscriptionUser[] = [sam];
  subs: SubscriptionRow[] = [];
  payments: Pay[] = [];
  seq = 0;
  constructor(private clock: () => Date) {}
  async findCourse(k: string) { return this.courses.find((c) => c.id === k || c.slug === k) ?? null; }
  async courseOf(id: string) { return this.courses.find((c) => c.id === id) ?? null; }
  async findUser(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async forUserCourse(u: string, c: string) { return this.subs.filter((s) => s.userId === u && s.courseId === c); }
  async create(d: NewSubscription) {
    const row: SubscriptionRow = {
      ...d, id: `sub${++this.seq}`, providerSubscriptionId: null, stripeCustomerId: null, stripeCheckoutSessionId: null,
      appleOriginalTransactionId: null, appleAppAccountToken: d.appleAppAccountToken ?? null, pendingPlan: null,
      currentPeriodEnd: null, cancelAtPeriodEnd: false, createdAt: this.clock(), updatedAt: this.clock(),
    };
    this.subs.push(row);
    return row;
  }
  async findById(id: string) { return this.subs.find((s) => s.id === id) ?? null; }
  async findByProviderSubscriptionId(id: string) { return this.subs.find((s) => s.providerSubscriptionId === id) ?? null; }
  async update(id: string, patch: SubscriptionPatch) {
    const i = this.subs.findIndex((s) => s.id === id);
    this.subs[i] = { ...this.subs[i]!, ...patch, updatedAt: this.clock() };
    return this.subs[i]!;
  }
  async listForUser() { return []; }
  async nextLessonId() { return null; }
  async paymentReferenceTaken(r: string) { return this.payments.some((p) => p.reference === r); }
  async upsertPayment(d: NewSubscriptionPayment) {
    const ex = this.payments.find((p) => p.providerPaymentId === d.providerPaymentId);
    if (ex) return { id: ex.id, created: false };
    const p: Pay = { ...d, id: `pay${this.payments.length}`, refundedFils: d.refundedFils ?? 0 };
    this.payments.push(p);
    return { id: p.id, created: true };
  }
  async findByAppleToken(t: string) { return this.subs.find((s) => s.appleAppAccountToken === t) ?? null; }
  async findByAppleOriginalTransactionId(id: string) { return this.subs.find((s) => s.appleOriginalTransactionId === id) ?? null; }
  async paymentByProviderId(id: string): Promise<SubscriptionPaymentRow | null> {
    const p = this.payments.find((x) => x.providerPaymentId === id);
    return p ? { id: p.id, subscriptionId: p.subscriptionId, status: p.status, totalFils: p.totalFils, refundedFils: p.refundedFils, periodEnd: p.periodEnd } : null;
  }
  refundCalls = 0;
  async refundPayment(id: string, refundedFils: number) {
    this.refundCalls++;
    const p = this.payments.find((x) => x.id === id)!;
    p.status = 'REFUNDED';
    p.refundedFils = refundedFils;
  }
  async failureNoticeSent() { return false; }
}

class FakeVerifier implements AppleSignedDataVerifier {
  txs = new Map<string, AppleTransaction>();
  notificationQueue: AppleNotification | null = null;
  async verifyTransaction(jws: string) {
    const t = this.txs.get(jws);
    if (!t) throw new Error('bad signature');
    return t;
  }
  async verifyNotification(): Promise<AppleNotification> {
    if (!this.notificationQueue) throw new Error('bad signature');
    return this.notificationQueue;
  }
}

const tx = (over: Partial<AppleTransaction> = {}): AppleTransaction => ({
  transactionId: 't1', originalTransactionId: 'o1', productId: YEARLY, environment: 'Sandbox',
  appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001', purchaseDate: T0, priceMilliunits: 1_050_000, currency: 'AED',
  revocationDate: null, expiresDate: MONTH_END, type: 'Auto-Renewable Subscription', ...over,
});
const note = (notificationType: string, subtype: string | null, transaction: AppleTransaction, over: Partial<AppleNotification> = {}): AppleNotification => ({
  notificationUUID: `n-${notificationType}-${subtype}-${transaction.transactionId}`, notificationType, subtype, environment: 'Sandbox', transaction, ...over,
});

function setup() {
  let at = T0;
  const notifier = new RecordingNotifier();
  const repo = new MemRepo(() => at);
  const verifier = new FakeVerifier();
  const accrued: string[] = [];
  const reversed: Array<[string, number]> = [];
  let tokenSeq = 0;
  const logged: string[] = [];
  const payouts = {
    accrueForSubscriptionPayment: async (id: string) => { accrued.push(id); return null; },
    reverseSubscriptionPayment: async (id: string, fils: number) => { reversed.push([id, fils]); return null; },
  };
  const service = new SubscriptionService(
    repo, new FakePaymentGateway(new PriceCalculator(5)), notifier, payouts, { now: () => at }, new ReferenceGenerator(), new PriceCalculator(5),
    'https://azza.test', (m) => logged.push(m), verifier, () => `AAAAAAAA-0000-4000-8000-00000000000${++tokenSeq}`,
  );
  const apple = new AppleIapService({} as never, verifier, {} as never, {} as never, service);
  const notify = (n: AppleNotification) => {
    verifier.notificationQueue = n;
    return apple.handleNotification('jws-n');
  };
  return { repo, verifier, service, apple, notifier, accrued, reversed, logged, notify, setNow: (d: Date) => { at = d; } };
}


/** A learner who tapped subscribe (INCOMPLETE row `sub1`) and finished the purchase (verified). */
async function active(plan: 'MONTHLY' | 'YEARLY' = 'YEARLY') {
  const ctx = setup();
  const res = await ctx.service.subscribe('sam', 'logo-design', { plan, method: 'APPLE_IAP' });
  ctx.verifier.txs.set('jws-1', tx({ productId: plan === 'YEARLY' ? YEARLY : MONTHLY, appAccountToken: res.appAccountToken }));
  const verified = await ctx.service.verifyApple('sam', 'jws-1');
  return { ...ctx, res, verified };
}

describe('apple subscribe', () => {
  test('returns the course product id, a lower-case token and the reference', async () => {
    const { service, repo } = setup();
    const res = await service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    expect(res).toEqual({ productId: YEARLY, appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001', reference: 'sub1' });
    expect(repo.subs[0]).toMatchObject({ provider: 'APPLE', status: 'INCOMPLETE', plan: 'YEARLY', priceFils: 100_000, appleAppAccountToken: res.appAccountToken });
  });

  test('a missing product is APPLE_PRODUCT_MISSING', async () => {
    const { service } = setup();
    expect(await codeOf(service.subscribe('sam', 'no-apple', { plan: 'MONTHLY', method: 'APPLE_IAP' }))).toBe('APPLE_PRODUCT_MISSING');
  });

  test('an unfinished Apple row is reused for the requested plan', async () => {
    const { service, repo } = setup();
    const a = await service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    const b = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    expect(b).toEqual({ productId: MONTHLY, appAccountToken: a.appAccountToken, reference: a.reference });
    expect(repo.subs).toHaveLength(1);
    expect(repo.subs[0]).toMatchObject({ plan: 'MONTHLY', priceFils: 10_000 });
  });

  test('Stripe live then Apple is ALREADY_SUBSCRIBED, and the other way round', async () => {
    const a = setup();
    await a.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' });
    await a.repo.update('sub1', { status: 'ACTIVE', providerSubscriptionId: 'sub_st1', currentPeriodEnd: MONTH_END });
    expect(await codeOf(a.service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' }))).toBe('ALREADY_SUBSCRIBED');

    const b = await active();
    expect(await codeOf(b.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
  });

  test('cancel, resume, switch and portal answer MANAGED_BY_APPLE', async () => {
    const { service } = await active();
    expect(await codeOf(service.cancel('sub1', 'sam'))).toBe('MANAGED_BY_APPLE');
    expect(await codeOf(service.resume('sub1', 'sam'))).toBe('MANAGED_BY_APPLE');
    expect(await codeOf(service.switchPlan('sub1', 'sam', { plan: 'MONTHLY' }))).toBe('MANAGED_BY_APPLE');
    expect(await codeOf(service.portal('sub1', 'sam'))).toBe('MANAGED_BY_APPLE');
  });
});

describe('apple verify', () => {
  test('activates, records the period and one payment with VAT carved from Apple\'s AED price', async () => {
    const { repo, verified, accrued, notifier } = await active();
    expect(verified.status).toBe('ACTIVE');
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', appleOriginalTransactionId: 'o1', currentPeriodEnd: MONTH_END });
    expect(repo.payments).toHaveLength(1);
    expect(repo.payments[0]).toMatchObject({ providerPaymentId: 't1', totalFils: 105_000, subtotalFils: 100_000, vatFils: 5_000, feeFils: 0, status: 'PAID', periodEnd: MONTH_END });
    expect(accrued).toEqual(['pay0']);
    expect(notifier.types()).toContain('SUBSCRIPTION_ACTIVE');
    expect(notifier.types()).toContain('SUBSCRIPTION_RECEIPT');
  });

  test('without an Apple AED price the course price plus VAT is used', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    ctx.verifier.txs.set('j', tx({ productId: MONTHLY, appAccountToken: res.appAccountToken, priceMilliunits: null, currency: null }));
    await ctx.service.verifyApple('sam', 'j');
    expect(ctx.repo.payments[0]).toMatchObject({ totalFils: 10_500, subtotalFils: 10_000, vatFils: 500 });
  });

  test('verifying twice is a no-op', async () => {
    const { service, repo, accrued } = await active();
    await service.verifyApple('sam', 'jws-1');
    expect(repo.payments).toHaveLength(1);
    expect(accrued).toHaveLength(1);
  });

  test('rejections: another account, another course\'s product, unknown purchase', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    ctx.verifier.txs.set('a', tx({ productId: MONTHLY, appAccountToken: res.appAccountToken }));
    ctx.repo.users.push({ id: 'eve', name: 'Eve', email: 'e@x.com', locale: 'en' });
    expect(await codeOf(ctx.service.verifyApple('eve', 'a'))).toBe('FOREIGN_SUBSCRIPTION');
    ctx.verifier.txs.set('b', tx({ productId: 'com.futuretech.azza.rec.other.monthly', appAccountToken: res.appAccountToken }));
    expect(await codeOf(ctx.service.verifyApple('sam', 'b'))).toBe('PRODUCT_MISMATCH');
    ctx.verifier.txs.set('c', tx({ appAccountToken: 'bbbbbbbb-0000-4000-8000-000000000002', originalTransactionId: 'zz' }));
    expect(await codeOf(ctx.service.verifyApple('sam', 'c'))).toBe('NOT_FOUND');
  });
});

describe('apple notifications', () => {
  const renew = (id: string, end: Date, over: Partial<AppleTransaction> = {}) => tx({ transactionId: id, purchaseDate: MONTH_END, expiresDate: end, ...over });

  test('a replayed DID_RENEW creates one payment, one earning and one receipt', async () => {
    const { notify, repo, accrued, notifier } = await active();
    const end2 = new Date(MONTH_END.getTime() + 365 * DAY);
    const n = note('DID_RENEW', null, renew('t2', end2));
    expect((await notify(n)).handled).toBe(true);
    const again = await notify(n);
    expect(again).toMatchObject({ handled: true, duplicate: true });
    expect(repo.payments.map((p) => p.providerPaymentId)).toEqual(['t1', 't2']);
    expect(accrued).toHaveLength(2);
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_RECEIPT')).toHaveLength(2);
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: end2 });
  });

  test('SUBSCRIBED arriving after verify adds nothing', async () => {
    const { notify, repo } = await active();
    await notify(note('SUBSCRIBED', 'INITIAL_BUY', tx()));
    expect(repo.payments).toHaveLength(1);
  });

  test('SUBSCRIBED before verify activates the row by token', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    await ctx.notify(note('SUBSCRIBED', 'INITIAL_BUY', tx({ appAccountToken: res.appAccountToken })));
    expect(ctx.repo.subs[0]).toMatchObject({ status: 'ACTIVE', appleOriginalTransactionId: 'o1' });
  });

  test('DID_FAIL_TO_RENEW then GRACE_PERIOD_EXPIRED goes PAST_DUE then EXPIRED, and replays are safe', async () => {
    const { notify, repo } = await active();
    await notify(note('DID_FAIL_TO_RENEW', 'GRACE_PERIOD', tx()));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    // an old DID_RENEW replay must not undo the failure
    await notify(note('DID_RENEW', null, tx()));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    await notify(note('GRACE_PERIOD_EXPIRED', null, tx()));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(await notify(note('GRACE_PERIOD_EXPIRED', null, tx()))).toMatchObject({ duplicate: true });
  });

  test('a DID_RENEW after recovering from PAST_DUE reactivates', async () => {
    const { notify, repo } = await active();
    await notify(note('DID_FAIL_TO_RENEW', 'GRACE_PERIOD', tx()));
    await notify(note('DID_RENEW', 'BILLING_RECOVERY', renew('t2', new Date(MONTH_END.getTime() + 365 * DAY))));
    expect(repo.subs[0]?.status).toBe('ACTIVE');
  });

  test('EXPIRED ends the plan', async () => {
    const { notify, repo } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
  });

  test('AUTO_RENEW_DISABLED gives CANCELLING and AUTO_RENEW_ENABLED undoes it', async () => {
    const { notify, repo } = await active();
    await notify(note('DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_DISABLED', tx()));
    expect(repo.subs[0]).toMatchObject({ status: 'CANCELLING', cancelAtPeriodEnd: true });
    await notify(note('DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_ENABLED', tx()));
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', cancelAtPeriodEnd: false });
  });

  test('DID_CHANGE_RENEWAL_PREF stores the plan and DID_RENEW applies it', async () => {
    const { notify, repo } = await active('YEARLY');
    await notify(note('DID_CHANGE_RENEWAL_PREF', 'DOWNGRADE', tx(), { renewalProductId: MONTHLY }));
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', pendingPlan: 'MONTHLY' });
    await notify(note('DID_RENEW', null, renew('t2', new Date(MONTH_END.getTime() + 30 * DAY), { productId: MONTHLY, priceMilliunits: 105_000 })));
    expect(repo.subs[0]).toMatchObject({ plan: 'MONTHLY', pendingPlan: null, priceFils: 10_000 });
    expect(repo.payments[1]).toMatchObject({ plan: 'MONTHLY', totalFils: 10_500 });
  });

  test('choosing the current plan again clears the pending change', async () => {
    const { notify, repo } = await active('YEARLY');
    await notify(note('DID_CHANGE_RENEWAL_PREF', 'DOWNGRADE', tx(), { renewalProductId: MONTHLY }));
    await notify(note('DID_CHANGE_RENEWAL_PREF', null, tx(), { renewalProductId: YEARLY }));
    expect(repo.subs[0]?.pendingPlan).toBeNull();
  });

  test('REFUND marks the payment REFUNDED, reverses the earning once and expires the row', async () => {
    const { notify, repo, reversed } = await active();
    const n = note('REFUND', null, tx({ revocationDate: T0 }));
    expect((await notify(n)).handled).toBe(true);
    expect(repo.payments[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 105_000 });
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(reversed).toEqual([['pay0', 105_000]]);
    expect(await notify(n)).toMatchObject({ duplicate: true });
    expect(reversed).toHaveLength(1);
  });

  test('a failing reversal is logged and does not fail the notification', async () => {
    const ctx = await active();
    const bad = new SubscriptionService(
      ctx.repo, new FakePaymentGateway(new PriceCalculator(5)), ctx.notifier,
      { accrueForSubscriptionPayment: async () => null, reverseSubscriptionPayment: async () => { throw new Error('boom'); } },
      { now: () => T0 }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test', (m) => ctx.logged.push(m),
    );
    const out = await bad.handleAppleNotification(note('REVOKE', null, tx()));
    expect(out.handled).toBe(true);
    expect(ctx.logged.some((m) => m.includes('reverseSubscriptionPayment'))).toBe(true);
  });

  test('unknown rows and non-subscription products are not handled here', async () => {
    const { notify } = await active();
    expect((await notify(note('DID_RENEW', null, tx({ originalTransactionId: 'nope', appAccountToken: null })))).handled).toBe(false);
  });
});

describe('apple fix round 1', () => {
  const renew = (id: string, end: Date, over: Partial<AppleTransaction> = {}) => tx({ transactionId: id, purchaseDate: MONTH_END, expiresDate: end, ...over });
  const END2 = new Date(MONTH_END.getTime() + 365 * DAY);

  test('a lapsed learner who subscribes again reuses the ended row and is activated by the same original transaction', async () => {
    const { service, notify, repo, verifier, setNow } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    setNow(new Date(MONTH_END.getTime() + 10 * DAY));
    const res = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    expect(res.reference).toBe('sub1');
    expect(res.appAccountToken).toBe('aaaaaaaa-0000-4000-8000-000000000001'); // the row keeps its token
    expect(repo.subs).toHaveLength(1);
    expect(repo.subs[0]).toMatchObject({ status: 'INCOMPLETE', plan: 'MONTHLY', priceFils: 10_000, appleOriginalTransactionId: 'o1' });
    verifier.txs.set('jws-2', tx({ transactionId: 't2', productId: MONTHLY, appAccountToken: res.appAccountToken, purchaseDate: new Date(MONTH_END.getTime() + 10 * DAY), expiresDate: END2, priceMilliunits: 105_000 }));
    const out = await service.verifyApple('sam', 'jws-2');
    expect(out.status).toBe('ACTIVE');
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', plan: 'MONTHLY', currentPeriodEnd: END2 });
    expect(repo.payments.map((p) => p.providerPaymentId)).toEqual(['t1', 't2']);
  });

  test('Stripe subscribe is refused over a recent INCOMPLETE Apple row, and may replace one older than a day', async () => {
    const ctx = setup();
    await ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    expect(await codeOf(ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
    expect(ctx.repo.subs[0]?.status).toBe('INCOMPLETE');
    ctx.setNow(new Date(T0.getTime() + 25 * 3_600_000));
    await ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' });
    expect(ctx.repo.subs.map((r) => [r.provider, r.status])).toEqual([['APPLE', 'EXPIRED'], ['STRIPE', 'INCOMPLETE']]);
  });

  test('an Apple payment on an expired row is recorded once and flagged for a manual refund', async () => {
    const { notify, service, repo, logged, accrued } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' }); // another live plan now exists
    const n = note('DID_RENEW', null, renew('t2', END2));
    await notify(n);
    await notify(n);
    expect(repo.payments.map((p) => p.providerPaymentId)).toEqual(['t1', 't2']);
    expect(repo.subs.find((r) => r.provider === 'APPLE')?.status).toBe('EXPIRED');
    expect(logged.filter((m) => m.includes('manual refund needed: Apple payment on an expired row'))).toHaveLength(1);
    expect(accrued).toHaveLength(1);
  });

  test('a late DID_FAIL_TO_RENEW for an older period leaves a renewed row ACTIVE', async () => {
    const { notify, repo } = await active();
    await notify(note('DID_RENEW', null, renew('t2', END2)));
    await notify(note('DID_FAIL_TO_RENEW', 'GRACE_PERIOD', tx()));
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: END2 });
  });

  test('a late EXPIRED or GRACE_PERIOD_EXPIRED for an older period does not expire a renewed row', async () => {
    const { notify, repo } = await active();
    await notify(note('DID_RENEW', null, renew('t2', END2)));
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    await notify(note('GRACE_PERIOD_EXPIRED', null, tx()));
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: END2 });
  });

  test('a late older renewal records its payment but keeps the plan and price', async () => {
    const { notify, repo } = await active('YEARLY');
    await notify(note('DID_RENEW', null, renew('t2', END2)));
    await notify(note('DID_RENEW', null, renew('t0', new Date(MONTH_END.getTime() + 10 * DAY), { productId: MONTHLY, priceMilliunits: 105_000 })));
    expect(repo.payments.map((p) => p.providerPaymentId)).toEqual(['t1', 't2', 't0']);
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', priceFils: 100_000, currentPeriodEnd: END2 });
  });

  test('the plan comes from the product charged; a matching pending plan is cleared', async () => {
    const { notify, repo } = await active('YEARLY');
    await notify(note('DID_CHANGE_RENEWAL_PREF', 'DOWNGRADE', tx(), { renewalProductId: MONTHLY }));
    await notify(note('DID_RENEW', null, renew('t2', new Date(MONTH_END.getTime() + 30 * DAY), { productId: YEARLY })));
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', pendingPlan: 'MONTHLY' }); // Apple still charged yearly: pending stays
    await notify(note('DID_RENEW', null, renew('t3', new Date(MONTH_END.getTime() + 60 * DAY), { productId: MONTHLY, priceMilliunits: 105_000 })));
    expect(repo.subs[0]).toMatchObject({ plan: 'MONTHLY', pendingPlan: null, priceFils: 10_000 });
  });

  test('DID_CHANGE_RENEWAL_PREF without the chosen product is ignored', async () => {
    const { notify, repo } = await active('YEARLY');
    const out = await notify(note('DID_CHANGE_RENEWAL_PREF', 'DOWNGRADE', tx()));
    expect(out.handled).toBe(false);
    expect(repo.subs[0]?.pendingPlan).toBeNull();
  });

  test('refunding an older renewal reverses only that payment and keeps the row running', async () => {
    const { notify, repo, reversed } = await active();
    await notify(note('DID_RENEW', null, renew('t2', END2)));
    await notify(note('REFUND', null, tx({ revocationDate: T0 })));
    expect(repo.payments.map((p) => p.status)).toEqual(['REFUNDED', 'PAID']);
    expect(repo.subs[0]?.status).toBe('ACTIVE');
    expect(reversed).toEqual([['pay0', 105_000]]);
    await notify(note('REFUND', null, renew('t2', END2, { revocationDate: T0 })));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(reversed).toHaveLength(2);
  });

  test('a REFUND before any payment expires the row and a later verify of that transaction cannot revive it', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    await ctx.notify(note('REFUND', null, tx({ appAccountToken: res.appAccountToken, revocationDate: T0 })));
    expect(ctx.repo.subs[0]?.status).toBe('EXPIRED');
    expect(ctx.repo.payments[0]).toMatchObject({ providerPaymentId: 't1', status: 'REFUNDED', refundedFils: 105_000 });
    expect(ctx.reversed).toHaveLength(0);
    ctx.verifier.txs.set('j', tx({ appAccountToken: res.appAccountToken }));
    const out = await ctx.service.verifyApple('sam', 'j');
    expect(out.status).toBe('EXPIRED');
    expect(ctx.repo.subs[0]?.status).toBe('EXPIRED');
    expect(ctx.accrued).toHaveLength(0);
  });

  test('a missing course price falls back to the locked price and is logged', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    ctx.repo.courses[0] = { ...COURSE, monthlyPriceFils: null };
    ctx.verifier.txs.set('j', tx({ productId: MONTHLY, appAccountToken: res.appAccountToken, priceMilliunits: null, currency: null }));
    await ctx.service.verifyApple('sam', 'j');
    expect(ctx.repo.payments[0]?.totalFils).toBe(10_500);
    expect(ctx.logged.some((m) => m.includes('has no MONTHLY price'))).toBe(true);
  });

  test('a retry over a reopened INCOMPLETE row is not refused: same token, any plan', async () => {
    const { service, notify, repo, setNow } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    setNow(new Date(MONTH_END.getTime() + DAY));
    const first = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    const again = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    const other = await service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    expect(new Set([first.appAccountToken, again.appAccountToken, other.appAccountToken]).size).toBe(1);
    expect(other).toMatchObject({ productId: YEARLY, reference: 'sub1' });
    expect(repo.subs).toHaveLength(1);
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', priceFils: 100_000, appleAppAccountToken: other.appAccountToken });
  });

  test('stale DID_FAIL_TO_RENEW, GRACE_PERIOD_EXPIRED and EXPIRED of the old chain leave a reopened INCOMPLETE row alone (no access)', async () => {
    const { service, notify, repo, setNow } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    setNow(new Date(MONTH_END.getTime() + DAY));
    await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    expect(repo.subs[0]?.status).toBe('INCOMPLETE');
    const before = { ...repo.subs[0]! };
    for (const n of [note('DID_FAIL_TO_RENEW', 'GRACE_PERIOD', tx(), { notificationUUID: 'late-1' }), note('GRACE_PERIOD_EXPIRED', null, tx(), { notificationUUID: 'late-2' }), note('EXPIRED', 'VOLUNTARY', tx(), { notificationUUID: 'late-3' })]) {
      expect(await notify(n)).toMatchObject({ handled: true, duplicate: true });
      // PAST_DUE here would grant the 16-day grace on the old period end to someone who has not paid again.
      expect(repo.subs[0]).toMatchObject({ status: 'INCOMPLETE', currentPeriodEnd: before.currentPeriodEnd, plan: 'MONTHLY' });
    }
  });

  test('a reopened row is protected by when it was reopened, not by createdAt', async () => {
    const { service, notify, setNow } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    const reopenedAt = new Date(T0.getTime() + 40 * DAY);
    setNow(reopenedAt);
    await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    setNow(new Date(reopenedAt.getTime() + 3_600_000));
    expect(await codeOf(service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
    setNow(new Date(reopenedAt.getTime() + 25 * 3_600_000));
    expect(await codeOf(service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' }))).toBeNull();
  });

  test('a re-subscribe from a different Apple ID is matched by token and takes the new original id', async () => {
    const { service, notify, repo, verifier, setNow } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    setNow(new Date(MONTH_END.getTime() + DAY));
    const res = await service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    verifier.txs.set('jws-9', tx({ transactionId: 't9', originalTransactionId: 'o9', appAccountToken: res.appAccountToken, purchaseDate: new Date(MONTH_END.getTime() + DAY), expiresDate: END2 }));
    const out = await service.verifyApple('sam', 'jws-9');
    expect(out.status).toBe('ACTIVE');
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', appleOriginalTransactionId: 'o9', currentPeriodEnd: END2 });
  });

  test('a token match is refused with 409 when another row already holds the new original id', async () => {
    const ctx = await active();
    ctx.repo.users.push({ id: 'eve', name: 'Eve', email: 'e@x.com', locale: 'en' });
    const res = await ctx.service.subscribe('eve', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    // Eve's purchase carries Sam's original transaction id (same Apple ID), but Eve's own token.
    ctx.verifier.txs.set('x', tx({ transactionId: 't7', appAccountToken: res.appAccountToken }));
    expect(await codeOf(ctx.service.verifyApple('eve', 'x'))).toBe('APPLE_ACCOUNT_CONFLICT');
    expect(ctx.logged.some((m) => m.includes('belongs to subscription'))).toBe(true);
    expect(ctx.repo.subs.find((r) => r.userId === 'eve')?.status).toBe('INCOMPLETE');
  });

  test('the refund-before-payment tombstone is written REFUNDED in one step and a redelivery reverses nothing', async () => {
    const ctx = setup();
    const res = await ctx.service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    const n = note('REFUND', null, tx({ appAccountToken: res.appAccountToken, revocationDate: T0 }));
    await ctx.notify(n);
    expect(ctx.repo.payments[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 105_000 });
    expect(ctx.repo.refundCalls).toBe(0);
    expect(await ctx.notify(n)).toMatchObject({ duplicate: true });
    expect(ctx.reversed).toHaveLength(0);
  });

  test('a stray payment on an ended row is flagged MANUAL_REFUND_NEEDED', async () => {
    const { notify, service, repo } = await active();
    await notify(note('EXPIRED', 'VOLUNTARY', tx()));
    await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'STRIPE' });
    await notify(note('DID_RENEW', null, renew('t2', END2)));
    expect(repo.payments.find((p) => p.providerPaymentId === 't2')?.reviewNote).toBe('MANUAL_REFUND_NEEDED');
    expect(repo.payments.find((p) => p.providerPaymentId === 't1')?.reviewNote).toBeUndefined();
  });

  test('subscribe, retry with another plan, then a purchase carrying the first token activates', async () => {
    const { service, repo, verifier } = setup();
    const first = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'APPLE_IAP' });
    const retry = await service.subscribe('sam', 'logo-design', { plan: 'YEARLY', method: 'APPLE_IAP' });
    expect(retry).toEqual({ productId: YEARLY, appAccountToken: first.appAccountToken, reference: first.reference });
    verifier.txs.set('j', tx({ productId: MONTHLY, appAccountToken: first.appAccountToken, priceMilliunits: 105_000 }));
    expect((await service.verifyApple('sam', 'j')).status).toBe('ACTIVE');
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', plan: 'MONTHLY' });
  });
});
