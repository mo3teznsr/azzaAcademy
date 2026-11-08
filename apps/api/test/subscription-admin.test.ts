import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv } from '../src/http/types';
import { teacherPayoutRoutes } from '../src/modules/payouts/payout.routes';
import { adminSubscriptionRoutes, teacherSubscriberRoutes } from '../src/modules/subscriptions/subscription-admin.routes';
import { SavedCourseService } from '../src/modules/reviews/saved-course.service';
import type { AppError } from '../src/core/errors';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { CourseService } from '../src/modules/courses/course.service';
import type { CourseRecord, CourseRepository } from '../src/modules/courses/course.repository';
import type { LessonCourse, LessonRepository } from '../src/modules/lessons/lesson.repository';
import { LessonService } from '../src/modules/lessons/lesson.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import type {
  NewSubscription,
  NewSubscriptionPayment,
  NewTransferPayment,
  ReminderCandidate,
  SubscribableCourse,
  SubscriptionAdminRepository,
  SubscriptionPatch,
  SubscriptionRepository,
  SubscriptionRow,
  SubscriptionTransferRepository,
  SubscriptionUser,
  TransferPaymentPatch,
  TransferPaymentRow,
} from '../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../src/modules/subscriptions/subscription.service';
import { RecordingNotifier } from './fakes/in-memory';

const errorOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e);
const codeOf = async (p: Promise<unknown>) => (await errorOf(p))?.code ?? null;
const DAY = 86_400_000;
const now = new Date('2026-11-20T10:00:00Z');
const inDays = (n: number) => new Date(now.getTime() + n * DAY);

const COURSE: SubscribableCourse = {
  id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', coverImageUrl: null, type: 'RECORDED', status: 'PUBLISHED',
  monthlyPriceFils: 10_000, yearlyPriceFils: 100_000, stripeMonthlyPriceId: 'price_m', stripeYearlyPriceId: 'price_y',
  appleMonthlyProductId: 'apple.m', appleYearlyProductId: 'apple.y',
};
const sam = { id: 'sam', name: 'Sam', email: 'sam@example.com', locale: 'en' };
const noor = { id: 'noor', name: 'Noor', email: 'noor@example.com', locale: 'ar' };
const BANK = { id: 'bank1', bankName: 'ENBD', accountName: 'Azza', iban: 'AE070331234567890123456', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 };

type Pay = { id: string; subscriptionId: string; providerPaymentId: string | null; totalFils: number; refundedFils: number; status: string; createdAt: Date };

