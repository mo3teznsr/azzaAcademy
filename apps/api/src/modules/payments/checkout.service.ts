import type { CheckoutInput, EnrollmentStatus } from '@azza/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { PaymentWebhookEvent } from '../../core/ports';
import { addHours } from '../../core/time';
import { appEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { CheckoutStrategyRegistry } from './checkout/checkout-strategy';
import type { EnrollmentLifecycle } from './enrollment-lifecycle';
import type { EnrollmentStateMachine } from './enrollment-state';
import type { FxService } from './fx.service';
import type { PaymentsRepository, SaleBatch } from './payments.repository';
import { PriceCalculator, type Quote } from './price-calculator';
import type { ReferenceGenerator } from './reference-generator';
import { waitlistRefusal, type WaitlistRefusal } from './waitlist-policy';

const SELLABLE = ['ENROLLING', 'FULL', 'RUNNING'];
type EnrollmentRecordStatus = EnrollmentStatus | null;

const WAITLIST_MESSAGES: Record<WaitlistRefusal, string> = {
  ALREADY_ENROLLED: 'You are already enrolled in this batch',
  ALREADY_WAITLISTED: 'You are already on the waitlist for this batch',
  ORDER_IN_PROGRESS: 'You already hold a seat in this batch — finish your order',
  SEATS_AVAILABLE: 'Seats are still available — enroll instead',
  WAITLIST_DISABLED: 'This batch is full and has no waitlist',
};
/** A promoted waitlist seat (or a failed card) is held this long without an open order. */
export const PENDING_HOLD_HOURS = 24;

export class CheckoutService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly strategies: CheckoutStrategyRegistry,
    private readonly prices: PriceCalculator,
    private readonly fx: Pick<FxService, 'rateFor'>,
    private readonly machine: EnrollmentStateMachine,
    private readonly lifecycle: EnrollmentLifecycle,
    private readonly references: ReferenceGenerator,
    private readonly notifier: Notifier,
  ) {}

  private async sellableBatch(batchId: string): Promise<SaleBatch> {
    const batch = await this.repo.findBatchForSale(batchId);
    if (!batch) throw new NotFoundError('Batch', batchId);
    if (!SELLABLE.includes(batch.status)) throw new BusinessRuleError('This batch is not open for enrollment', 'BATCH_NOT_OPEN');
    return batch;
  }

  async quote(input: Pick<CheckoutInput, 'batchId' | 'couponCode' | 'displayCurrency'>, batch?: SaleBatch): Promise<Quote> {
    const b = batch ?? (await this.sellableBatch(input.batchId));
    let coupon = null;
    if (input.couponCode) {
      coupon = await this.repo.findCoupon(input.couponCode);
      if (!coupon) throw new BusinessRuleError('Coupon not found', 'COUPON_INVALID', { reason: 'NOT_FOUND' });
      const problem = PriceCalculator.couponProblem(coupon, this.lifecycle.now());
      if (problem) throw new BusinessRuleError('This coupon cannot be used', 'COUPON_INVALID', { reason: problem });
    }
    const displayCurrency = input.displayCurrency ?? 'AED';
    return this.prices.quote({
      priceFils: PriceCalculator.basePrice(b.priceFils, b.coursePriceFils),
      coupon,
      displayCurrency,
      fxRate: await this.fx.rateFor(displayCurrency),
    });
  }

  async checkout(userId: string, input: CheckoutInput) {
    const user = await this.repo.findUser(userId);
    if (!user) throw new NotFoundError('User', userId);
    const batch = await this.sellableBatch(input.batchId);
    const strategy = this.strategies.get(input.method);

    const existing = await this.repo.findEnrollment(userId, batch.id);
    if (existing?.status === 'ACTIVE') throw new ConflictError('You are already enrolled in this batch', { code: 'ALREADY_ENROLLED' });
    if (existing?.status === 'WAITLISTED') throw new ConflictError('You are on the waitlist for this batch', { code: 'ALREADY_WAITLISTED', enrollmentId: existing.id });
    if (existing) {
      const open = await this.repo.openOrderFor(existing.id);
      if (open) throw new ConflictError('You already have an order in progress for this batch', { code: 'ORDER_IN_PROGRESS', orderId: open.id });
    }

    // A promoted waitlister (PENDING_PAYMENT without an order) already owns a seat.
    const ownsSeat = existing?.status === 'PENDING_PAYMENT';
    if (!ownsSeat && (await this.repo.heldSeats(batch.id, userId)) >= batch.capacity) {
      if (!batch.waitlistEnabled) throw new ConflictError('This batch is full', { code: 'BATCH_FULL' });
      return { waitlisted: true as const, enrollment: await this.addToWaitlist(userId, batch, existing?.status ?? null) };
    }

    const quote = await this.quote(input, batch);
    this.machine.assert(existing?.status ?? null, strategy.pendingEnrollmentStatus);
    const reference = await this.newReference(batch.code);
    const now = this.lifecycle.now();
    const started = await strategy.start({ user, batch, quote, reference, input, now });

    const enrollment = await this.repo.saveEnrollment(userId, batch.id, strategy.pendingEnrollmentStatus);
    const order = await this.repo.createOrder({
      reference,
      enrollmentId: enrollment.id,
      userId,
      method: strategy.method,
      status: started.orderStatus,
      subtotalFils: quote.subtotalFils,
      discountFils: quote.discountFils,
      vatFils: quote.vatFils,
      totalFils: quote.totalFils,
      displayCurrency: quote.display.currency,
      fxRate: quote.display.rate,
      couponCode: quote.couponCode,
      stripePaymentIntentId: started.stripePaymentIntentId ?? null,
      bankAccountId: started.bankAccountId ?? null,
      expiresAt: started.expiresAt,
    });
    await started.onCreated?.(order);
    await this.lifecycle.syncFullness(batch.id);
    return { waitlisted: false as const, order, enrollment, quote, ...started.response };
  }

  /** `POST /batches/:id/waitlist` — join the waitlist of a full batch without starting a checkout. */
  async joinWaitlist(userId: string, batchId: string) {
    const batch = await this.sellableBatch(batchId);
    const existing = await this.repo.findEnrollment(userId, batch.id);
    const refusal = waitlistRefusal({
      existing: existing?.status ?? null,
      heldSeats: await this.repo.heldSeats(batch.id, userId),
      capacity: batch.capacity,
      waitlistEnabled: batch.waitlistEnabled,
    });
    if (refusal) {
      const open = refusal === 'ORDER_IN_PROGRESS' && existing ? await this.repo.openOrderFor(existing.id) : null;
      throw new ConflictError(WAITLIST_MESSAGES[refusal], { code: refusal, enrollmentId: existing?.id, orderId: open?.id });
    }
    return { enrollment: await this.addToWaitlist(userId, batch, existing?.status ?? null) };
  }

  /** `DELETE /batches/:id/waitlist` — leave the waitlist (WAITLISTED → CANCELLED). */
  async leaveWaitlist(userId: string, batchId: string) {
    const existing = await this.repo.findEnrollment(userId, batchId);
    if (!existing || existing.status !== 'WAITLISTED') throw new NotFoundError('Waitlist entry');
    return { enrollment: await this.repo.setEnrollmentStatus(existing.id, 'CANCELLED') };
  }

  private async addToWaitlist(userId: string, batch: SaleBatch, from: EnrollmentRecordStatus) {
    this.machine.assert(from, 'WAITLISTED');
    const enrollment = await this.repo.saveEnrollment(userId, batch.id, 'WAITLISTED');
    await this.notifier.notify([userId], {
      type: 'WAITLISTED',
      title: `You’re on the waitlist · ${batch.courseTitle} ${batch.code}`,
      body: 'We’ll let you know as soon as a seat opens',
      data: { batchId: batch.id },
      email: (r) => appEmails.waitlisted(r.name, batch.courseTitle, batch.code),
    });
    return enrollment;
  }

  private async newReference(batchCode: string) {
    for (let i = 0; i < 10; i++) {
      const ref = this.references.next(batchCode);
      if (!(await this.repo.referenceExists(ref))) return ref;
    }
    throw new ConflictError('Could not allocate an order reference, please retry');
  }

  /** Throws unless `userId` may attach a receipt to this order right now. */
  async assertReceiptUploadable(orderId: string, userId: string) {
    const order = await this.repo.findOrder(orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.method !== 'BANK_TRANSFER') throw new BusinessRuleError('Receipts are only for bank transfers', 'NOT_BANK_TRANSFER');
    if (order.status !== 'AWAITING_RECEIPT' && order.status !== 'AMOUNT_MISMATCH') {
      throw new BusinessRuleError(`Order is ${order.status}`, 'ORDER_NOT_AWAITING_RECEIPT');
    }
    const now = this.lifecycle.now();
    if (order.status === 'AWAITING_RECEIPT' && order.expiresAt && order.expiresAt < now) {
      throw new BusinessRuleError('The seat hold for this order expired', 'ORDER_EXPIRED');
    }
    return order;
  }

  async uploadReceipt(orderId: string, userId: string, receiptUrl: string) {
    const order = await this.assertReceiptUploadable(orderId, userId);
    const now = this.lifecycle.now();
    const enrollment = await this.repo.findEnrollmentById(order.enrollmentId);
    if (enrollment) await this.lifecycle.move(enrollment, 'VERIFYING');
    const updated = await this.repo.updateOrder(order.id, { status: 'VERIFYING', receiptUrl, receiptUploadedAt: now });
    this.lifecycle.orderUpdated(updated);
    await this.notifier.notifyRole(
      'ADMIN',
      {
        type: 'TRANSFER_TO_VERIFY',
        title: `Transfer to verify · ${order.reference}`,
        body: `${(order.totalFils / 100).toFixed(2)} AED receipt uploaded`,
        data: { orderId: order.id, reference: order.reference },
      },
      { channels: ['in-app', 'realtime'] },
    );
    return updated;
  }

  /** Stripe webhook. Idempotent: replays of an already-applied event are no-ops. */
  async handlePaymentEvent(evt: PaymentWebhookEvent) {
    if (evt.type === 'ignored' || !evt.paymentIntentId) return { handled: false };
    const order = await this.repo.findOrderByPaymentIntent(evt.paymentIntentId);
    if (!order) return { handled: false };

    if (evt.type === 'payment.succeeded') {
      if (order.status === 'PAID' || order.status === 'REFUNDED') return { handled: true, duplicate: true };
      const paid = await this.repo.updateOrder(order.id, {
        status: 'PAID',
        paidAt: this.lifecycle.now(),
        receivedFils: order.totalFils,
        feeFils: evt.feeFils ?? 0,
      });
      if (order.couponCode) await this.repo.redeemCoupon(order.couponCode);
      await this.lifecycle.activate(order.enrollmentId);
      this.lifecycle.orderUpdated(paid);
      return { handled: true };
    }
    if (evt.type === 'payment.failed') {
      if (order.status !== 'AWAITING_PAYMENT') return { handled: true, duplicate: true };
      // The seat stays held (PENDING_PAYMENT) so the student can retry with a new checkout.
      const failed = await this.repo.updateOrder(order.id, { status: 'FAILED' });
      this.lifecycle.orderUpdated(failed);
      return { handled: true };
    }
    return { handled: false };
  }

  /** Job: release seats whose payment never arrived, then offer them to the waitlist. */
  async expireStaleOrders() {
    const now = this.lifecycle.now();
    const batches = new Set<string>();
    let expiredOrders = 0;
    for (const order of await this.repo.staleOrders(now)) {
      const expired = await this.repo.updateOrder(order.id, { status: 'EXPIRED' });
      expiredOrders++;
      const enrollment = await this.repo.findEnrollmentById(order.enrollmentId);
      if (enrollment && (enrollment.status === 'PENDING_PAYMENT' || enrollment.status === 'AWAITING_TRANSFER')) {
        await this.lifecycle.move(enrollment, 'EXPIRED');
        batches.add(enrollment.batchId);
      }
      this.lifecycle.orderUpdated(expired);
      await this.notifier.notify([order.userId], {
        type: 'ORDER_EXPIRED',
        title: `Seat hold expired · ${order.reference}`,
        body: 'We released the seat because payment did not arrive in time',
        data: { orderId: order.id },
      }, { channels: ['in-app', 'realtime', 'push'] });
    }
    let expiredHolds = 0;
    for (const hold of await this.repo.staleHolds(addHours(now, -PENDING_HOLD_HOURS))) {
      await this.lifecycle.move(hold, 'EXPIRED');
      expiredHolds++;
      batches.add(hold.batchId);
    }
    for (const batchId of batches) await this.lifecycle.release(batchId);
    return { expiredOrders, expiredHolds, batches: [...batches] };
  }
}
