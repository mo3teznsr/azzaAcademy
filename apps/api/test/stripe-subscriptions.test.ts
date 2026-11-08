import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv } from '../src/http/types';
import { subscriptionRoutes } from '../src/modules/subscriptions/subscription.routes';
import type { AppError } from '../src/core/errors';
import type { PaymentWebhookEvent, WebhookInvoice, WebhookSubscription } from '../src/core/ports';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import type {
  NewSubscription,
  NewSubscriptionPayment,
  SubscribableCourse,
  SubscriptionPatch,
  SubscriptionRepository,
  SubscriptionRow,
  SubscriptionUser,
} from '../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../src/modules/subscriptions/subscription.service';
import { RecordingNotifier } from './fakes/in-memory';

const errorOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e);
const codeOf = async (p: Promise<unknown>) => (await errorOf(p))?.code ?? null;
const DAY = 86_400_000;
const now = new Date('2026-11-20T10:00:00Z');
const periodEnd = new Date(now.getTime() + 30 * DAY);

const COURSE: SubscribableCourse = {
  id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', coverImageUrl: null, type: 'RECORDED', status: 'PUBLISHED',
  monthlyPriceFils: 10_000, yearlyPriceFils: 100_000, stripeMonthlyPriceId: 'price_m', stripeYearlyPriceId: 'price_y',
  appleMonthlyProductId: null, appleYearlyProductId: null,
};
const LIVE_COURSE: SubscribableCourse = { ...COURSE, id: 'lc', slug: 'live-one', type: 'LIVE', monthlyPriceFils: null, yearlyPriceFils: null, stripeMonthlyPriceId: null, stripeYearlyPriceId: null, appleMonthlyProductId: null, appleYearlyProductId: null };
const sam = { id: 'sam', name: 'Sam', email: 'sam@example.com', locale: 'en' };
const mia = { id: 'mia', name: 'Mia', email: 'mia@example.com', locale: 'ar' };

class MemRepo implements SubscriptionRepository {
  courses = [COURSE, LIVE_COURSE];
  users: SubscriptionUser[] = [sam, mia];
  subs: SubscriptionRow[] = [];
  payments: NewSubscriptionPayment[] = [];
  lessons = ['l1', 'l2', 'l3'];
  completed = new Set<string>();
  seq = 0;
  /** Set to make `create` fail like the partial unique index does in a race. */
  failCreateWith: { code: string } | null = null;
  constructor(private readonly notifier: RecordingNotifier, private clock: () => Date) {}

