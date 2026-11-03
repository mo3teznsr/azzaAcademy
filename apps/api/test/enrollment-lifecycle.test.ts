import { beforeEach, describe, expect, test } from 'bun:test';
import { FixedClock } from '../src/infrastructure/clock';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { BankTransferCheckout } from '../src/modules/payments/checkout/bank-transfer-checkout';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { StripeCheckout } from '../src/modules/payments/checkout/stripe-checkout';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { FinanceAdminService } from '../src/modules/payments/finance-admin.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const T0 = new Date('2026-11-02T10:00:00Z');
let clock: FixedClock;
let repo: InMemoryPaymentsRepository;
let notifier: RecordingNotifier;
let gateway: FakePaymentGateway;
let checkout: CheckoutService;
let finance: FinanceAdminService;
const reversals: unknown[] = [];

function setup(capacity = 2) {
  clock = new FixedClock(T0);
  repo = new InMemoryPaymentsRepository(() => clock.now());
  notifier = new RecordingNotifier();
  gateway = new FakePaymentGateway();
  for (const u of ['sara', 'omar', 'maya', 'tomas']) repo.addUser(u);
  repo.batches.set('b08', {
    id: 'b08',
    code: 'B08',
    status: 'ENROLLING',
    capacity,
    waitlistEnabled: true,
    priceFils: null,
    timezone: 'Asia/Dubai',
    teacherId: 'lina',
    courseId: 'pdf',
    courseTitle: 'Product Design Foundations',
    coursePriceFils: 88_000,
    firstSessionAt: new Date('2026-12-01T14:00:00Z'),
  });
  repo.bankAccounts.push({ id: 'enbd', bankName: 'Emirates NBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 });
  repo.coupons.push({ id: 'c1', code: 'WELCOME10', percentOff: 10, amountOffFils: null, active: true, startsOn: null, expiresOn: null, maxRedemptions: 5, redemptions: 0, perUserLimit: 1, minOrderFils: null, courseId: 'pdf', batchId: null });

  const machine = new EnrollmentStateMachine();
  const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
  let n = 0;
  checkout = new CheckoutService(
    repo,
    new CheckoutStrategyRegistry([new StripeCheckout(gateway), new BankTransferCheckout(repo, notifier, 48)]),
    new PriceCalculator(5),
    { rateFor: async () => 1 },
    machine,
    lifecycle,
    new ReferenceGenerator(() => (++n % 9) / 10),
    notifier,
  );
  reversals.length = 0;
  finance = new FinanceAdminService(repo, lifecycle, gateway, { reverseForRefund: async (a) => reversals.push(a) }, notifier, 48);
}

const statusOf = (userId: string) => repo.enrollments.find((e) => e.userId === userId)?.status;

describe('enrollment lifecycle', () => {
  beforeEach(() => setup());

  test('bank transfer: AWAITING_TRANSFER → VERIFYING → ACTIVE', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error('unexpected waitlist');
    expect(res.order.status).toBe('AWAITING_RECEIPT');
    expect(res.order.totalFils).toBe(92_400);
    expect(res.order.reference).toMatch(/^AZ-B08-\d{5}$/);
    expect(statusOf('sara')).toBe('AWAITING_TRANSFER');
    expect(notifier.types()).toContain('TRANSFER_INSTRUCTIONS');

    await checkout.uploadReceipt(res.order.id, 'sara', 'https://files.test/r.pdf');
    expect(statusOf('sara')).toBe('VERIFYING');

    const paid = await finance.review(res.order.id, { decision: 'APPROVE', receivedAed: 924 }, 'nour');
    expect(paid.status).toBe('PAID');
    expect(statusOf('sara')).toBe('ACTIVE');
    expect(notifier.types()).toContain('ENROLLED');
  });

  test('approve with a different amount → AMOUNT_MISMATCH, enrollment stays VERIFYING', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    await checkout.uploadReceipt(res.order.id, 'sara', 'https://files.test/r.pdf');
    await expect(finance.review(res.order.id, { decision: 'APPROVE', receivedAed: 900 }, 'nour')).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
    expect((await repo.findOrder(res.order.id))!.status).toBe('AMOUNT_MISMATCH');
    expect((await repo.findOrder(res.order.id))!.receivedFils).toBe(90_000);
    expect(statusOf('sara')).toBe('VERIFYING');
    // a second review with the right amount succeeds
    await finance.review(res.order.id, { decision: 'APPROVE', receivedAed: 924 }, 'nour');
    expect(statusOf('sara')).toBe('ACTIVE');
  });

  test('request new receipt sends it back to AWAITING_TRANSFER with a fresh hold', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    await checkout.uploadReceipt(res.order.id, 'sara', 'https://files.test/r.pdf');
    clock.set(new Date('2026-11-03T10:00:00Z'));
    const reopened = await finance.review(res.order.id, { decision: 'REQUEST_NEW_RECEIPT', reason: 'Blurry image' }, 'nour');
    expect(reopened.status).toBe('AWAITING_RECEIPT');
    expect(reopened.receiptUrl).toBeNull();
    expect(reopened.expiresAt?.toISOString()).toBe('2026-11-05T10:00:00.000Z');
    expect(statusOf('sara')).toBe('AWAITING_TRANSFER');
  });

  test('full batch → WAITLISTED; a rejected transfer frees the seat and promotes the waitlist', async () => {
    const a = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    await checkout.checkout('omar', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    expect(repo.batches.get('b08')!.status).toBe('FULL');

    const w = await checkout.checkout('maya', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    expect(w.waitlisted).toBe(true);
    expect(statusOf('maya')).toBe('WAITLISTED');
    await expect(checkout.checkout('maya', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' })).rejects.toMatchObject({ status: 409 });

    if (a.waitlisted) throw new Error();
    await checkout.uploadReceipt(a.order.id, 'sara', 'https://files.test/r.pdf');
    await finance.review(a.order.id, { decision: 'REJECT', reason: 'Not our account' }, 'nour');
    expect(statusOf('sara')).toBe('CANCELLED');
    expect(statusOf('maya')).toBe('PENDING_PAYMENT'); // promoted, seat held for her
    expect(notifier.types()).toContain('WAITLIST_SEAT_OPEN');

    // the promoted student can now pay even though the batch looks full to others
    const m = await checkout.checkout('maya', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    expect(m.waitlisted).toBe(false);
    const t = await checkout.checkout('tomas', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    expect(t.waitlisted).toBe(true);
  });

  test('stale bank-transfer hold expires and the waitlist is promoted', async () => {
    await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    await checkout.checkout('omar', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    await checkout.checkout('maya', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    expect(statusOf('maya')).toBe('WAITLISTED');

    clock.set(new Date('2026-11-04T10:00:01Z')); // 48h + 1s
    const result = await checkout.expireStaleOrders();
    expect(result.expiredOrders).toBe(2);
    expect(statusOf('sara')).toBe('EXPIRED');
    expect(statusOf('omar')).toBe('EXPIRED');
    expect(statusOf('maya')).toBe('PENDING_PAYMENT');
    expect(repo.batches.get('b08')!.status).toBe('ENROLLING');

    // promoted hold without an order expires after 24h too
    clock.set(new Date('2026-11-05T10:00:02Z'));
    expect((await checkout.expireStaleOrders()).expiredHolds).toBe(1);
    expect(statusOf('maya')).toBe('EXPIRED');
  });

  test('Stripe webhook activates once (idempotent) and redeems the coupon', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED', couponCode: 'welcome10' });
    if (res.waitlisted) throw new Error();
    expect(res.order.totalFils).toBe(83_160);
    expect(statusOf('sara')).toBe('PENDING_PAYMENT');
    const evt = { type: 'payment.succeeded' as const, paymentIntentId: res.order.stripePaymentIntentId!, feeFils: 2_500 };
    expect(await checkout.handlePaymentEvent(evt)).toEqual({ handled: true });
    expect(await checkout.handlePaymentEvent(evt)).toEqual({ handled: true, duplicate: true });
    expect(statusOf('sara')).toBe('ACTIVE');
    expect(repo.coupons[0]!.redemptions).toBe(1);
    expect((await repo.findOrder(res.order.id))!.feeFils).toBe(2_500);
    expect(notifier.types().filter((t) => t === 'ENROLLED')).toHaveLength(1);
  });

  test('coupon redemption is recorded per student and enforces the per-student limit', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED', couponCode: 'WELCOME10' });
    if (res.waitlisted) throw new Error();
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', paymentIntentId: res.order.stripePaymentIntentId! });
    expect(repo.redemptions).toEqual([{ couponId: 'c1', userId: 'sara', orderId: res.order.id, discountFils: 8_800 }]);
    await expect(checkout.quote({ batchId: 'b08', couponCode: 'WELCOME10', displayCurrency: 'AED' }, undefined, 'sara')).rejects.toMatchObject({
      code: 'COUPON_INVALID',
      details: { reason: 'PER_USER_LIMIT' },
    });
    // anonymous quotes and other students are unaffected
    expect((await checkout.quote({ batchId: 'b08', couponCode: 'WELCOME10', displayCurrency: 'AED' })).discountFils).toBe(8_800);
    expect((await checkout.quote({ batchId: 'b08', couponCode: 'WELCOME10', displayCurrency: 'AED' }, undefined, 'maya')).discountFils).toBe(8_800);
  });

  test('a coupon scoped to another course is refused with WRONG_COURSE', async () => {
    repo.coupons[0]!.courseId = 'python';
    await expect(checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED', couponCode: 'WELCOME10' })).rejects.toMatchObject({
      code: 'COUPON_INVALID',
      details: { reason: 'WRONG_COURSE' },
    });
  });

  test('cannot check out twice while an order is open, nor when already active', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    await expect(checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' })).rejects.toMatchObject({ status: 409 });
    if (res.waitlisted) throw new Error();
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', paymentIntentId: res.order.stripePaymentIntentId! });
    await expect(checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' })).rejects.toMatchObject({ status: 409 });
  });

  test('full refund → REFUNDED, Stripe refund issued and teacher earnings reversed', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', paymentIntentId: res.order.stripePaymentIntentId! });
    await expect(finance.refund(res.order.id, { amountAed: 1000, reason: 'too much' })).rejects.toMatchObject({ code: 'REFUND_TOO_LARGE' });
    const out = await finance.refund(res.order.id, { amountAed: 924, reason: 'Moved abroad' });
    expect(out.order.status).toBe('REFUNDED');
    expect(out.manual).toBe(false);
    expect(gateway.refunds).toEqual([{ paymentIntentId: res.order.stripePaymentIntentId!, amountFils: 92_400 }]);
    expect(statusOf('sara')).toBe('REFUNDED');
    expect(reversals).toHaveLength(1);
  });

  test('state machine rejects illegal moves', () => {
    const m = new EnrollmentStateMachine();
    expect(m.canMove(null, 'AWAITING_TRANSFER')).toBe(true);
    expect(m.canMove(null, 'ACTIVE')).toBe(false);
    expect(m.canMove('ACTIVE', 'WAITLISTED')).toBe(false);
    expect(m.canMove('VERIFYING', 'ACTIVE')).toBe(true);
    expect(() => m.assert('REFUNDED', 'ACTIVE')).toThrow();
  });
});

describe('waitlist endpoint', () => {
  beforeEach(() => setup(1));

  test('join a full batch, refuse duplicates, then leave', async () => {
    await expect(checkout.joinWaitlist('omar', 'b08')).rejects.toMatchObject({ status: 409, details: { code: 'SEATS_AVAILABLE' } });
    await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });

    const res = await checkout.joinWaitlist('omar', 'b08');
    expect(res.enrollment.status).toBe('WAITLISTED');
    expect(notifier.types()).toContain('WAITLISTED');
    await expect(checkout.joinWaitlist('omar', 'b08')).rejects.toMatchObject({ details: { code: 'ALREADY_WAITLISTED' } });
    await expect(checkout.joinWaitlist('sara', 'b08')).rejects.toMatchObject({ details: { code: 'ORDER_IN_PROGRESS' } });

    const left = await checkout.leaveWaitlist('omar', 'b08');
    expect(left.enrollment.status).toBe('CANCELLED');
    await expect(checkout.leaveWaitlist('omar', 'b08')).rejects.toMatchObject({ status: 404 });
  });
});
