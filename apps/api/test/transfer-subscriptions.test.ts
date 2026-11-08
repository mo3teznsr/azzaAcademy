import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AppError } from '../src/core/errors';
import type { PaymentWebhookEvent } from '../src/core/ports';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv } from '../src/http/types';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { adminFinanceRoutes } from '../src/modules/payments/payments.routes';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { canAccessRecorded } from '../src/modules/subscriptions/access-policy';
import type {
  NewSubscription,
  NewSubscriptionPayment,
  NewTransferPayment,
  SubscribableCourse,
  SubscriptionPatch,
  SubscriptionRepository,
  SubscriptionRow,
  SubscriptionTransferRepository,
  SubscriptionUser,
  TransferPaymentPatch,
  TransferPaymentRow,
} from '../src/modules/subscriptions/subscription.repository';
import { addPeriod, SubscriptionService } from '../src/modules/subscriptions/subscription.service';
import { inboxStatus, toInboxItem } from '../src/modules/subscriptions/transfer-queries';
import { RecordingNotifier } from './fakes/in-memory';

const errorOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e);
const codeOf = async (p: Promise<unknown>) => (await errorOf(p))?.code ?? null;
const DAY = 86_400_000;
const now = new Date('2026-11-20T10:00:00Z');

const COURSE: SubscribableCourse = {
  id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', coverImageUrl: null, type: 'RECORDED', status: 'PUBLISHED',
  monthlyPriceFils: 10_000, yearlyPriceFils: 100_000, stripeMonthlyPriceId: 'price_m', stripeYearlyPriceId: 'price_y',
  appleMonthlyProductId: 'apple.m', appleYearlyProductId: 'apple.y',
};
const sam = { id: 'sam', name: 'Sam', email: 'sam@example.com', locale: 'en' };
const BANK = { id: 'bank1', bankName: 'ENBD', accountName: 'Azza', iban: 'AE070331234567890123456', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 };