class MemRepo implements SubscriptionRepository, SubscriptionTransferRepository, SubscriptionAdminRepository {
  users: SubscriptionUser[] = [sam, noor];
  subs: SubscriptionRow[] = [];
  pays: Pay[] = [];
  tpay: TransferPaymentRow[] = [];
  reminders: Array<{ id: string; kind: string; end: number }> = [];
  seq = 0;
  async findCourse() { return COURSE; }
  async courseOf() { return COURSE; }
  async findUser(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async forUserCourse(userId: string) { return this.subs.filter((s) => s.userId === userId); }
  async create(data: NewSubscription) { return this.add(data); }
  add(o: Partial<SubscriptionRow> & Pick<SubscriptionRow, 'userId' | 'plan' | 'provider' | 'status'>): SubscriptionRow {
    const row: SubscriptionRow = {
      courseId: 'rc', priceFils: 100_000, providerSubscriptionId: null, stripeCustomerId: null, stripeCheckoutSessionId: null, appleOriginalTransactionId: null, appleAppAccountToken: null,
      pendingPlan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, createdAt: now, updatedAt: now, ...o, id: `sub${++this.seq}`,
    };
    this.subs.push(row);
    return row;
  }
  async findById(id: string) { return this.subs.find((s) => s.id === id) ?? null; }
  async findByProviderSubscriptionId(id: string) { return this.subs.find((s) => s.providerSubscriptionId === id) ?? null; }
  async update(id: string, patch: SubscriptionPatch) {
    const i = this.subs.findIndex((s) => s.id === id);
    this.subs[i] = { ...this.subs[i]!, ...patch };
    return this.subs[i]!;
  }
  async listForUser() { return []; }
  async nextLessonId() { return null; }
  async paymentReferenceTaken() { return false; }
  async upsertPayment(_d: NewSubscriptionPayment) { return { id: 'x', created: true }; }
  async findByAppleToken() { return null; }
  async findByAppleOriginalTransactionId() { return null; }
  async paymentByProviderId(pid: string) {
    const p = this.pays.find((x) => x.providerPaymentId === pid);
    return p ? { id: p.id, subscriptionId: p.subscriptionId, status: p.status as 'PAID', totalFils: p.totalFils, refundedFils: p.refundedFils, periodEnd: now } : null;
  }
  async refundPayment(id: string, refundedFils: number, full = true) {
    const p = this.pays.find((x) => x.id === id) ?? null;
    if (p) { p.refundedFils = refundedFils; if (full) p.status = 'REFUNDED'; }
    const t = this.tpay.findIndex((x) => x.id === id);
    if (t >= 0) this.tpay[t] = { ...this.tpay[t]!, refundedFils, ...(full && { status: 'REFUNDED' as const }) };
  }
  async failureNoticeSent() { return false; }
  // transfers
  async createTransferPayment(_d: NewTransferPayment): Promise<TransferPaymentRow> { throw new Error('unused'); }
  async transferPayment(id: string) { return this.tpay.find((p) => p.id === id) ?? null; }
  async updateTransferPayment(_id: string, _p: TransferPaymentPatch): Promise<TransferPaymentRow> { throw new Error('unused'); }
  async reviewTransferPayment() { return null; }
  async expireTransferPayments(subscriptionId: string, statuses: string[]) {
    const closed: TransferPaymentRow[] = [];
    this.tpay = this.tpay.map((p) => {
      if (p.subscriptionId !== subscriptionId || !statuses.includes(p.status)) return p;
      closed.push(p);
      return { ...p, status: 'EXPIRED' as const };
    });
    return closed;
  }
  async claimCheckoutSlot() { return true; }
  async transferPaymentsOf(ids: string[]) { return this.tpay.filter((p) => ids.includes(p.subscriptionId)); }
  async staleTransferPayments() { return []; }
  async endedTransferSubscriptions() { return []; }
  // admin
  async listForAdmin() { return { items: [], total: 0 }; }
  async lastPaidPayment(subscriptionId: string) {
    const p = this.pays.filter((x) => x.subscriptionId === subscriptionId && x.status === 'PAID').at(-1);
    return p ? { id: p.id, providerPaymentId: p.providerPaymentId, totalFils: p.totalFils, refundedFils: p.refundedFils } : null;
  }
  counts: { createdById: string | null; active: number; cancelling: number; pastDue: number } | null = { createdById: 'lina', active: 3, cancelling: 1, pastDue: 2 };
  async subscriberCounts() { return this.counts; }
  async endingBetween(after: Date, until: Date) {
    return this.subs.filter((s) => s.status === 'ACTIVE' && s.currentPeriodEnd && s.currentPeriodEnd > after && s.currentPeriodEnd <= until).map((s): ReminderCandidate => ({
      id: s.id, userId: s.userId, courseId: s.courseId, plan: s.plan, provider: s.provider, currentPeriodEnd: s.currentPeriodEnd!,
      reminderSentForPeriodEnd: this.sentFor.get(`${s.id}:SOON`) ?? null, reminderEndDaySentFor: this.sentFor.get(`${s.id}:END_DAY`) ?? null,
    }));
  }
  sentFor = new Map<string, Date>();
  async releaseReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date, previous: Date | null) {
    const key = `${id}:${kind}`;
    if (this.sentFor.get(key)?.getTime() !== periodEnd.getTime()) return;
    if (previous) this.sentFor.set(key, previous);
    else this.sentFor.delete(key);
    this.reminders = this.reminders.filter((r) => !(r.id === id && r.kind === kind && r.end === periodEnd.getTime()));
  }
  async claimReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date) {
    if (this.sentFor.get(`${id}:${kind}`)?.getTime() === periodEnd.getTime()) return false;
    this.sentFor.set(`${id}:${kind}`, periodEnd);
    this.reminders.push({ id, kind, end: periodEnd.getTime() });
    return true;
  }
}