  async findCourse(idOrSlug: string) { return this.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null; }
  async courseOf(id: string) { return this.courses.find((c) => c.id === id) ?? null; }
  async findUser(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async forUserCourse(userId: string, courseId: string) { return this.subs.filter((s) => s.userId === userId && s.courseId === courseId); }
  async create(data: NewSubscription) {
    if (this.failCreateWith) throw Object.assign(new Error('unique'), this.failCreateWith);
    const row: SubscriptionRow = { ...data, id: `sub${++this.seq}`, providerSubscriptionId: null, stripeCustomerId: null, stripeCheckoutSessionId: null, appleOriginalTransactionId: null, appleAppAccountToken: null, pendingPlan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, createdAt: this.clock(), updatedAt: this.clock() };
    this.subs.push(row);
    return row;
  }
  async findById(id: string) { return this.subs.find((s) => s.id === id) ?? null; }
  async findByProviderSubscriptionId(id: string) { return this.subs.find((s) => s.providerSubscriptionId === id) ?? null; }
  async update(id: string, patch: SubscriptionPatch) {
    const i = this.subs.findIndex((s) => s.id === id);
    this.subs[i] = { ...this.subs[i]!, ...patch, updatedAt: this.clock() }; // a new object, like a database read
    return this.subs[i]!;
  }
  async listForUser(userId: string) {
    return this.subs.filter((s) => s.userId === userId).map((s) => ({ ...s, course: this.courses.find((c) => c.id === s.courseId)! })).reverse();
  }
  async nextLessonId() { return this.lessons.find((l) => !this.completed.has(l)) ?? null; }
  async paymentReferenceTaken(reference: string) { return this.payments.some((p) => p.reference === reference); }
  async upsertPayment(data: NewSubscriptionPayment) {
    const existing = this.payments.findIndex((p) => p.providerPaymentId === data.providerPaymentId);
    if (existing >= 0) return { id: `pay${existing}`, created: false };
    this.payments.push(data);
    return { id: `pay${this.payments.length - 1}`, created: true };
  }
  async findByAppleToken() { return null; }
  async findByAppleOriginalTransactionId() { return null; }
  async paymentByProviderId() { return null; }
  async refundPayment() {}
  async failureNoticeSent(userId: string, invoiceId: string) {
    return this.notifier.sent.some((s) => s.notice.type === 'SUBSCRIPTION_PAYMENT_FAILED' && s.userIds.includes(userId) && s.notice.data?.invoiceId === invoiceId);
  }
}

function setup() {
  let at = now;
  const notifier = new RecordingNotifier();
  const repo = new MemRepo(notifier, () => at);
  const gateway = new FakePaymentGateway(new PriceCalculator(5));
  const accrued: string[] = [];
  const payouts = { accrueForSubscriptionPayment: async (id: string) => { accrued.push(id); return null; } };
  const logged: string[] = [];
  const service = new SubscriptionService(repo, gateway, notifier, payouts, { now: () => at }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test', (m) => logged.push(m));
  return { repo, gateway, notifier, service, accrued, logged, setNow: (d: Date) => { at = d; } };
}

const subEvent = (over: Partial<WebhookSubscription> = {}): PaymentWebhookEvent => ({
  type: 'subscription.updated',
  subscription: { id: 'sub_st1', customerId: 'cus_1', status: 'active', currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, priceId: 'price_m', metadata: { subscriptionRef: 'sub1' }, fresh: true, ...over },
});
const invoiceEvent = (type: 'invoice.paid' | 'invoice.failed', over: Partial<WebhookInvoice> = {}): PaymentWebhookEvent => ({
  type,
  invoice: {
    id: 'in_1', subscriptionId: 'sub_st1', amountPaidFils: 10_500, feeFils: 420,
    periodStart: now, periodEnd, billingReason: 'subscription_create', metadata: { subscriptionRef: 'sub1' }, ...over,
  },
});

/** A learner who subscribed (INCOMPLETE row `sub1`). */
async function subscribed(plan: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const ctx = setup();
  const res = await ctx.service.subscribe('sam', 'logo-design', { plan, method: 'STRIPE' });
  return { ...ctx, res };
}
async function active(plan: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const ctx = await subscribed(plan);
  await ctx.service.handleStripeEvent(subEvent({ priceId: plan === 'YEARLY' ? 'price_y' : 'price_m' }));
  return ctx;
}

describe('subscribe', () => {
  test('returns a checkout url and a reference, and creates an INCOMPLETE row', async () => {
    const { res, repo, gateway } = await subscribed();
    expect(res.checkoutUrl).toContain('azza.test/learn/recorded/return?ref=');
    expect(res.reference).toBe('sub1');
    expect(repo.subs[0]).toMatchObject({ userId: 'sam', courseId: 'rc', plan: 'MONTHLY', provider: 'STRIPE', status: 'INCOMPLETE', priceFils: 10_000 });
    expect(gateway.subscriptionCheckouts[0]).toMatchObject({
      priceId: 'price_m', customerEmail: 'sam@example.com', reference: 'sub1',
      metadata: { subscriptionRef: 'sub1', userId: 'sam', courseId: 'rc' },
      successUrl: 'https://azza.test/learn/recorded/return?ref=sub1',
    });
  });

  test('yearly uses the yearly price', async () => {
    const { repo, gateway } = await subscribed('YEARLY');
    expect(gateway.subscriptionCheckouts[0]?.priceId).toBe('price_y');
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', priceFils: 100_000 });
  });

  test('a second subscribe to an active plan gives ALREADY_SUBSCRIBED (409)', async () => {
    const { service } = await active();
    const err = await errorOf(service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }));
    expect([err?.status, err?.code]).toEqual([409, 'ALREADY_SUBSCRIBED']);
  });

  test('the Checkout Session id is stored and the session lapses after the Stripe minimum', async () => {
    const { repo, gateway } = await subscribed();
    // The Price the Session charges is stored with it, so a reuse can tell whether the Session is still current.
    expect(repo.subs[0]?.stripeCheckoutSessionId).toBe('cs_dev_sub_sub1#price_m');
    expect(gateway.subscriptionCheckouts[0]?.expiresAt?.getTime()).toBe(now.getTime() + 31 * 60_000);
  });

  test('re-subscribing to the same plan after leaving Checkout returns a URL for the same row (no 409)', async () => {
    const { service, repo, gateway } = await subscribed();
    const again = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' });
    expect(again).toMatchObject({ reference: 'sub1' });
    expect(again.checkoutUrl).toContain('ref=sub1');
    expect(repo.subs).toHaveLength(1);
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'expireCheckoutSession')).toHaveLength(0);
    // identical arguments, so Stripe's idempotency key hands back the same open Session
    expect(gateway.subscriptionCheckouts[1]).toEqual(gateway.subscriptionCheckouts[0]!);
  });

  test('a different plan expires the old session and creates a new row', async () => {
    const { service, repo, gateway } = await subscribed();
    const again = await service.subscribe('sam', 'rc', { plan: 'YEARLY', method: 'STRIPE' });
    expect(again.reference).toBe('sub2');
    expect(gateway.subscriptionCalls.find((c) => c.op === 'expireCheckoutSession')?.args).toEqual(['cs_dev_sub_sub1']);
    expect(repo.subs.map((r) => r.status)).toEqual(['EXPIRED', 'INCOMPLETE']);
    expect(repo.subs[1]).toMatchObject({ plan: 'YEARLY', priceFils: 100_000 });
  });

  test('a changed course price replaces the open session even for the same plan', async () => {
    const { service, repo, gateway } = await subscribed();
    repo.courses = [{ ...COURSE, monthlyPriceFils: 12_000, stripeMonthlyPriceId: 'price_m2' }, LIVE_COURSE];
    const again = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' });
    expect(again.reference).toBe('sub2');
    expect(gateway.subscriptionCalls.some((c) => c.op === 'expireCheckoutSession')).toBe(true);
    expect(repo.subs.map((r) => r.status)).toEqual(['EXPIRED', 'INCOMPLETE']);
    expect(repo.subs[1]).toMatchObject({ priceFils: 12_000 });
    expect(gateway.subscriptionCheckouts.at(-1)?.priceId).toBe('price_m2');
  });

  test('a rotated Stripe Price (same amount) replaces the open session: one payable Session per plan', async () => {
    const { service, repo, gateway } = await subscribed();
    repo.courses = [{ ...COURSE, stripeMonthlyPriceId: 'price_m_new' }, LIVE_COURSE];
    const again = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' });
    expect(again.reference).toBe('sub2');
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'expireCheckoutSession').map((c) => c.args)).toEqual([['cs_dev_sub_sub1']]);
    expect(repo.subs.map((r) => r.status)).toEqual(['EXPIRED', 'INCOMPLETE']);
    expect(repo.subs[1]?.stripeCheckoutSessionId).toBe('cs_dev_sub_sub2#price_m_new');
    expect(gateway.subscriptionCheckouts.at(-1)?.priceId).toBe('price_m_new');
  });

  test('a rotated Price whose old session was already paid is 409 and keeps the row', async () => {
    const { service, repo, gateway } = await subscribed();
    repo.courses = [{ ...COURSE, stripeMonthlyPriceId: 'price_m_new' }, LIVE_COURSE];
    gateway.expireResult = 'completed';
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
    expect(repo.subs.map((r) => r.status)).toEqual(['INCOMPLETE']);
    expect(gateway.subscriptionCheckouts).toHaveLength(1);
  });

  test('a stored session without a Price marker (older rows) is never reused', async () => {
    const { service, repo, gateway } = await subscribed();
    repo.subs[0] = { ...repo.subs[0]!, stripeCheckoutSessionId: 'cs_legacy' };
    expect((await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' })).reference).toBe('sub2');
    expect(gateway.subscriptionCalls.find((c) => c.op === 'expireCheckoutSession')?.args).toEqual(['cs_legacy']);
    expect(repo.subs.map((r) => r.status)).toEqual(['EXPIRED', 'INCOMPLETE']);
  });

  test('when Stripe hands back another Session on a reuse, the old one is expired and the row keeps only the new one', async () => {
    const { service, repo, gateway } = await subscribed();
    const create = gateway.createSubscriptionCheckout.bind(gateway);
    gateway.createSubscriptionCheckout = async (args) => ({ ...(await create(args)), id: 'cs_other' });
    const again = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' });
    expect(again.reference).toBe('sub1');
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'expireCheckoutSession').map((c) => c.args)).toEqual([['cs_dev_sub_sub1']]);
    expect(repo.subs).toHaveLength(1);
    expect(repo.subs[0]?.stripeCheckoutSessionId).toBe('cs_other#price_m');
  });

  test('a transient error while closing the old session leaves the old row and opens no second session', async () => {
    const { service, repo, gateway } = await subscribed();
    gateway.expireCheckoutSession = async () => { throw new Error('stripe 500'); };
    expect(await errorOf(service.subscribe('sam', 'rc', { plan: 'YEARLY', method: 'STRIPE' }))).not.toBeNull();
    expect(repo.subs.map((r) => r.status)).toEqual(['INCOMPLETE']);
    expect(gateway.subscriptionCheckouts).toHaveLength(1);
  });

  test('a lapsed session of the same plan is expired and replaced', async () => {
    const { service, repo, gateway, setNow } = await subscribed();
    setNow(new Date(now.getTime() + 31 * 60_000));
    expect((await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' })).reference).toBe('sub2');
    expect(gateway.subscriptionCalls.some((c) => c.op === 'expireCheckoutSession')).toBe(true);
    expect(repo.subs[0]?.status).toBe('EXPIRED');
  });

  test('an old session that was already paid gives ALREADY_SUBSCRIBED and keeps the row', async () => {
    const { service, repo, gateway } = await subscribed();
    gateway.expireResult = 'completed';
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'YEARLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
    expect(repo.subs).toHaveLength(1);
    expect(repo.subs[0]?.status).toBe('INCOMPLETE');
  });

  test('ALREADY_SUBSCRIBED also covers an active plan, and another learner is unaffected', async () => {
    const { service } = await active();
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'YEARLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
    expect((await service.subscribe('mia', 'rc', { plan: 'MONTHLY', method: 'STRIPE' })).reference).toBe('sub2');
  });

  test('a unique violation from the database (a race) is also ALREADY_SUBSCRIBED', async () => {
    const { service, repo } = setup();
    repo.failCreateWith = { code: 'P2002' };
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
  });

  test('a LIVE course is NOT_RECORDED (422)', async () => {
    const { service } = setup();
    const err = await errorOf(service.subscribe('sam', 'live-one', { plan: 'MONTHLY', method: 'STRIPE' }));
    expect([err?.status, err?.code]).toEqual([422, 'NOT_RECORDED']);
  });

  test('a failed checkout creation frees the row so the learner can retry', async () => {
    const { service, repo, gateway } = setup();
    gateway.createSubscriptionCheckout = async () => { throw new Error('stripe down'); };
    await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }).catch(() => null);
    expect(repo.subs[0]?.status).toBe('EXPIRED');
  });

  test('an unpublished course is 404 whatever its type, so drafts do not leak', async () => {
    const { service, repo } = setup();
    repo.courses = [{ ...COURSE, status: 'DRAFT' }, { ...LIVE_COURSE, status: 'DRAFT' }];
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('NOT_FOUND');
    expect(await codeOf(service.subscribe('sam', 'live-one', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('NOT_FOUND');
  });

  test('a course without Stripe prices is not ready', async () => {
    const { service, repo } = setup();
    repo.courses = [{ ...COURSE, stripeMonthlyPriceId: null }];
    expect(await codeOf(service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('PRICE_NOT_READY');
  });
});

describe('subscription.updated', () => {
  test('active makes the row ACTIVE with currentPeriodEnd, and links the Stripe ids', async () => {
    const { service, repo, notifier } = await subscribed();
    expect(await service.handleStripeEvent(subEvent())).toEqual({ handled: true });
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: periodEnd, providerSubscriptionId: 'sub_st1', stripeCustomerId: 'cus_1', cancelAtPeriodEnd: false });
    expect(notifier.types()).toEqual(['SUBSCRIPTION_ACTIVE']);
  });

  test('later events find the row by providerSubscriptionId, and ACTIVE is announced once', async () => {
    const { service, repo, notifier } = await active();
    await service.handleStripeEvent(subEvent({ metadata: {}, currentPeriodEnd: new Date(periodEnd.getTime() + 30 * DAY) }));
    expect(repo.subs[0]?.currentPeriodEnd?.getTime()).toBe(periodEnd.getTime() + 30 * DAY);
    expect(notifier.types()).toEqual(['SUBSCRIPTION_ACTIVE']);
  });

  test('active + cancelAtPeriodEnd is CANCELLING', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ cancelAtPeriodEnd: true }));
    expect(repo.subs[0]).toMatchObject({ status: 'CANCELLING', cancelAtPeriodEnd: true });
  });

  test('past_due and unpaid are PAST_DUE; canceled is EXPIRED', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ status: 'past_due' }));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    await service.handleStripeEvent(subEvent({ status: 'unpaid' }));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    await service.handleStripeEvent(subEvent({ status: 'canceled' }));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
  });

  test('incomplete keeps an INCOMPLETE row INCOMPLETE and never downgrades an active one', async () => {
    const { service, repo } = await subscribed();
    await service.handleStripeEvent(subEvent({ status: 'incomplete' }));
    expect(repo.subs[0]?.status).toBe('INCOMPLETE');
    await service.handleStripeEvent(subEvent());
    await service.handleStripeEvent(subEvent({ status: 'incomplete' }));
    expect(repo.subs[0]?.status).toBe('ACTIVE');
  });

  test('a stale period-1 event after period 2 neither moves currentPeriodEnd back nor undoes PAST_DUE or CANCELLING', async () => {
    const { service, repo } = await active();
    const period2 = new Date(periodEnd.getTime() + 30 * DAY);
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: period2, status: 'past_due' }));
    await service.handleStripeEvent(subEvent({ fresh: false })); // late period-1 "active" (re-read failed)
    expect(repo.subs[0]).toMatchObject({ status: 'PAST_DUE', currentPeriodEnd: period2 });
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: period2, cancelAtPeriodEnd: true }));
    await service.handleStripeEvent(subEvent({ fresh: false })); // late again
    expect(repo.subs[0]).toMatchObject({ status: 'CANCELLING', cancelAtPeriodEnd: true, currentPeriodEnd: period2 });
  });

  test('a non-fresh stale event (the re-read failed) is still ignored', async () => {
    const { service, repo } = await active();
    const period2 = new Date(periodEnd.getTime() + 30 * DAY);
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: period2 }));
    await service.handleStripeEvent(subEvent({ fresh: false, status: 'past_due' })); // period 1, delayed snapshot
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: period2 });
  });

  test('a yearly to monthly switch moves the period end earlier, and later events still apply', async () => {
    const { service, repo, gateway } = await active('YEARLY');
    const yearEnd = new Date(now.getTime() + 365 * DAY);
    await service.handleStripeEvent(subEvent({ priceId: 'price_y', currentPeriodEnd: yearEnd }));
    const monthEnd = new Date(now.getTime() + 30 * DAY);
    gateway.switchPeriodEnd = monthEnd;
    await service.switchPlan('sub1', 'sam', { plan: 'MONTHLY' });
    expect(repo.subs[0]).toMatchObject({ plan: 'MONTHLY', currentPeriodEnd: monthEnd, priceFils: 10_000 });
    // its own fresh event (earlier period end than the old yearly one) is applied, not dropped
    await service.handleStripeEvent(subEvent({ priceId: 'price_m', currentPeriodEnd: monthEnd }));
    expect(repo.subs[0]).toMatchObject({ plan: 'MONTHLY', currentPeriodEnd: monthEnd });
    await service.handleStripeEvent(subEvent({ priceId: 'price_m', currentPeriodEnd: monthEnd, status: 'past_due' }));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    await service.handleStripeEvent(subEvent({ priceId: 'price_m', currentPeriodEnd: monthEnd, cancelAtPeriodEnd: true, status: 'active' }));
    expect(repo.subs[0]?.status).toBe('CANCELLING');
  });

  test('the end of the plan still applies even if its period looks older', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: new Date(periodEnd.getTime() - DAY), status: 'canceled' }));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
  });

  test('a plan switch seen on the Price updates the plan', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ priceId: 'price_y' }));
    expect(repo.subs[0]?.plan).toBe('YEARLY');
  });

  test('an active Stripe subscription landing on an EXPIRED never-paid row is cancelled at once and the row stays EXPIRED', async () => {
    const { service, repo, gateway, logged, notifier } = await subscribed();
    repo.subs[0] = { ...repo.subs[0]!, status: 'EXPIRED' };
    expect(await service.handleStripeEvent(subEvent())).toEqual({ handled: true, duplicate: true });
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'cancelNow').map((c) => c.args)).toEqual([['sub_st1']]);
    expect(repo.subs[0]).toMatchObject({ status: 'EXPIRED', currentPeriodEnd: null });
    expect(notifier.types()).not.toContain('SUBSCRIPTION_ACTIVE');
    expect(logged.some((m) => m.includes('stray ended-row subscription cancelled: stripe sub_st1'))).toBe(true);
  });

  test('a late active snapshot of a period an ended plan covered cancels nothing', async () => {
    const { service, repo, gateway } = await active();
    await service.handleStripeEvent(subEvent({ status: 'canceled' }));
    await service.handleStripeEvent(subEvent({ fresh: false }));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(gateway.subscriptionCalls.some((c) => c.op === 'cancelNow')).toBe(false);
  });

  test('an unknown subscription is not ours', async () => {
    const { service } = setup();
    expect(await service.handleStripeEvent(subEvent({ id: 'sub_other', metadata: {} }))).toEqual({ handled: false });
  });

  test('events that are not subscription events are not handled here', async () => {
    const { service } = setup();
    expect(await service.handleStripeEvent({ type: 'payment.succeeded', paymentIntentId: 'pi_1' })).toEqual({ handled: false });
    expect(await service.handleStripeEvent({ type: 'ignored' })).toEqual({ handled: false });
  });
});