class MemRepo implements SubscriptionRepository, SubscriptionTransferRepository {
  courses = [COURSE];
  users: SubscriptionUser[] = [sam];
  subs: SubscriptionRow[] = [];
  payments: NewSubscriptionPayment[] = [];
  tpay: TransferPaymentRow[] = [];
  seq = 0;
  constructor(private clock: () => Date) {}
  async findCourse(idOrSlug: string) { return this.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null; }
  async courseOf(id: string) { return this.courses.find((c) => c.id === id) ?? null; }
  async findUser(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async forUserCourse(userId: string, courseId: string) { return this.subs.filter((s) => s.userId === userId && s.courseId === courseId); }
  async create(data: NewSubscription) {
    const row: SubscriptionRow = { ...data, id: `sub${++this.seq}`, providerSubscriptionId: null, stripeCustomerId: null, stripeCheckoutSessionId: null, appleOriginalTransactionId: null, appleAppAccountToken: null, pendingPlan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, createdAt: this.clock(), updatedAt: this.clock() };
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
  async listForUser(userId: string) { return this.subs.filter((s) => s.userId === userId).map((s) => ({ ...s, course: COURSE })).reverse(); }
  async nextLessonId() { return null; }
  async paymentReferenceTaken(reference: string) { return this.tpay.some((p) => p.reference === reference); }
  async upsertPayment(data: NewSubscriptionPayment) { this.payments.push(data); return { id: `pay${this.payments.length}`, created: true }; }
  async findByAppleToken() { return null; }
  async findByAppleOriginalTransactionId() { return null; }
  async paymentByProviderId() { return null; }
  async refundPayment(id: string, refundedFils: number) {
    const i = this.tpay.findIndex((p) => p.id === id);
    if (i >= 0) this.tpay[i] = { ...this.tpay[i]!, status: 'REFUNDED', refundedFils };
  }
  async failureNoticeSent() { return false; }
  // transfers
  async createTransferPayment(data: NewTransferPayment) {
    const row: TransferPaymentRow = { ...data, id: `tp${this.tpay.length + 1}`, status: 'AWAITING_RECEIPT', refundedFils: 0, paidAt: null, receiptUrl: null, reviewNote: null, reviewedById: null, createdAt: this.clock(), updatedAt: this.clock() };
    this.tpay.push(row);
    return row;
  }
  async transferPayment(id: string) { return this.tpay.find((p) => p.id === id) ?? null; }
  async updateTransferPayment(id: string, patch: TransferPaymentPatch) {
    const i = this.tpay.findIndex((p) => p.id === id);
    this.tpay[i] = { ...this.tpay[i]!, ...patch, updatedAt: this.clock() };
    return this.tpay[i]!;
  }
  async reviewTransferPayment(id: string, patch: TransferPaymentPatch, sub?: { id: string; patch: SubscriptionPatch }) {
    const i = this.tpay.findIndex((p) => p.id === id);
    if (i < 0 || this.tpay[i]!.status !== 'AWAITING_REVIEW') return null; // checked and set with no await in between: atomic
    this.tpay[i] = { ...this.tpay[i]!, ...patch, updatedAt: this.clock() };
    if (sub) await this.update(sub.id, sub.patch);
    return this.tpay[i]!;
  }
  async expireTransferPayments(subscriptionId: string, statuses: string[]) {
    const closed: TransferPaymentRow[] = [];
    this.tpay = this.tpay.map((p) => {
      if (p.subscriptionId !== subscriptionId || !statuses.includes(p.status)) return p;
      closed.push(p);
      return { ...p, status: 'EXPIRED' as const, updatedAt: this.clock() };
    });
    return closed;
  }
  async claimCheckoutSlot(subscriptionId: string, expected: string | null, value: string) {
    const i = this.subs.findIndex((s) => s.id === subscriptionId);
    if (i < 0 || this.subs[i]!.stripeCheckoutSessionId !== expected) return false;
    this.subs[i] = { ...this.subs[i]!, stripeCheckoutSessionId: value };
    return true;
  }
  async transferPaymentsOf(ids: string[]) { return this.tpay.filter((p) => ids.includes(p.subscriptionId)).slice().reverse(); }
  async staleTransferPayments(at: Date) { return this.tpay.filter((p) => p.status === 'AWAITING_RECEIPT' && p.expiresAt && p.expiresAt < at); }
  async endedTransferSubscriptions(at: Date) {
    return this.subs.filter((s) => s.provider === 'BANK_TRANSFER' && ['ACTIVE', 'CANCELLING', 'PAST_DUE'].includes(s.status) && s.currentPeriodEnd && s.currentPeriodEnd <= at);
  }
}

function setup() {
  let at = now;
  const notifier = new RecordingNotifier();
  const repo = new MemRepo(() => at);
  const gateway = new FakePaymentGateway(new PriceCalculator(5));
  const accrued: string[] = [];
  const payouts = { accrueForSubscriptionPayment: async (id: string) => { accrued.push(id); return null; } };
  const logged: string[] = [];
  const bankAccounts = { findBankAccount: async (id: string) => (id === BANK.id ? BANK : null), firstActiveBankAccount: async () => BANK };
  const service = new SubscriptionService(
    repo, gateway, notifier, payouts, { now: () => at }, new ReferenceGenerator(), new PriceCalculator(5), 'https://azza.test',
    (m) => logged.push(m), null, undefined, { repo, bankAccounts, holdHours: 48 },
  );
  return { repo, gateway, notifier, service, accrued, logged, setNow: (d: Date) => { at = d; } };
}

/** A learner who subscribed by transfer: row `sub1`, payment `tp1` AWAITING_RECEIPT. */
async function subscribed(plan: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const ctx = setup();
  const res = await ctx.service.subscribe('sam', 'logo-design', { plan, method: 'BANK_TRANSFER' });
  return { ...ctx, res };
}
async function uploaded(plan: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const ctx = await subscribed(plan);
  await ctx.service.uploadTransferReceipt(ctx.res.paymentId, 'sam', 'https://files.test/r.pdf');
  return ctx;
}
async function active(plan: 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  const ctx = await uploaded(plan);
  await ctx.service.reviewTransfer(ctx.res.paymentId, { approve: true }, 'admin1');
  return ctx;
}

describe('subscribe by transfer', () => {
  test('returns the bank account, reference and VAT-inclusive amount; the payment is AWAITING_RECEIPT', async () => {
    const { res, repo, notifier } = await subscribed();
    expect(res.bankAccount).toMatchObject({ id: 'bank1', iban: BANK.iban });
    expect(res.amountFils).toBe(10_500);
    expect(res.reference).toMatch(/^AZ-REC-/);
    expect(res.expiresAt).toEqual(new Date(now.getTime() + 48 * 3_600_000));
    expect(repo.subs[0]).toMatchObject({ provider: 'BANK_TRANSFER', status: 'INCOMPLETE', plan: 'MONTHLY', priceFils: 10_000 });
    expect(repo.tpay[0]).toMatchObject({ id: res.paymentId, status: 'AWAITING_RECEIPT', totalFils: 10_500, subtotalFils: 10_000, vatFils: 500, bankAccountId: 'bank1' });
    const n = notifier.sent.find((s) => s.notice.type === 'TRANSFER_INSTRUCTIONS')!;
    expect(n.notice.title).toContain('Logo design');
    expect(n.notice.title).toContain('Monthly');
  });

  test('a second subscribe while a payment is open returns the same payment', async () => {
    const { res, service, repo } = await subscribed();
    const again = await service.subscribe('sam', 'logo-design', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
    expect(again.paymentId).toBe(res.paymentId);
    expect(repo.tpay).toHaveLength(1);
    expect(repo.subs).toHaveLength(1);
  });

  test('a live Stripe row blocks a transfer subscribe', async () => {
    const ctx = setup();
    const row = await ctx.repo.create({ userId: 'sam', courseId: 'rc', plan: 'MONTHLY', provider: 'STRIPE', status: 'ACTIVE', priceFils: 10_000 });
    await ctx.repo.update(row.id, { providerSubscriptionId: 'sub_st', currentPeriodEnd: new Date(now.getTime() + 10 * DAY) });
    expect(await codeOf(ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' }))).toBe('ALREADY_SUBSCRIBED');
  });

  test('a recent INCOMPLETE Apple row blocks a transfer subscribe', async () => {
    const ctx = setup();
    await ctx.repo.create({ userId: 'sam', courseId: 'rc', plan: 'MONTHLY', provider: 'APPLE', status: 'INCOMPLETE', priceFils: 10_000 });
    expect(await codeOf(ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' }))).toBe('ALREADY_SUBSCRIBED');
  });
});

describe('receipt', () => {
  test('moves the payment to AWAITING_REVIEW and alerts admins', async () => {
    const { repo, notifier } = await uploaded();
    expect(repo.tpay[0]).toMatchObject({ status: 'AWAITING_REVIEW', receiptUrl: 'https://files.test/r.pdf' });
    expect(notifier.sent.some((s) => s.userIds.includes('role:ADMIN'))).toBe(true);
  });

  test('only the owner can upload (404 for anyone else)', async () => {
    const { service, res } = await subscribed();
    expect(await codeOf(service.assertTransferReceiptUploadable(res.paymentId, 'mallory'))).toBe('NOT_FOUND');
  });

  test('not after the hold expired', async () => {
    const { service, res, setNow } = await subscribed();
    setNow(new Date(now.getTime() + 49 * 3_600_000));
    expect(await codeOf(service.assertTransferReceiptUploadable(res.paymentId, 'sam'))).toBe('PAYMENT_EXPIRED');
  });
});

describe('approval', () => {
  test('makes the plan ACTIVE for a month from approval, accrues and sends a receipt', async () => {
    const { repo, accrued, notifier } = await active();
    expect(repo.tpay[0]).toMatchObject({ status: 'PAID', periodStart: now, periodEnd: new Date('2026-12-20T10:00:00Z'), reviewedById: 'admin1' });
    expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: new Date('2026-12-20T10:00:00Z') });
    expect(accrued).toEqual(['tp1']);
    expect(notifier.types()).toContain('SUBSCRIPTION_RECEIPT');
  });

  test('yearly adds a year', async () => {
    const { repo } = await active('YEARLY');
    expect(repo.subs[0]?.currentPeriodEnd).toEqual(new Date('2027-11-20T10:00:00Z'));
  });

  test('a first transfer awaiting review gives no access', async () => {
    const { repo } = await uploaded();
    expect(canAccessRecorded(repo.subs[0]!, now, false)).toBe(false);
  });

  test('an early renewal approved 5 days before the end extends from the old end, not from now', async () => {
    const { service, repo, setNow } = await active();
    const end = repo.subs[0]!.currentPeriodEnd!;
    setNow(new Date(end.getTime() - 5 * DAY));
    const renew = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
    expect(repo.subs).toHaveLength(1);
    await service.uploadTransferReceipt(renew.paymentId, 'sam', 'https://files.test/r2.pdf');
    await service.reviewTransfer(renew.paymentId, { approve: true }, 'admin1');
    expect(repo.tpay[1]?.periodStart).toEqual(end);
    expect(repo.tpay[1]?.periodEnd).toEqual(new Date('2027-01-20T10:00:00Z'));
    expect(repo.subs[0]?.currentPeriodEnd).toEqual(new Date('2027-01-20T10:00:00Z'));
  });

  test('an amount that differs from the total is refused', async () => {
    const { service, res } = await uploaded();
    expect(await codeOf(service.reviewTransfer(res.paymentId, { approve: true, receivedFils: 9_000 }, 'a'))).toBe('AMOUNT_MISMATCH');
  });
});

describe('renewal receipt and access', () => {
  async function renewalUploaded() {
    const ctx = await active();
    const end = ctx.repo.subs[0]!.currentPeriodEnd!;
    ctx.setNow(new Date(end.getTime() - 2 * DAY));
    const renew = await ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
    await ctx.service.uploadTransferReceipt(renew.paymentId, 'sam', 'https://files.test/r2.pdf');
    return { ...ctx, renew, end };
  }

  test('a receipt uploaded before the end keeps access after the end until review; rejecting removes it', async () => {
    const { service, repo, setNow, renew, end } = await renewalUploaded();
    setNow(new Date(end.getTime() + DAY));
    const mine = (await service.mine('sam')).items[0]!;
    expect(mine.hasAccess).toBe(true);
    expect(mine.pendingPayment).toMatchObject({ id: renew.paymentId, status: 'AWAITING_REVIEW' });
    // the expiry job leaves a row with a pending renewal alone
    await service.expireTransferSubscriptions();
    expect(repo.subs[0]?.status).toBe('ACTIVE');

    await service.reviewTransfer(renew.paymentId, { approve: false, note: 'Not our account' }, 'admin1');
    const after = (await service.mine('sam')).items[0]!;
    expect(after.hasAccess).toBe(false);
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(after.pendingPayment).toMatchObject({ status: 'REJECTED', reviewNote: 'Not our account' });
  });

  test('approving that late renewal extends from max(now, end)', async () => {
    const { service, repo, setNow, renew, end } = await renewalUploaded();
    const late = new Date(end.getTime() + DAY);
    setNow(late);
    await service.reviewTransfer(renew.paymentId, { approve: true }, 'admin1');
    expect(repo.tpay[1]?.periodStart).toEqual(late);
  });

  test('a renewal receipt uploaded after the end does not keep access', async () => {
    const ctx = await active();
    const end = ctx.repo.subs[0]!.currentPeriodEnd!;
    ctx.setNow(new Date(end.getTime() - DAY));
    const renew = await ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
    ctx.setNow(new Date(end.getTime() + DAY));
    await ctx.service.uploadTransferReceipt(renew.paymentId, 'sam', 'https://files.test/r2.pdf');
    expect((await ctx.service.mine('sam')).items[0]?.hasAccess).toBe(false);
  });

  test('policy: BANK_TRANSFER honours the pending flag; other providers do not', () => {
    const end = new Date('2026-12-01T00:00:00Z');
    const after = new Date(end.getTime() + DAY);
    expect(canAccessRecorded({ status: 'ACTIVE', currentPeriodEnd: end, provider: 'BANK_TRANSFER' }, after, true)).toBe(true);
    expect(canAccessRecorded({ status: 'ACTIVE', currentPeriodEnd: end, provider: 'BANK_TRANSFER' }, after, false)).toBe(false);
    expect(canAccessRecorded({ status: 'ACTIVE', currentPeriodEnd: end, provider: 'STRIPE' }, after, true)).toBe(false);
    expect(canAccessRecorded({ status: 'INCOMPLETE', currentPeriodEnd: null, provider: 'BANK_TRANSFER' }, after, true)).toBe(false);
  });
});

describe('rejection, request-new-receipt and expiry', () => {
  test('rejecting a first transfer frees the slot, notifies with the note, and shows pendingPayment REJECTED', async () => {
    const { service, repo, notifier, res } = await uploaded();
    await service.reviewTransfer(res.paymentId, { approve: false, note: 'Wrong amount' }, 'admin1');
    expect(repo.tpay[0]).toMatchObject({ status: 'REJECTED', reviewNote: 'Wrong amount' });
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(notifier.sent.find((s) => s.notice.type === 'TRANSFER_REJECTED')?.notice.body).toBe('Wrong amount');
    expect((await service.mine('sam')).items[0]?.pendingPayment).toMatchObject({ id: res.paymentId, status: 'REJECTED' });
    // the learner can try again with a new row
    const again = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
    expect(again.paymentId).not.toBe(res.paymentId);
  });

  test('request a new receipt reopens the payment with a fresh hold', async () => {
    const { service, repo, res } = await uploaded();
    await service.reviewTransfer(res.paymentId, { approve: false, newReceipt: true, note: 'Blurry' }, 'admin1');
    expect(repo.tpay[0]).toMatchObject({ status: 'AWAITING_RECEIPT', receiptUrl: null, reviewNote: 'Blurry' });
  });

  test('a rejection needs a note', async () => {
    const { service, res } = await uploaded();
    expect(await codeOf(service.reviewTransfer(res.paymentId, { approve: false }, 'a'))).toBe('NOTE_REQUIRED');
  });

  test('the daily job expires held payments, ended plans and notifies SUBSCRIPTION_ENDED', async () => {
    const stale = await subscribed();
    stale.setNow(new Date(now.getTime() + 49 * 3_600_000));
    await stale.service.expireTransferSubscriptions();
    expect(stale.repo.tpay[0]?.status).toBe('EXPIRED');
    expect(stale.repo.subs[0]?.status).toBe('EXPIRED');

    const ended = await active();
    ended.setNow(new Date(ended.repo.subs[0]!.currentPeriodEnd!.getTime() + 1000));
    const out = await ended.service.expireTransferSubscriptions();
    expect(out.expiredSubscriptions).toBe(1);
    expect(ended.repo.subs[0]?.status).toBe('EXPIRED');
    expect(ended.notifier.types()).toContain('SUBSCRIPTION_ENDED');
  });
});

describe('switch to card', () => {
  test('passes trial_end = currentPeriodEnd and returns the checkout url', async () => {
    const { service, gateway, repo } = await active();
    const out = await service.switchToCard('sub1', 'sam');
    expect(out.checkoutUrl).toContain('azza.test');
    expect(gateway.subscriptionCheckouts[0]).toMatchObject({ priceId: 'price_m', trialEnd: repo.subs[0]!.currentPeriodEnd });
    expect(gateway.subscriptionCheckouts[0]?.metadata['replacesSubscriptionId']).toBe('sub1');
  });

  test('on activation the transfer row closes as EXPIRED and the Stripe row takes over without losing access', async () => {
    const { service, repo, setNow } = await active();
    const end = repo.subs[0]!.currentPeriodEnd!;
    await service.switchToCard('sub1', 'sam');
    const evt: PaymentWebhookEvent = {
      type: 'subscription.updated',
      subscription: { id: 'sub_st9', customerId: 'cus_9', status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: false, priceId: 'price_m', metadata: { subscriptionRef: 'sub1', replacesSubscriptionId: 'sub1', userId: 'sam' }, fresh: true },
    };
    await service.handleStripeEvent(evt);
    expect(repo.subs[0]).toMatchObject({ status: 'EXPIRED', currentPeriodEnd: end });
    expect(repo.subs[1]).toMatchObject({ provider: 'STRIPE', status: 'ACTIVE', providerSubscriptionId: 'sub_st9', currentPeriodEnd: end });
    setNow(new Date(end.getTime() - DAY));
    expect((await service.mine('sam')).items.find((r) => r.id === 'sub2')?.hasAccess).toBe(true);
    // a replay does not make a third row
    await service.handleStripeEvent(evt);
    expect(repo.subs).toHaveLength(2);
  });

  test('only an ACTIVE transfer plan can switch', async () => {
    const { service } = await uploaded();
    expect(await codeOf(service.switchToCard('sub1', 'sam'))).toBe('NOT_ACTIVE');
  });
});

describe('admin cancel (service helper)', () => {
  test('FULL records a manual refund on the last payment', async () => {
    const { service, repo } = await active();
    await service.adminCancelTransfer('sub1', { refund: 'FULL' }, 'admin1');
    expect(repo.subs[0]?.status).toBe('EXPIRED');
    expect(repo.tpay[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 10_500 });
  });
});

describe('transfers inbox', () => {
  test('subscription items carry kind, course, plan and the order-vocabulary status', async () => {
    const { repo } = await uploaded();
    const item = toInboxItem({
      ...repo.tpay[0]!,
      user: { id: 'sam', name: 'Sam', email: 'sam@example.com' },
      bankAccount: { id: 'bank1', bankName: 'ENBD', iban: BANK.iban },
      subscription: { id: 'sub1', course: { id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null } },
      reviewedBy: null,
      displayCurrency: 'AED',
      fxRate: { toNumber: () => 1 },
    });
    expect(item).toMatchObject({
      kind: 'SUBSCRIPTION', id: 'tp1', method: 'BANK_TRANSFER', status: 'VERIFYING', paymentStatus: 'AWAITING_REVIEW', plan: 'MONTHLY',
      course: { id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null },
    });
  });

  test('status mapping', () => {
    expect(inboxStatus('AWAITING_RECEIPT')).toBe('AWAITING_RECEIPT');
    expect(inboxStatus('AWAITING_REVIEW')).toBe('VERIFYING');
    expect(inboxStatus('PAID')).toBe('PAID');
    expect(inboxStatus('REJECTED')).toBe('REJECTED');
    expect(inboxStatus('EXPIRED')).toBe('EXPIRED');
    expect(inboxStatus('REFUNDED')).toBe('REFUNDED');
  });

  function adminApp(calls: string[]) {
    const subItem = { kind: 'SUBSCRIPTION', id: 'tp1', status: 'VERIFYING', paymentStatus: 'AWAITING_REVIEW', receiptUploadedAt: new Date('2026-11-01T00:00:00Z'), createdAt: new Date('2026-10-31T00:00:00Z') };
    const seatItem = { id: 'o1', status: 'VERIFYING', receiptUploadedAt: new Date('2026-11-02T00:00:00Z'), createdAt: new Date('2026-10-31T00:00:00Z') };
    const services = {
      orders: { list: async () => ({ items: [seatItem], total: 1 }) },
      subscriptionTransfers: { list: async () => ({ items: [subItem], total: 1 }) },
      subscriptions: {
        isTransferPayment: async (id: string) => id === 'tp1',
        reviewTransfer: async (id: string, input: unknown, admin: string) => { calls.push(`sub:${id}:${JSON.stringify(input)}:${admin}`); return { id, status: 'PAID' }; },
      },
      finance: { review: async (id: string) => { calls.push(`seat:${id}`); return { id }; } },
    };
    const app = new Hono<AppEnv>();
    app.onError(errorHandler);
    app.use('*', async (c, next) => { c.set('user', { id: 'admin1', name: 'A', email: 'a@x.co', role: 'ADMIN', locale: 'en', timezone: 'Asia/Dubai' }); await next(); });
    app.route('/admin', adminFinanceRoutes(services as never));
    return app;
  }

  test('GET /admin/transfers lists seats (kind SEAT) and subscriptions together', async () => {
    const res = await adminApp([]).request('/admin/transfers');
    const body = (await res.json()) as { items: Array<{ kind: string; id: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.items.map((i) => `${i.kind}:${i.id}`)).toEqual(['SUBSCRIPTION:tp1', 'SEAT:o1']);
  });

  test('POST /admin/orders/:id/review dispatches a subscription payment id to reviewTransfer, a seat id to finance', async () => {
    const calls: string[] = [];
    const app = adminApp(calls);
    const post = (id: string, body: unknown) => app.request(`/admin/orders/${id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect((await post('tp1', { decision: 'APPROVE', receivedAed: 105 })).status).toBe(200);
    expect((await post('tp1', { decision: 'REJECT', reason: 'Wrong amount' })).status).toBe(200);
    expect((await post('tp1', { decision: 'REQUEST_NEW_RECEIPT', reason: 'Blurry' })).status).toBe(200);
    expect((await post('o1', { decision: 'REJECT', reason: 'Nope' })).status).toBe(200);
    expect(calls).toEqual([
      'sub:tp1:{"approve":true,"receivedFils":10500}:admin1',
      'sub:tp1:{"approve":false,"note":"Wrong amount"}:admin1',
      'sub:tp1:{"approve":false,"newReceipt":true,"note":"Blurry"}:admin1',
      'seat:o1',
    ]);
  });
});

describe('fix round 1', () => {
  const stripeEvt = (id: string, end: Date, over: Record<string, string> = {}): PaymentWebhookEvent => ({
    type: 'subscription.updated',
    subscription: { id, customerId: 'cus', status: 'active', currentPeriodEnd: end, cancelAtPeriodEnd: false, priceId: 'price_m', metadata: { subscriptionRef: 'sub1', replacesSubscriptionId: 'sub1', userId: 'sam', ...over }, fresh: true },
  });

  describe('atomic review', () => {
    test('two concurrent approvals give one extension, one accrual, one receipt; the second is PAYMENT_NOT_REVIEWABLE', async () => {
      const { service, repo, accrued, notifier, res } = await uploaded();
      const results = await Promise.allSettled([service.reviewTransfer(res.paymentId, { approve: true }, 'a1'), service.reviewTransfer(res.paymentId, { approve: true }, 'a2')]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect((failed.reason as AppError).code).toBe('PAYMENT_NOT_REVIEWABLE');
      expect((failed.reason as AppError).message).toContain('PAID'); // re-read after the lost claim
      expect(repo.subs[0]?.currentPeriodEnd).toEqual(new Date('2026-12-20T10:00:00Z'));
      expect(accrued).toHaveLength(1);
      expect(notifier.types().filter((t) => t === 'SUBSCRIPTION_RECEIPT')).toHaveLength(1);
    });

    test('a second review of the same payment is refused (approve, reject and new-receipt)', async () => {
      const { service, res } = await active();
      expect(await codeOf(service.reviewTransfer(res.paymentId, { approve: true }, 'a'))).toBe('PAYMENT_NOT_REVIEWABLE');
      expect(await codeOf(service.reviewTransfer(res.paymentId, { approve: false, note: 'late' }, 'a'))).toBe('PAYMENT_NOT_REVIEWABLE');
      expect(await codeOf(service.reviewTransfer(res.paymentId, { approve: false, newReceipt: true, note: 'late' }, 'a'))).toBe('PAYMENT_NOT_REVIEWABLE');
    });

    test('concurrent reject and approve: only one wins', async () => {
      const { service, repo, res } = await uploaded();
      const out = await Promise.allSettled([service.reviewTransfer(res.paymentId, { approve: false, note: 'no' }, 'a'), service.reviewTransfer(res.paymentId, { approve: true }, 'b')]);
      expect(out.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(['REJECTED', 'PAID']).toContain(repo.tpay[0]!.status);
    });

    test('approving on an EXPIRED row deliberately brings it back ACTIVE with the new period', async () => {
      const { service, repo, res } = await uploaded();
      await repo.update('sub1', { status: 'EXPIRED' });
      await service.reviewTransfer(res.paymentId, { approve: true }, 'a');
      expect(repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: new Date('2026-12-20T10:00:00Z') });
    });
  });

  describe('period arithmetic', () => {
    test('31 Jan + 1 month clamps to the end of February; 29 Feb + 1 year to 28 Feb', () => {
      expect(addPeriod(new Date('2027-01-31T08:00:00Z'), 'MONTHLY')).toEqual(new Date('2027-02-28T08:00:00Z'));
      expect(addPeriod(new Date('2028-01-31T08:00:00Z'), 'MONTHLY')).toEqual(new Date('2028-02-29T08:00:00Z'));
      expect(addPeriod(new Date('2028-02-29T08:00:00Z'), 'YEARLY')).toEqual(new Date('2029-02-28T08:00:00Z'));
    });
  });

  describe('switch to card is single-flight', () => {
    test('a repeat switch asks for the same Session (same expiry) and does not expire anything', async () => {
      const { service, gateway, setNow } = await active();
      const a = await service.switchToCard('sub1', 'sam');
      setNow(new Date(now.getTime() + 10 * 60_000));
      const b = await service.switchToCard('sub1', 'sam');
      expect(b.checkoutUrl).toBe(a.checkoutUrl);
      expect(gateway.subscriptionCheckouts).toHaveLength(2);
      expect(gateway.subscriptionCheckouts[1]?.expiresAt).toEqual(gateway.subscriptionCheckouts[0]?.expiresAt);
      expect(gateway.subscriptionCalls.filter((c) => c.op === 'expireCheckoutSession')).toHaveLength(0);
    });

    test('after the Session lapsed the old one is expired and a new one made; if it was completed the answer is 409', async () => {
      const { service, gateway, setNow } = await active();
      await service.switchToCard('sub1', 'sam');
      setNow(new Date(now.getTime() + 2 * 3_600_000));
      await service.switchToCard('sub1', 'sam');
      expect(gateway.subscriptionCalls.filter((c) => c.op === 'expireCheckoutSession')).toHaveLength(1);
      expect(gateway.subscriptionCheckouts[1]?.expiresAt).not.toEqual(gateway.subscriptionCheckouts[0]?.expiresAt);
      gateway.expireResult = 'completed';
      setNow(new Date(now.getTime() + 4 * 3_600_000));
      const err = await errorOf(service.switchToCard('sub1', 'sam'));
      expect(err?.status).toBe(409);
    });

    test('a second completed checkout is cancelled in Stripe and logged', async () => {
      const { service, repo, gateway, logged } = await active();
      const end = repo.subs[0]!.currentPeriodEnd!;
      await service.switchToCard('sub1', 'sam');
      await service.handleStripeEvent(stripeEvt('sub_st1', end));
      await service.handleStripeEvent(stripeEvt('sub_stray', end));
      expect(gateway.subscriptionCalls.find((c) => c.op === 'cancelNow')?.args).toEqual(['sub_stray']);
      expect(logged.some((m) => m.includes('stray switch-to-card subscription cancelled'))).toBe(true);
      expect(repo.subs).toHaveLength(2);
    });

    test('a card subscription pointing at an already-taken-over transfer row is cancelled even without the replaces key', async () => {
      const { service, repo, gateway } = await active();
      const end = repo.subs[0]!.currentPeriodEnd!;
      await service.handleStripeEvent(stripeEvt('sub_st1', end));
      await service.handleStripeEvent({ ...stripeEvt('sub_late', end), subscription: { ...stripeEvt('sub_late', end).subscription!, metadata: { subscriptionRef: 'sub1' } } });
      expect(gateway.subscriptionCalls.some((c) => c.op === 'cancelNow' && c.args[0] === 'sub_late')).toBe(true);
    });
  });

  describe('an open transfer payment cannot be orphaned', () => {
    test('(a) switch-to-card refuses with 409 TRANSFER_PENDING while a payment is open', async () => {
      const ctx = await active();
      const end = ctx.repo.subs[0]!.currentPeriodEnd!;
      ctx.setNow(new Date(end.getTime() - 10 * DAY));
      await ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' }); // AWAITING_RECEIPT renewal
      const err = await errorOf(ctx.service.switchToCard('sub1', 'sam'));
      expect([err?.status, err?.code]).toEqual([409, 'TRANSFER_PENDING']);
    });

    test('(a) a takeover expires any payment still open', async () => {
      const { service, repo } = await active();
      const end = repo.subs[0]!.currentPeriodEnd!;
      await service.switchToCard('sub1', 'sam');
      // a renewal opened while the card checkout was out
      await repo.createTransferPayment({ subscriptionId: 'sub1', userId: 'sam', reference: 'R-X', plan: 'MONTHLY', periodStart: now, periodEnd: now, subtotalFils: 1, vatFils: 0, totalFils: 1, bankAccountId: 'bank1', expiresAt: end });
      await service.handleStripeEvent(stripeEvt('sub_st1', end));
      expect(repo.tpay.find((p) => p.reference === 'R-X')?.status).toBe('EXPIRED');
    });

    test('(b) Stripe and Apple subscribe are 409 over a transfer with an open payment', async () => {
      const awaitingReceipt = await subscribed();
      expect(await codeOf(awaitingReceipt.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
      expect(await codeOf(awaitingReceipt.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'APPLE_IAP' }))).toBe('ALREADY_SUBSCRIBED');
      const awaitingReview = await uploaded();
      expect(await codeOf(awaitingReview.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' }))).toBe('ALREADY_SUBSCRIBED');
      expect(awaitingReview.repo.subs[0]?.status).toBe('INCOMPLETE');
    });

    test('(b) an INCOMPLETE transfer row whose payments are all closed can be replaced by a card checkout', async () => {
      const { service, repo, res } = await subscribed();
      await repo.updateTransferPayment(res.paymentId, { status: 'REJECTED' });
      const out = await service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'STRIPE' });
      expect(out.checkoutUrl).toBeTruthy();
      expect(repo.subs[0]?.status).toBe('EXPIRED');
    });

    test('(c) a receipt for a payment on an EXPIRED plan is refused', async () => {
      const { service, repo, res } = await subscribed();
      await repo.update('sub1', { status: 'EXPIRED' });
      expect(await codeOf(service.assertTransferReceiptUploadable(res.paymentId, 'sam'))).toBe('PLAN_ENDED');
    });

    test('the job closes a lapsed renewal payment along with the plan', async () => {
      const ctx = await active();
      const end = ctx.repo.subs[0]!.currentPeriodEnd!;
      ctx.setNow(new Date(end.getTime() - DAY));
      await ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
      ctx.setNow(new Date(end.getTime() + 1000));
      await ctx.service.expireTransferSubscriptions();
      expect(ctx.repo.subs[0]?.status).toBe('EXPIRED');
      expect(ctx.repo.tpay[1]?.status).toBe('EXPIRED');
    });
  });

  test('isTransferPayment is false for a payment of a card row; subscribe response carries the plan', async () => {
    const { service, repo, res } = await subscribed('YEARLY');
    expect(res.plan).toBe('YEARLY');
    expect(await service.isTransferPayment(res.paymentId)).toBe(true);
    repo.subs[0]!.provider = 'STRIPE';
    expect(await service.isTransferPayment(res.paymentId)).toBe(false);
  });

  describe('round 2', () => {
    test('a receipt uploaded after the end survives the daily job; approval then gives ACTIVE', async () => {
      const ctx = await active();
      const end = ctx.repo.subs[0]!.currentPeriodEnd!;
      ctx.setNow(new Date(end.getTime() - DAY));
      const renew = await ctx.service.subscribe('sam', 'rc', { plan: 'MONTHLY', method: 'BANK_TRANSFER' });
      const late = new Date(end.getTime() + DAY);
      ctx.setNow(late);
      await ctx.service.uploadTransferReceipt(renew.paymentId, 'sam', 'https://files.test/late.pdf');
      await ctx.service.expireTransferSubscriptions();
      expect(ctx.repo.subs[0]?.status).toBe('EXPIRED');
      expect(ctx.repo.tpay[1]?.status).toBe('AWAITING_REVIEW');
      await ctx.service.reviewTransfer(renew.paymentId, { approve: true }, 'admin1');
      expect(ctx.repo.subs[0]).toMatchObject({ status: 'ACTIVE', currentPeriodEnd: new Date('2027-01-21T10:00:00Z') });
    });

    test('a takeover leaves an AWAITING_REVIEW payment alone', async () => {
      const { service, repo } = await active();
      const end = repo.subs[0]!.currentPeriodEnd!;
      await service.switchToCard('sub1', 'sam');
      await repo.createTransferPayment({ subscriptionId: 'sub1', userId: 'sam', reference: 'R-Y', plan: 'MONTHLY', periodStart: now, periodEnd: now, subtotalFils: 1, vatFils: 0, totalFils: 1, bankAccountId: 'bank1', expiresAt: end });
      repo.tpay.find((p) => p.reference === 'R-Y')!.status = 'AWAITING_REVIEW';
      await service.handleStripeEvent(stripeEvt('sub_st1', end));
      expect(repo.tpay.find((p) => p.reference === 'R-Y')?.status).toBe('AWAITING_REVIEW');
    });

    test('admin cancel closes a payment under review and lists it', async () => {
      const { service, repo } = await uploaded();
      const out = await service.adminCancelTransfer('sub1', { refund: 'NONE' }, 'admin1');
      expect(repo.tpay[0]?.status).toBe('EXPIRED');
      expect(out.closedPayments).toEqual([expect.objectContaining({ id: 'tp1', status: 'AWAITING_REVIEW', receiptUploaded: true })]);
    });

    test('two concurrent first switch-to-card calls ask for the same Session', async () => {
      const { service, gateway, repo } = await active();
      const [a, b] = await Promise.all([service.switchToCard('sub1', 'sam'), service.switchToCard('sub1', 'sam')]);
      expect(a.checkoutUrl).toBe(b.checkoutUrl);
      expect(gateway.subscriptionCheckouts).toHaveLength(2);
      expect(gateway.subscriptionCheckouts[0]?.expiresAt).toEqual(gateway.subscriptionCheckouts[1]?.expiresAt);
      expect(gateway.subscriptionCheckouts[0]?.trialEnd).toEqual(gateway.subscriptionCheckouts[1]?.trialEnd);
      expect(repo.subs[0]?.stripeCheckoutSessionId).toMatch(/^cs_dev_sub_sub1@\d+$/);
    });

    test('a failed Session creation releases the slot', async () => {
      const { service, gateway, repo } = await active();
      const original = gateway.createSubscriptionCheckout.bind(gateway);
      gateway.createSubscriptionCheckout = async () => { throw new Error('stripe down'); };
      await errorOf(service.switchToCard('sub1', 'sam'));
      expect(repo.subs[0]?.stripeCheckoutSessionId ?? '').toBe('');
      gateway.createSubscriptionCheckout = original;
      expect((await service.switchToCard('sub1', 'sam')).checkoutUrl).toBeTruthy();
    });

    test('a lost review claim names the payment\'s actual status', async () => {
      const { service, res } = await active();
      const err = await errorOf(service.reviewTransfer(res.paymentId, { approve: true }, 'a'));
      expect(err?.message).toContain('PAID');
    });

    test('a stray with no Stripe id is logged as nothing to cancel', async () => {
      const { service, repo, logged } = await active();
      const end = repo.subs[0]!.currentPeriodEnd!;
      await service.handleStripeEvent(stripeEvt('sub_st1', end));
      const evt = stripeEvt('x', end);
      (evt.subscription as { id: string | null }).id = null;
      await service.handleStripeEvent(evt);
      expect(logged.some((m) => m.includes('nothing to cancel'))).toBe(true);
    });
  });
});