function setup() {
  const notifier = new RecordingNotifier();
  const repo = new MemRepo();
  const gateway = new FakePaymentGateway(new PriceCalculator(5));
  const reversed: Array<[string, number]> = [];
  const payouts = { accrueForSubscriptionPayment: async () => null, reverseSubscriptionPayment: async (id: string, fils: number) => { reversed.push([id, fils]); return null; } };
  const logged: string[] = [];
  const bankAccounts = { findBankAccount: async () => BANK, firstActiveBankAccount: async () => BANK };
  const service = new SubscriptionService(
    repo, gateway, notifier, payouts, { now: () => now }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test',
    (m) => logged.push(m), null, undefined, { repo, bankAccounts, holdHours: 48 }, repo,
  );
  return { repo, gateway, notifier, service, reversed, logged };
}

const card = (repo: MemRepo, o: Partial<SubscriptionRow> = {}) =>
  repo.add({ userId: 'sam', plan: 'YEARLY', provider: 'STRIPE', status: 'ACTIVE', providerSubscriptionId: 'sub_stripe', currentPeriodEnd: inDays(6.5), ...o });
const paid = (repo: MemRepo, subscriptionId: string, o: Partial<Pay> = {}) => {
  const p: Pay = { id: `pay${repo.pays.length + 1}`, subscriptionId, providerPaymentId: 'in_1', totalFils: 105_000, refundedFils: 0, status: 'PAID', createdAt: now, ...o };
  repo.pays.push(p);
  return p;
};

describe('remindRenewals', () => {
  test('a yearly card plan ending in 7 days is reminded once, a monthly one never', async () => {
    const { repo, service, notifier } = setup();
    const yearly = card(repo);
    card(repo, { plan: 'MONTHLY', userId: 'noor' });
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
    expect(notifier.types()).toEqual(['SUBSCRIPTION_RENEWS_SOON']);
    expect(notifier.sent[0]).toMatchObject({ userIds: ['sam'], notice: { data: { courseSlug: 'logo-design', subscriptionId: yearly.id } } });
    expect(notifier.sent[0]!.notice.email?.({ id: 'sam', name: 'Sam', email: 's@x', locale: 'en', timezone: 'Asia/Dubai' })?.subject).toContain('renews soon');
    expect(await service.remindRenewals()).toEqual({ reminders: 0 }); // not twice
    expect(notifier.sent).toHaveLength(1);
  });

  test('a new period gets its own reminder; far-off, CANCELLING and Apple-monthly plans get none; Apple yearly does', async () => {
    const { repo, service, notifier } = setup();
    const a = card(repo);
    card(repo, { currentPeriodEnd: inDays(10) });
    card(repo, { status: 'CANCELLING', cancelAtPeriodEnd: true });
    card(repo, { provider: 'APPLE', plan: 'MONTHLY' });
    const apple = card(repo, { provider: 'APPLE', userId: 'noor' });
    expect(await service.remindRenewals()).toEqual({ reminders: 2 });
    expect(repo.reminders.map((r) => r.id).sort()).toEqual([a.id, apple.id].sort());
    expect(notifier.sent.find((s) => s.userIds[0] === 'noor')!.notice.title).toContain('يتجدّد'); // the learner's language
    await repo.update(a.id, { currentPeriodEnd: inDays(6.2) }); // renewed and moved on
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
  });

  test('a transfer plan is reminded 7 days ahead and again on the end day, monthly or yearly', async () => {
    const { repo, service, notifier } = setup();
    const t = card(repo, { provider: 'BANK_TRANSFER', plan: 'MONTHLY', providerSubscriptionId: null });
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
    expect(notifier.sent[0]!.notice.body).toContain('Renew by transfer');
    await repo.update(t.id, { currentPeriodEnd: inDays(0.5) });
    expect(await service.remindRenewals()).toEqual({ reminders: 1 }); // end day: its own reminder
    expect(repo.reminders.map((r) => r.kind)).toEqual(['SOON', 'END_DAY']);
    expect(await service.remindRenewals()).toEqual({ reminders: 0 });
  });

  test('a run that is 2 days late still sends exactly one reminder', async () => {
    const { repo, service, notifier } = setup();
    card(repo, { currentPeriodEnd: inDays(5) }); // the 7-day mark passed 2 days ago
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
    expect(await service.remindRenewals()).toEqual({ reminders: 0 });
    expect(notifier.types()).toEqual(['SUBSCRIPTION_RENEWS_SOON']);
  });

  test('the end-day reminder also covers a transfer plan that ended within the last 24 h, once', async () => {
    const { repo, service } = setup();
    card(repo, { provider: 'BANK_TRANSFER', plan: 'MONTHLY', providerSubscriptionId: null, currentPeriodEnd: inDays(-0.5) });
    card(repo, { provider: 'BANK_TRANSFER', plan: 'MONTHLY', providerSubscriptionId: null, currentPeriodEnd: inDays(-2), userId: 'noor' });
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
    expect(repo.reminders.map((r) => r.kind)).toEqual(['END_DAY']);
    expect(await service.remindRenewals()).toEqual({ reminders: 0 });
  });

  test('a transfer plan whose renewal receipt is waiting is left alone', async () => {
    const { repo, service } = setup();
    const t = card(repo, { provider: 'BANK_TRANSFER', plan: 'MONTHLY', providerSubscriptionId: null });
    repo.tpay.push({ id: 'tp1', subscriptionId: t.id, status: 'AWAITING_REVIEW', updatedAt: now } as TransferPaymentRow);
    expect(await service.remindRenewals()).toEqual({ reminders: 0 });
  });
});