describe('invoice.paid', () => {
  test('records one payment with the money split and accrues the earning', async () => {
    const { service, repo, accrued, notifier } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    expect(repo.payments).toHaveLength(1);
    expect(repo.payments[0]).toMatchObject({
      subscriptionId: 'sub1', userId: 'sam', providerPaymentId: 'in_1', plan: 'MONTHLY',
      totalFils: 10_500, vatFils: 500, subtotalFils: 10_000, feeFils: 420, status: 'PAID', periodStart: now, periodEnd,
    });
    expect(repo.payments[0]?.reference).toMatch(/^AZ-REC-\d{5}$/);
    expect(accrued).toEqual(['pay0']);
    expect(notifier.types()).toContain('SUBSCRIPTION_RECEIPT');
  });

  test('delivered twice, it creates one payment and one accrual', async () => {
    const { service, repo, accrued, notifier } = await active();
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid'))).toEqual({ handled: true });
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid'))).toEqual({ handled: true, duplicate: true });
    expect(repo.payments).toHaveLength(1);
    expect(accrued).toHaveLength(1);
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_RECEIPT')).toHaveLength(1);
  });

  test('before subscription.updated it still links through metadata.subscriptionRef and sets the Stripe id', async () => {
    const { service, repo, notifier } = await subscribed();
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    expect(repo.subs[0]).toMatchObject({ providerSubscriptionId: 'sub_st1', status: 'ACTIVE', currentPeriodEnd: periodEnd });
    expect(repo.payments).toHaveLength(1);
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_ACTIVE')).toHaveLength(1);
    // the late subscription.updated then finds it by the Stripe id and does not announce again
    await service.handleStripeEvent(subEvent({ metadata: {} }));
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_ACTIVE')).toHaveLength(1);
  });

  test('a $0 trial invoice creates no payment and no earning, but still makes the plan ACTIVE', async () => {
    const { service, repo, accrued } = await subscribed();
    await service.handleStripeEvent(invoiceEvent('invoice.paid', { amountPaidFils: 0, feeFils: 0 }));
    expect(repo.payments).toHaveLength(0);
    expect(accrued).toHaveLength(0);
    expect(repo.subs[0]?.status).toBe('ACTIVE');
  });

  test('a paid invoice brings a PAST_DUE plan back to ACTIVE', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ status: 'past_due' }));
    await service.handleStripeEvent(invoiceEvent('invoice.paid', { id: 'in_2' }));
    expect(repo.subs[0]?.status).toBe('ACTIVE');
  });

  test('a replayed old invoice does not lift a PAST_DUE plan, but a new payment or a current period does', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.paid')); // in_1, period 1
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: new Date(periodEnd.getTime() + 30 * DAY), status: 'past_due' }));
    await service.handleStripeEvent(invoiceEvent('invoice.paid')); // replay of in_1
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
    await service.handleStripeEvent(invoiceEvent('invoice.paid', { id: 'in_3', periodEnd: new Date(periodEnd.getTime() + 60 * DAY) })); // a new payment
    expect(repo.subs[0]?.status).toBe('ACTIVE');
  });

  test('a $0 invoice only opens a plan when it is the subscription_create one', async () => {
    const { service, repo } = await active();
    await service.handleStripeEvent(subEvent({ status: 'past_due' }));
    await service.handleStripeEvent(invoiceEvent('invoice.paid', { id: 'in_0', amountPaidFils: 0, feeFils: 0, billingReason: 'subscription_cycle' }));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
  });

  test('a replayed trial-open invoice does not lift a PAST_DUE plan', async () => {
    const { service, repo } = await subscribed();
    const trial = { id: 'in_t', amountPaidFils: 0, feeFils: 0, billingReason: 'subscription_create' };
    await service.handleStripeEvent(invoiceEvent('invoice.paid', trial));
    expect(repo.subs[0]?.status).toBe('ACTIVE');
    await service.handleStripeEvent(subEvent({ currentPeriodEnd: new Date(periodEnd.getTime() + 30 * DAY), status: 'past_due' }));
    await service.handleStripeEvent(invoiceEvent('invoice.paid', trial));
    expect(repo.subs[0]?.status).toBe('PAST_DUE');
  });

  test('the receipt notice is localised', async () => {
    const { service, notifier, repo } = await active();
    repo.subs[0]!.userId = 'mia';
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    const receipt = notifier.sent.find((n) => n.notice.type === 'SUBSCRIPTION_RECEIPT')!.notice;
    expect(receipt.title).toBe('إيصال · تصميم الشعارات');
    expect(receipt.body).toContain('استلمنا');
  });

  test('a payout problem never breaks the webhook', async () => {
    const ctx = await active();
    const logged: string[] = [];
    const service = new SubscriptionService(ctx.repo, ctx.gateway, ctx.notifier, { accrueForSubscriptionPayment: async () => { throw new Error('boom'); } }, { now: () => now }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test', (m) => logged.push(m));
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid'))).toEqual({ handled: true });
    expect(ctx.repo.payments).toHaveLength(1);
    expect(logged).toHaveLength(1);
  });

  test('an invoice with a yearly Price is recorded as a YEARLY payment', async () => {
    const { service, repo } = await active('YEARLY');
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    expect(repo.payments[0]?.plan).toBe('YEARLY');
  });

  test('VAT is carved out of the VAT-inclusive amount with our own rule, ignoring Stripe tax', async () => {
    const { service, repo, gateway } = await active();
    // a 4900-fils plan becomes a Stripe Price of 4900 + 5% VAT
    const product = await gateway.upsertRecordedProduct({ name: 'C', courseId: 'rc', monthlyFils: 4900, yearlyFils: 49_000 });
    expect(product.monthlyPriceId).toBe('price_fake_m_5145');
    await service.handleStripeEvent(invoiceEvent('invoice.paid', { amountPaidFils: 5145 }));
    expect(repo.payments[0]).toMatchObject({ totalFils: 5145, vatFils: 245, subtotalFils: 4900 });
  });

  test('the receipt email links to /plans (the web has no /learn/recorded page)', async () => {
    const { service, notifier } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    const email = notifier.sent.find((n) => n.notice.type === 'SUBSCRIPTION_RECEIPT')!.notice.email!({} as never)!;
    expect(email.text).toContain('https://azza.test/plans');
    expect(email.text).not.toContain('/learn/recorded');
  });

  test('an invoice paid on an EXPIRED never-paid row: recorded for a manual refund, the Stripe subscription cancelled, no earning, no receipt', async () => {
    const { service, repo, gateway, accrued, notifier, logged } = await subscribed();
    // The checkout row was closed (admin cancel, or replaced) but the learner paid on the old Session anyway.
    repo.subs[0] = { ...repo.subs[0]!, status: 'EXPIRED' };
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid'))).toEqual({ handled: true });
    expect(repo.payments).toHaveLength(1);
    expect(repo.payments[0]).toMatchObject({ providerPaymentId: 'in_1', status: 'PAID', reviewNote: 'MANUAL_REFUND_NEEDED' });
    expect(accrued).toEqual([]);
    expect(notifier.types()).not.toContain('SUBSCRIPTION_RECEIPT');
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'cancelNow').map((c) => c.args)).toEqual([['sub_st1']]);
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(logged.some((m) => m.includes('manual refund needed') && m.includes('in_1'))).toBe(true);
    // A replay records nothing new and cancels nothing again.
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid'))).toEqual({ handled: true, duplicate: true });
    expect(repo.payments).toHaveLength(1);
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'cancelNow')).toHaveLength(1);
  });

  test("a delayed invoice for the period an ended plan did cover is a normal payment (no refund flag, no cancel)", async () => {
    const { service, repo, gateway, accrued } = await active();
    await service.handleStripeEvent(subEvent({ status: 'canceled' }));
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    await service.handleStripeEvent(invoiceEvent('invoice.paid'));
    expect(repo.payments[0]?.reviewNote).toBeUndefined();
    expect(accrued).toEqual(['pay0']);
    expect(gateway.subscriptionCalls.some((c) => c.op === 'cancelNow')).toBe(false);
  });

  test('an invoice of an unknown subscription is not ours', async () => {
    const { service } = setup();
    expect(await service.handleStripeEvent(invoiceEvent('invoice.paid', { subscriptionId: 'sub_zzz', metadata: {} }))).toEqual({ handled: false });
  });
});

