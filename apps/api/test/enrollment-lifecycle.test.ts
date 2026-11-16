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
    priceFils: 88_000,
    timezone: 'Asia/Dubai',
    teacherId: 'lina',
    courseId: 'pdf',
    courseTitle: 'Product Design Foundations',
    firstSessionAt: new Date('2026-12-01T14:00:00Z'),
  });
  repo.bankAccounts.push({ id: 'enbd', bankName: 'Emirates NBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 0 });
  repo.coupons.push({ id: 'c1', code: 'WELCOME10', percentOff: 10, amountOffFils: null, active: true, startsOn: null, expiresOn: null, maxRedemptions: 5, redemptions: 0, perUserLimit: 1, minOrderFils: null, courseId: 'pdf', batchId: null });

  const machine = new EnrollmentStateMachine();
  const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
  let n = 0;
  checkout = new CheckoutService(
    repo,
    new CheckoutStrategyRegistry([new StripeCheckout(gateway, 'https://azza.test'), new BankTransferCheckout(repo, notifier, 48)]),
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
    const evt = { type: 'payment.succeeded' as const, checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: `pi_${res.order.reference}`, feeFils: 2_500 };
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
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: `pi_${res.order.reference}` });
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
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: `pi_${res.order.reference}` });
    await expect(checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' })).rejects.toMatchObject({ status: 409 });
  });

  test('full refund → REFUNDED, Stripe refund issued and teacher earnings reversed', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: `pi_${res.order.reference}` });
    await expect(finance.refund(res.order.id, { amountAed: 1000, reason: 'too much' })).rejects.toMatchObject({ code: 'REFUND_TOO_LARGE' });
    const out = await finance.refund(res.order.id, { amountAed: 924, reason: 'Moved abroad' });
    expect(out.order.status).toBe('REFUNDED');
    expect(out.manual).toBe(false);
    expect(gateway.refunds).toEqual([{ paymentIntentId: `pi_${res.order.reference}`, amountFils: 92_400 }]);
    expect(statusOf('sara')).toBe('REFUNDED');
    expect(reversals).toHaveLength(1);
  });

  const paidStripeOrder = async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    const pi = `pi_${res.order.reference}`;
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: pi });
    return { order: res.order, pi };
  };
  const orderOf = (id: string) => repo.orders.find((o) => o.id === id)!;

  test('a refund made in the Stripe dashboard is booked: earnings reversed, seat released, once', async () => {
    const { order, pi } = await paidStripeOrder();
    const partial = await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: pi, amountRefundedFils: 40_000 });
    expect(partial).toEqual({ handled: true });
    expect(orderOf(order.id)).toMatchObject({ status: 'PAID', refundedFils: 40_000 });
    expect(reversals).toHaveLength(1);
    expect(statusOf('sara')).toBe('ACTIVE');

    // Stripe sends the cumulative amount; the second event books only the remaining 52,400.
    await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: pi, amountRefundedFils: 92_400 });
    expect(orderOf(order.id)).toMatchObject({ status: 'REFUNDED', refundedFils: 92_400 });
    expect(reversals).toHaveLength(2);
    expect(reversals[1]).toMatchObject({ refundFils: 52_400 });
    expect(statusOf('sara')).toBe('REFUNDED');

    const replay = await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: pi, amountRefundedFils: 92_400 });
    expect(replay).toEqual({ handled: true, duplicate: true });
    expect(reversals).toHaveLength(2);
  });

  test("an admin refund's webhook echo books nothing twice, in either order", async () => {
    const first = await paidStripeOrder();
    await finance.refund(first.order.id, { amountAed: 924, reason: 'Moved abroad' });
    await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: first.pi, amountRefundedFils: 92_400 });
    expect(orderOf(first.order.id).refundedFils).toBe(92_400);
    expect(reversals).toHaveLength(1);

    // The echo can also land while the admin refund is still running (between the Stripe call and the booking).
    repo.addUser('omar');
    const res = await checkout.checkout('omar', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    const pi = `pi_${res.order.reference}`;
    await checkout.handlePaymentEvent({ type: 'payment.succeeded', checkoutSessionId: res.order.stripeCheckoutSessionId!, paymentIntentId: pi });
    const refundCall = gateway.refund.bind(gateway);
    gateway.refund = async (id, fils) => {
      await refundCall(id, fils);
      await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: id, amountRefundedFils: fils });
    };
    const out = await finance.refund(res.order.id, { amountAed: 924, reason: 'Changed plans' });
    expect(out.order).toMatchObject({ status: 'REFUNDED', refundedFils: 92_400 });
    expect(reversals).toHaveLength(2);
  });

  test('a chargeback alerts the admins when opened, and a lost one is booked like a refund, once', async () => {
    const { order, pi } = await paidStripeOrder();
    const opened = await finance.handleStripeDispute({ type: 'dispute.opened', paymentIntentId: pi, disputeAmountFils: 92_400, disputeStatus: 'needs_response' });
    expect(opened).toEqual({ handled: true });
    expect(notifier.sent.at(-1)).toMatchObject({ userIds: ['role:ADMIN'], notice: { type: 'PAYMENT_DISPUTED' } });
    expect(orderOf(order.id)).toMatchObject({ status: 'PAID', refundedFils: 0 });
    expect(statusOf('sara')).toBe('ACTIVE');

    expect(await finance.handleStripeDispute({ type: 'dispute.closed', paymentIntentId: pi, disputeAmountFils: 92_400, disputeStatus: 'won' })).toEqual({ handled: true });
    expect(reversals).toHaveLength(0);

    await finance.handleStripeDispute({ type: 'dispute.closed', paymentIntentId: pi, disputeAmountFils: 92_400, disputeStatus: 'lost' });
    expect(orderOf(order.id)).toMatchObject({ status: 'REFUNDED', refundedFils: 92_400 });
    expect(reversals).toHaveLength(1);
    expect(statusOf('sara')).toBe('REFUNDED');

    const replay = await finance.handleStripeDispute({ type: 'dispute.closed', paymentIntentId: pi, disputeAmountFils: 92_400, disputeStatus: 'lost' });
    expect(replay).toEqual({ handled: true, duplicate: true });
    expect(reversals).toHaveLength(1);
  });

  test('refund events for unknown payments are left to the subscriptions', async () => {
    expect(await finance.handleStripeRefund({ type: 'refund.succeeded', paymentIntentId: 'pi_plan_invoice', amountRefundedFils: 5_000, invoiceId: 'in_1' })).toEqual({ handled: false });
    expect(await finance.handleStripeRefund({ type: 'payment.succeeded', paymentIntentId: 'pi_x' })).toEqual({ handled: false });
  });

  test('a bank transfer gets one reminder 6 hours before its hold ends', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'BANK_TRANSFER', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    const expiresAt = res.order.expiresAt!;
    expect(await checkout.remindExpiringTransfers()).toEqual({ reminded: 0 }); // 48 h away
    clock.set(new Date(expiresAt.getTime() - 5 * 3_600_000));
    expect(await checkout.remindExpiringTransfers()).toEqual({ reminded: 1 });
    expect(await checkout.remindExpiringTransfers()).toEqual({ reminded: 0 });
    const notice = notifier.sent.at(-1)!.notice;
    expect(notice).toMatchObject({ type: 'TRANSFER_HOLD_ENDING', data: { orderId: res.order.id } });
    const email = notice.email?.({ id: 'sara', name: 'سارة', email: 's@x', locale: 'ar', timezone: 'Asia/Dubai' });
    expect(email?.subject).toContain('مقعدك محجوز حتى');
    expect(email?.html).toContain(res.order.reference);
  });

  test('a lapsed card checkout on an open class emails a link back to checkout', async () => {
    const res = await checkout.checkout('sara', { batchId: 'b08', method: 'STRIPE', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error();
    clock.set(new Date(res.order.expiresAt!.getTime() + 60_000));
    await checkout.expireStaleOrders();
    const notice = notifier.sent.find((s) => s.notice.type === 'ORDER_EXPIRED')!.notice;
    expect(notice.data).toMatchObject({ orderId: res.order.id, batchId: 'b08' });
    const email = notice.email?.({ id: 'sara', name: 'Sara', email: 's@x', locale: 'en', timezone: 'Asia/Dubai' });
    expect(email?.subject).toBe('Your checkout didn’t finish · Product Design Foundations B08');
    expect(email?.html).toContain('/checkout/b08');
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