describe('reminder safety', () => {
  test('a notifier failure gives the claim back, so the next run sends it', async () => {
    const { repo, service, notifier, logged } = setup();
    card(repo);
    const real = notifier.notify.bind(notifier);
    notifier.notify = async () => { throw new Error('smtp down'); };
    expect(await service.remindRenewals()).toEqual({ reminders: 0 });
    expect(logged.some((m) => m.includes('renewal reminder'))).toBe(true);
    expect(repo.sentFor.size).toBe(0);
    notifier.notify = real;
    expect(await service.remindRenewals()).toEqual({ reminders: 1 });
  });

  test('without the admin repository the job logs once and a FULL refund is 503', async () => {
    const logged: string[] = [];
    const repo = new MemRepo();
    const sub = card(repo);
    const service = new SubscriptionService(repo, new FakePaymentGateway(new PriceCalculator(5)), new RecordingNotifier(), { accrueForSubscriptionPayment: async () => null }, { now: () => now }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test', (m) => logged.push(m));
    await service.remindRenewals();
    await service.remindRenewals();
    expect(logged.filter((m) => m.includes('remindRenewals'))).toHaveLength(1);
    const err = await errorOf(service.adminCancel(sub.id, { refund: 'FULL' }, 'admin'));
    expect(err).toMatchObject({ status: 503, code: 'METHOD_UNAVAILABLE' });
    expect(repo.subs[0]!.status).toBe('ACTIVE');
  });
});

describe('HTTP guards', () => {
  const appAs = (role: 'ADMIN' | 'STUDENT' | 'TEACHER', id = 'u1') => {
    const { service } = setup();
    const app = new Hono<AppEnv>();
    app.onError(errorHandler);
    app.use('*', async (c, next) => { c.set('user', { id, name: 'U', email: 'u@x.co', role, locale: 'en', timezone: 'Asia/Dubai' }); await next(); });
    app.route('/admin', adminSubscriptionRoutes(service));
    // Same order as app.ts: the subscriber route first, then the TEACHER-only payout router.
    app.route('/teacher', teacherSubscriberRoutes(service));
    app.route('/teacher', teacherPayoutRoutes({} as never));
    return app;
  };

  test('/admin/subscriptions is admin-only', async () => {
    expect((await appAs('STUDENT').request('/admin/subscriptions')).status).toBe(403);
    expect((await appAs('TEACHER').request('/admin/subscriptions')).status).toBe(403);
    expect((await appAs('STUDENT').request('/admin/subscriptions/s1/cancel', { method: 'POST', body: JSON.stringify({ refund: 'NONE' }), headers: { 'content-type': 'application/json' } })).status).toBe(403);
    expect((await appAs('ADMIN').request('/admin/subscriptions')).status).toBe(200);
  });

  test('an ADMIN reaches /teacher/courses/:id/subscribers, the author too, another teacher or a student not', async () => {
    const res = await appAs('ADMIN', 'root').request('/teacher/courses/rc/subscribers');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active: 3, cancelling: 1, pastDue: 2, total: 6 });
    expect((await appAs('TEACHER', 'lina').request('/teacher/courses/rc/subscribers')).status).toBe(200);
    expect((await appAs('TEACHER', 'omar').request('/teacher/courses/rc/subscribers')).status).toBe(403);
    expect((await appAs('STUDENT').request('/teacher/courses/rc/subscribers')).status).toBe(403);
  });
});