describe('invoice.failed', () => {
  test('notifies once per invoice', async () => {
    const { service, notifier } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.failed'));
    await service.handleStripeEvent(invoiceEvent('invoice.failed'));
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_PAYMENT_FAILED')).toHaveLength(1);
    await service.handleStripeEvent(invoiceEvent('invoice.failed', { id: 'in_2' }));
    expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_PAYMENT_FAILED')).toHaveLength(2);
  });

  test('the payment-failed email links to /plans', async () => {
    const { service, notifier } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.failed'));
    const email = notifier.sent.find((n) => n.notice.type === 'SUBSCRIPTION_PAYMENT_FAILED')!.notice.email!({} as never)!;
    expect(email.text).toContain('https://azza.test/plans');
  });

  test('uses the fixed copy in the learner locale', async () => {
    const { service, notifier, repo } = await active();
    await service.handleStripeEvent(invoiceEvent('invoice.failed'));
    expect(notifier.sent.at(-1)?.notice.body).toBe("Your last payment didn't go through. Update your card to keep learning.");
    repo.subs[0]!.userId = 'mia';
    await service.handleStripeEvent(invoiceEvent('invoice.failed', { id: 'in_ar' }));
    expect(notifier.sent.at(-1)?.notice.body).toBe('لم تتم آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم.');
  });
});