describe('saved courses', () => {
  const row = { id: 'rc', slug: 's', createdById: 'lina', teacherCutPercent: 80, stripeProductId: 'prod_1', stripeMonthlyPriceId: 'price_m', stripeYearlyPriceId: 'price_y', type: 'RECORDED', modules: [] };
  const db = { savedCourse: { findMany: async () => [{ createdAt: now, course: row }] } };
  const service = new SavedCourseService(db as never);

  test('a student gets no teacherCutPercent and no stripe ids', async () => {
    const item = (await service.list('sam', 'STUDENT')).items[0]!;
    expect(item).not.toHaveProperty('teacherCutPercent');
    expect(JSON.stringify(item)).not.toContain('stripe');
    expect(item).toMatchObject({ id: 'rc', savedAt: now });
  });

  test('the author and admins still see the cut, but never the stripe ids', async () => {
    for (const [id, role] of [['lina', 'TEACHER'], ['root', 'ADMIN']] as const) {
      const item = (await service.list(id, role)).items[0]!;
      expect(item.teacherCutPercent).toBe(80);
      expect(JSON.stringify(item)).not.toContain('stripe');
    }
  });
});

describe('admin cancel', () => {
  test('STRIPE with a FULL refund cancels, refunds the last invoice, records it and reverses the earning', async () => {
    const { repo, service, gateway, reversed, notifier } = setup();
    const sub = card(repo);
    const pay = paid(repo, sub.id);
    const out = await service.adminCancel(sub.id, { refund: 'FULL' }, 'admin');
    expect(gateway.subscriptionCalls.map((c) => c.op)).toEqual(['refundInvoice', 'cancelNow']);
    expect(gateway.subscriptionCalls[0]!.args).toEqual(['in_1', 105_000]);
    expect(repo.pays[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 105_000 });
    expect(reversed).toEqual([[pay.id, 105_000]]);
    expect(out).toMatchObject({ status: 'EXPIRED', refundedFils: 105_000, closedPayments: [] });
    expect(repo.subs[0]!.status).toBe('EXPIRED');
    expect(notifier.types()).toEqual(['SUBSCRIPTION_ENDED']);
  });

  test('STRIPE with refund NONE only cancels', async () => {
    const { repo, service, gateway, reversed } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    await service.adminCancel(sub.id, { refund: 'NONE' }, 'admin');
    expect(gateway.subscriptionCalls.map((c) => c.op)).toEqual(['cancelNow']);
    expect(repo.pays[0]!.status).toBe('PAID');
    expect(reversed).toEqual([]);
  });

  test('an unfinished card checkout: its Checkout Session is expired first, then the row ends', async () => {
    const { repo, service, gateway, notifier } = setup();
    const sub = card(repo, { status: 'INCOMPLETE', providerSubscriptionId: null, currentPeriodEnd: null, stripeCheckoutSessionId: 'cs_open#price_y' });
    expect(await service.adminCancel(sub.id, { refund: 'NONE' }, 'admin')).toMatchObject({ status: 'EXPIRED', cancelPending: false });
    expect(gateway.subscriptionCalls).toEqual([{ op: 'expireCheckoutSession', args: ['cs_open'] }]);
    expect(notifier.sent).toEqual([]); // nothing had started, so no "plan ended" notice
  });

  test('an unfinished card checkout that was already paid is 409 and nothing changes', async () => {
    const { repo, service, gateway } = setup();
    const sub = card(repo, { status: 'INCOMPLETE', providerSubscriptionId: null, currentPeriodEnd: null, stripeCheckoutSessionId: 'cs_paid#price_y' });
    gateway.expireResult = 'completed';
    expect(await errorOf(service.adminCancel(sub.id, { refund: 'NONE' }, 'admin'))).toMatchObject({ status: 409, code: 'CHECKOUT_COMPLETED' });
    expect(repo.subs[0]!.status).toBe('INCOMPLETE');
    expect(gateway.subscriptionCalls.map((c) => c.op)).toEqual(['expireCheckoutSession']);
  });

  test('an Apple plan is managed by Apple; an ended plan cannot be cancelled again', async () => {
    const { repo, service, gateway } = setup();
    const apple = card(repo, { provider: 'APPLE' });
    expect(await codeOf(service.adminCancel(apple.id, { refund: 'NONE' }, 'admin'))).toBe('MANAGED_BY_APPLE');
    expect(gateway.subscriptionCalls).toEqual([]);
    const done = card(repo, { status: 'EXPIRED' });
    expect(await codeOf(service.adminCancel(done.id, { refund: 'NONE' }, 'admin'))).toBe('NOT_ACTIVE');
    expect(await codeOf(service.adminCancel('nope', { refund: 'NONE' }, 'admin'))).toBe('NOT_FOUND');
  });

  test('a refused refund changes nothing: 502 REFUND_FAILED, the plan keeps running', async () => {
    const { repo, service, gateway, reversed, notifier } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    gateway.refundInvoice = async () => { throw new Error('stripe down'); };
    const err = await errorOf(service.adminCancel(sub.id, { refund: 'FULL' }, 'admin'));
    expect(err).toMatchObject({ status: 502, code: 'REFUND_FAILED' });
    expect(gateway.subscriptionCalls.map((c) => c.op)).toEqual([]); // not even cancelled in Stripe
    expect(repo.subs[0]!.status).toBe('ACTIVE');
    expect(repo.pays[0]).toMatchObject({ status: 'PAID', refundedFils: 0 });
    expect(reversed).toEqual([]);
    expect(notifier.sent).toEqual([]);
  });

  test('refund first, then cancel; a failing cancelNow keeps the refund and reports cancelPending', async () => {
    const { repo, service, gateway, reversed, notifier, logged } = setup();
    const sub = card(repo);
    const pay = paid(repo, sub.id);
    gateway.cancelNow = async () => { throw new Error('stripe down'); };
    const out = await service.adminCancel(sub.id, { refund: 'FULL' }, 'admin');
    expect(out).toMatchObject({ cancelPending: true, refundedFils: 105_000, status: 'ACTIVE' });
    expect(gateway.subscriptionCalls.map((c) => c.op)).toEqual(['refundInvoice']);
    expect(repo.pays[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 105_000 });
    expect(reversed).toEqual([[pay.id, 105_000]]);
    expect(repo.subs[0]!.status).toBe('ACTIVE');
    expect(notifier.sent).toEqual([]);
    expect(logged.some((m) => m.startsWith('URGENT'))).toBe(true);
    // retrying without a refund finishes the job
    gateway.cancelNow = FakePaymentGateway.prototype.cancelNow.bind(gateway);
    expect(await service.adminCancel(sub.id, { refund: 'FULL' }, 'admin')).toMatchObject({ status: 'EXPIRED', cancelPending: false, refundedFils: 0 });
  });

  test('BANK_TRANSFER goes through adminCancelTransfer and lists the payments it closed', async () => {
    const { repo, service } = setup();
    const t = card(repo, { provider: 'BANK_TRANSFER', plan: 'MONTHLY', providerSubscriptionId: null });
    repo.tpay.push({ id: 'tp1', subscriptionId: t.id, userId: 'sam', reference: 'REC-1', status: 'AWAITING_REVIEW', totalFils: 10_500, refundedFils: 0 } as TransferPaymentRow);
    const out = await service.adminCancel(t.id, { refund: 'NONE' }, 'admin');
    expect(out.status).toBe('EXPIRED');
    expect(out.closedPayments).toMatchObject([{ id: 'tp1', receiptUploaded: true }]);
  });
});

describe('refunds made in the Stripe dashboard', () => {
  const refund = (invoiceId: string | undefined, amountRefundedFils: number) => ({ type: 'refund.succeeded' as const, paymentIntentId: 'pi_1', invoiceId, amountRefundedFils });

  test('a partial refund records the amount, keeps the payment PAID and reverses pro rata', async () => {
    const { repo, service, reversed } = setup();
    const sub = card(repo);
    const pay = paid(repo, sub.id);
    expect(await service.handleStripeEvent(refund('in_1', 30_000))).toEqual({ handled: true });
    expect(repo.pays[0]).toMatchObject({ status: 'PAID', refundedFils: 30_000 });
    expect(reversed).toEqual([[pay.id, 30_000]]);
    // a further refund is cumulative
    await service.handleStripeEvent(refund('in_1', 50_000));
    expect(reversed).toEqual([[pay.id, 30_000], [pay.id, 50_000]]);
  });

  test('a full refund marks the payment REFUNDED', async () => {
    const { repo, service, reversed } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    await service.handleStripeEvent(refund('in_1', 105_000));
    expect(repo.pays[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 105_000 });
    expect(reversed).toHaveLength(1);
  });

  test('a replay of the same cumulative amount changes nothing', async () => {
    const { repo, service, reversed } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    await service.handleStripeEvent(refund('in_1', 30_000));
    expect(await service.handleStripeEvent(refund('in_1', 30_000))).toEqual({ handled: true, duplicate: true });
    expect(await service.handleStripeEvent(refund('in_1', 10_000))).toEqual({ handled: true, duplicate: true }); // an older, smaller snapshot
    expect(reversed).toHaveLength(1);
    expect(repo.pays[0]!.refundedFils).toBe(30_000);
  });

  test('the dashboard refund that follows an admin cancel is a no-op', async () => {
    const { repo, service, reversed } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    await service.adminCancel(sub.id, { refund: 'FULL' }, 'admin');
    expect(await service.handleStripeEvent(refund('in_1', 105_000))).toEqual({ handled: true, duplicate: true });
    expect(reversed).toHaveLength(1);
  });

  test('a seat refund (no invoice) is not ours and touches nothing', async () => {
    const { repo, service, reversed } = setup();
    const sub = card(repo);
    paid(repo, sub.id);
    expect(await service.handleStripeEvent(refund(undefined, 5_000))).toEqual({ handled: false });
    expect(await service.handleStripeEvent(refund('in_unknown', 5_000))).toEqual({ handled: false });
    expect(repo.pays[0]).toMatchObject({ status: 'PAID', refundedFils: 0 });
    expect(reversed).toEqual([]);
  });
});