describe('cancel, resume, switch, portal', () => {
  test('cancel sets CANCELLING and calls setCancelAtPeriodEnd(true); resume reverses it', async () => {
    const { service, repo, gateway } = await active();
    const cancelled = await service.cancel('sub1', 'sam');
    expect(cancelled).toMatchObject({ status: 'CANCELLING', cancelAtPeriodEnd: true });
    expect(repo.subs[0]?.status).toBe('CANCELLING');
    expect(gateway.subscriptionCalls.at(-1)).toEqual({ op: 'setCancelAtPeriodEnd', args: ['sub_st1', true] });
    const resumed = await service.resume('sub1', 'sam');
    expect(resumed).toMatchObject({ status: 'ACTIVE', cancelAtPeriodEnd: false });
    expect(gateway.subscriptionCalls.at(-1)).toEqual({ op: 'setCancelAtPeriodEnd', args: ['sub_st1', false] });
  });

  test('cancelling twice calls Stripe once', async () => {
    const { service, gateway } = await active();
    await service.cancel('sub1', 'sam');
    await service.cancel('sub1', 'sam');
    expect(gateway.subscriptionCalls.filter((c) => c.op === 'setCancelAtPeriodEnd')).toHaveLength(1);
  });

  test('switch calls switchPlan with the yearly price id', async () => {
    const { service, repo, gateway } = await active();
    const res = await service.switchPlan('sub1', 'sam', { plan: 'YEARLY' });
    expect(gateway.subscriptionCalls.at(-1)).toEqual({ op: 'switchPlan', args: ['sub_st1', 'price_y'] });
    expect(res).toMatchObject({ plan: 'YEARLY' });
    expect(repo.subs[0]).toMatchObject({ plan: 'YEARLY', priceFils: 100_000 });
    expect(await codeOf(service.switchPlan('sub1', 'sam', { plan: 'YEARLY' }))).toBe('SAME_PLAN');
  });

  test('portal returns the Customer Portal url', async () => {
    const { service, gateway } = await active();
    expect(await service.portal('sub1', 'sam')).toEqual({ url: 'https://azza.test/plans' });
    expect(gateway.subscriptionCalls.at(-1)).toEqual({ op: 'customerPortalUrl', args: ['cus_1', 'https://azza.test/plans'] });
  });

  test('only the owner can manage a plan (404 for anyone else)', async () => {
    const { service } = await active();
    for (const call of [service.cancel('sub1', 'mia'), service.resume('sub1', 'mia'), service.switchPlan('sub1', 'mia', { plan: 'YEARLY' }), service.portal('sub1', 'mia')]) {
      expect(await codeOf(call)).toBe('NOT_FOUND');
    }
  });

  test('an Apple subscription is MANAGED_BY_APPLE (422)', async () => {
    const { service, repo } = await active();
    repo.subs[0]!.provider = 'APPLE';
    for (const call of [service.cancel('sub1', 'sam'), service.resume('sub1', 'sam'), service.switchPlan('sub1', 'sam', { plan: 'YEARLY' }), service.portal('sub1', 'sam')]) {
      const err = await errorOf(call);
      expect([err?.status, err?.code]).toEqual([422, 'MANAGED_BY_APPLE']);
    }
  });

  test('a plan that is not live cannot be cancelled', async () => {
    const { service } = await subscribed();
    expect(await codeOf(service.cancel('sub1', 'sam'))).toBe('NOT_ACTIVE');
  });
});