describe('subscriber counts', () => {
  test('the author and admins see them; others get 403', async () => {
    const { service } = setup();
    expect(await service.subscriberCounts('rc', { id: 'lina', role: 'TEACHER' })).toEqual({ active: 3, cancelling: 1, pastDue: 2, total: 6 });
    expect(await service.subscriberCounts('rc', { id: 'root', role: 'ADMIN' })).toMatchObject({ total: 6 });
    expect((await errorOf(service.subscriberCounts('rc', { id: 'omar', role: 'TEACHER' })))?.status).toBe(403);
  });
});

describe('learning progress', () => {
  const lesson = { id: 'l1', moduleId: 'm1', order: 0, titleEn: 'Intro', titleAr: null };
  const course = (o: Partial<LessonCourse>): LessonCourse => ({
    id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null, status: 'PUBLISHED', createdById: 'lina', type: 'RECORDED', previewLessonId: null,
    modules: [{ id: 'm1', order: 0, titleEn: 'Basics', titleAr: null, descriptionEn: null, descriptionAr: null }], ...o,
  });
  const svc = (courses: LessonCourse[], sub: unknown) =>
    new LessonService(
      {
        activeCourseIds: async () => courses.map((c) => c.id),
        findCourse: async (id: string) => courses.find((c) => c.id === id) ?? null,
        lessonsOfModules: async () => [lesson],
        completedLessonIds: async () => ['l1'],
        learnerSubscription: async () => sub,
      } as unknown as LessonRepository,
      { now: () => now },
    );
  const learner = { id: 'eva', role: 'STUDENT' as const };

  test('a lapsed recorded course with progress is listed with hasAccess false', async () => {
    const out = await svc([course({})], { status: 'EXPIRED', currentPeriodEnd: inDays(-30), provider: 'STRIPE', cancelAtPeriodEnd: false }).myProgress(learner);
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toMatchObject({ type: 'RECORDED', completed: 1, total: 1, subscription: { status: 'EXPIRED', hasAccess: false, cancelAtPeriodEnd: false } });
  });

  test('a live plan has access, a PAST_DUE one only within the grace; LIVE courses carry no subscription', async () => {
    const live = await svc([course({})], { status: 'CANCELLING', currentPeriodEnd: inDays(5), provider: 'STRIPE', cancelAtPeriodEnd: true }).myProgress(learner);
    expect(live.items[0]).toMatchObject({ subscription: { hasAccess: true, cancelAtPeriodEnd: true } });
    const grace = await svc([course({})], { status: 'PAST_DUE', currentPeriodEnd: inDays(-10), provider: 'STRIPE', cancelAtPeriodEnd: false }).myProgress(learner);
    expect(grace.items[0]).toMatchObject({ subscription: { hasAccess: true } });
    const over = await svc([course({})], { status: 'PAST_DUE', currentPeriodEnd: inDays(-20), provider: 'STRIPE', cancelAtPeriodEnd: false }).myProgress(learner);
    expect(over.items[0]).toMatchObject({ subscription: { hasAccess: false } });
    const never = await svc([course({})], null).myProgress(learner);
    expect(never.items[0]).toMatchObject({ subscription: null });
    const liveCourse = await svc([course({ type: 'LIVE' })], null).myProgress(learner);
    expect(liveCourse.items[0]).toMatchObject({ type: 'LIVE' });
    expect('subscription' in liveCourse.items[0]!).toBe(false);
  });
});

describe('teacherCutPercent', () => {
  const record = { id: 'rc', slug: 's', createdById: 'lina', status: 'PUBLISHED', type: 'RECORDED', teacherCutPercent: 80, stripeProductId: 'p', stripeMonthlyPriceId: 'm', stripeYearlyPriceId: 'y', modules: [] } as unknown as CourseRecord;
  const service = new CourseService(
    { findById: async () => record, findBySlug: async () => null, related: async () => [record], list: async () => ({ items: [record], total: 1 }) } as unknown as CourseRepository,
    new RecordingNotifier(),
    { now: () => now },
  );

  test('only admins and the author get it; the public never does', async () => {
    expect((await service.get('rc', null)).teacherCutPercent).toBeUndefined();
    expect((await service.get('rc', { id: 'sam', role: 'STUDENT' })).teacherCutPercent).toBeUndefined();
    expect((await service.get('rc', { id: 'omar', role: 'TEACHER' })).teacherCutPercent).toBeUndefined();
    expect((await service.get('rc', { id: 'lina', role: 'TEACHER' })).teacherCutPercent).toBe(80);
    expect((await service.get('rc', { id: 'root', role: 'ADMIN' })).teacherCutPercent).toBe(80);
    expect('teacherCutPercent' in (await service.list({ skip: 0, take: 10 }, null)).items[0]!).toBe(false);
    expect((await service.related('rc')).items[0]).not.toHaveProperty('teacherCutPercent');
  });
});