describe('reads', () => {
  test('by-reference is for the owner only and carries the next lesson', async () => {
    const { service, repo } = await active();
    repo.completed.add('l1');
    expect(await service.byReference('sub1', 'sam')).toEqual({ status: 'ACTIVE', courseSlug: 'logo-design', nextLessonId: 'l2' });
    expect(await codeOf(service.byReference('sub1', 'mia'))).toBe('NOT_FOUND');
    expect(await codeOf(service.byReference('nope', 'sam'))).toBe('NOT_FOUND');
  });

  test('my subscriptions lists the plans with hasAccess', async () => {
    const { service, repo, setNow } = await active();
    const [one] = (await service.mine('sam')).items;
    expect(one).toMatchObject({
      id: 'sub1', plan: 'MONTHLY', provider: 'STRIPE', status: 'ACTIVE', currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, priceFils: 10_000, hasAccess: true,
      course: { id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', coverImageUrl: null },
    });
    setNow(new Date(periodEnd.getTime() + DAY));
    expect((await service.mine('sam')).items[0]?.hasAccess).toBe(false);
    repo.subs[0]!.status = 'PAST_DUE';
    expect((await service.mine('sam')).items[0]?.hasAccess).toBe(true); // inside the grace window
    expect(await service.mine('mia')).toEqual({ items: [] });
  });

  test('GET /me/subscriptions answers { items: [...] } over HTTP, like the other /me lists (the web client reads r.items)', async () => {
    const { service } = await active();
    const app = new Hono<AppEnv>();
    app.onError(errorHandler);
    app.use('*', async (c, next) => { c.set('user', { id: 'sam', name: 'Sam', email: 'sam@example.com', role: 'STUDENT', locale: 'en', timezone: 'Asia/Dubai' }); await next(); });
    app.route('/', subscriptionRoutes(service));
    const res = await app.request('/me/subscriptions');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string; hasAccess: boolean }> };
    expect(Array.isArray(body)).toBe(false);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: 'sub1', hasAccess: true });
  });
});
