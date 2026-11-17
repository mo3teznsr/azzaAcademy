import { aedToFils, formatMoney, type ReviewTransferInput } from '@azza/shared';
import { resolveRule, type RuleValue } from '../../core/rule-value';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { PaymentGateway, PaymentWebhookEvent, TabbyGateway } from '../../core/ports';
import { addHours, formatInZone } from '../../core/time';
import { emailsIn } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { RefundEarningsReverser } from '../payouts/payout.service';
import type { EnrollmentLifecycle } from './enrollment-lifecycle';
import type { OrderRecord, PaymentsRepository } from './payments.repository';
import { tabbyRefundKey } from './tabby/tabby-payment.service';

const aed = (fils: number) => formatMoney(fils / 100, 'AED');

/** Admin money operations: verifying bank transfers and refunds. */
export class FinanceAdminService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly lifecycle: EnrollmentLifecycle,
    private readonly gateway: PaymentGateway,
    private readonly earnings: RefundEarningsReverser,
    private readonly notifier: Notifier,
    /** Fixed, or read per use (the admin-editable rule). */
    private readonly bankTransferHoldHours: RuleValue<number>,
    /** Refunds of TABBY orders; null when Tabby is not configured. */
    private readonly tabby: Pick<TabbyGateway, 'refund'> | null = null,
  ) {}

  private async loadOrder(id: string) {
    const order = await this.repo.findOrder(id);
    if (!order) throw new NotFoundError('Order', id);
    return order;
  }

  /**
   * `fromBankStatement`: the money was seen on the bank statement, which is proof on its own, so an order still waiting
   * for its receipt can be approved (only approved: rejecting still needs a receipt to look at).
   */
  async review(orderId: string, input: ReviewTransferInput, adminId: string, opts: { fromBankStatement?: boolean } = {}) {
    const order = await this.loadOrder(orderId);
    if (order.method !== 'BANK_TRANSFER') throw new BusinessRuleError('Only bank transfers are reviewed', 'NOT_BANK_TRANSFER');
    const awaitingReceipt = order.status === 'AWAITING_RECEIPT' && opts.fromBankStatement && input.decision === 'APPROVE';
    if (order.status !== 'VERIFYING' && order.status !== 'AMOUNT_MISMATCH' && !awaitingReceipt) {
      throw new BusinessRuleError(`Order is ${order.status}, nothing to review`, 'ORDER_NOT_REVIEWABLE');
    }
    let enrollment = await this.repo.findEnrollmentById(order.enrollmentId);
    if (!enrollment) throw new NotFoundError('Enrollment', order.enrollmentId);
    const now = this.lifecycle.now();
    // No receipt was uploaded: the seat moves on as if it had been (AWAITING_TRANSFER -> VERIFYING), then is decided below.
    if (awaitingReceipt && enrollment.status === 'AWAITING_TRANSFER') enrollment = await this.lifecycle.move(enrollment, 'VERIFYING');

    if (input.decision === 'APPROVE') {
      const receivedFils = aedToFils(input.receivedAed);
      if (receivedFils !== order.totalFils) {
        const mismatched = await this.repo.updateOrder(order.id, { status: 'AMOUNT_MISMATCH', receivedFils, verifiedById: adminId, verifiedAt: now });
        this.lifecycle.orderUpdated(mismatched);
        await this.notifier.notify([order.userId], {
          type: 'TRANSFER_AMOUNT_MISMATCH',
          title: `Transfer amount differs · ${order.reference}`,
          body: `Received ${aed(receivedFils)}, expected ${aed(order.totalFils)}`,
          ar: { title: `مبلغ التحويل مختلف · ${order.reference}`, body: `وصلنا ${aed(receivedFils)}، والمطلوب ${aed(order.totalFils)}` },
          data: { orderId: order.id },
          email: (r) => emailsIn(r.locale).amountMismatch(r.name, order.reference, aed(order.totalFils), aed(receivedFils)),
        });
        throw new BusinessRuleError('Received amount does not match the order total', 'AMOUNT_MISMATCH', {
          orderId: order.id,
          status: 'AMOUNT_MISMATCH',
          expectedFils: order.totalFils,
          receivedFils,
          differenceFils: receivedFils - order.totalFils,
        });
      }
      const paid = await this.repo.updateOrder(order.id, {
        status: 'PAID',
        receivedFils,
        verifiedById: adminId,
        verifiedAt: now,
        paidAt: now,
        rejectionReason: null,
      });
      if (order.couponCode) await this.repo.redeemCoupon(order);
      await this.lifecycle.activate(enrollment.id);
      this.lifecycle.orderUpdated(paid);
      return paid;
    }

    if (input.decision === 'REJECT') {
      const rejected = await this.repo.updateOrder(order.id, { status: 'REJECTED', rejectionReason: input.reason, verifiedById: adminId, verifiedAt: now });
      await this.lifecycle.move(enrollment, 'CANCELLED');
      await this.lifecycle.release(enrollment.batchId);
      this.lifecycle.orderUpdated(rejected);
      await this.notifier.notify([order.userId], {
        type: 'TRANSFER_REJECTED',
        title: `Transfer not verified · ${order.reference}`,
        body: input.reason,
        ar: { title: `لم نتمكن من تأكيد التحويل · ${order.reference}`, body: input.reason },
        data: { orderId: order.id },
        email: (r) => emailsIn(r.locale).transferRejected(r.name, order.reference, input.reason),
      });
      return rejected;
    }

    // REQUEST_NEW_RECEIPT: back to awaiting receipt with a fresh hold
    const expiresAt = addHours(now, await resolveRule(this.bankTransferHoldHours));
    const reopened = await this.repo.updateOrder(order.id, {
      status: 'AWAITING_RECEIPT',
      receiptUrl: null,
      receiptUploadedAt: null,
      rejectionReason: input.reason,
      expiresAt,
    });
    await this.lifecycle.move(enrollment, 'AWAITING_TRANSFER');
    this.lifecycle.orderUpdated(reopened);
    await this.notifier.notify([order.userId], {
      type: 'TRANSFER_NEW_RECEIPT',
      title: `New receipt needed · ${order.reference}`,
      body: input.reason,
      ar: { title: `نحتاج إيصالًا جديدًا · ${order.reference}`, body: input.reason },
      data: { orderId: order.id },
      email: (r) => emailsIn(r.locale).newReceiptRequested(r.name, order.reference, input.reason, formatInZone(expiresAt, r.timezone, r.locale)),
    });
    return reopened;
  }

  async refund(orderId: string, input: { amountAed: number; reason: string }) {
    const order = await this.loadOrder(orderId);
    if (order.status !== 'PAID') throw new BusinessRuleError('Only paid orders can be refunded', 'ORDER_NOT_PAID');
    // Apple holds the money for in-app purchases; only Apple refunds them (the webhook records it).
    if (order.method === 'APPLE_IAP') throw new BusinessRuleError('In-app purchases are refunded by Apple', 'APPLE_REFUND_VIA_APPLE');
    const amountFils = aedToFils(input.amountAed);
    const refundable = order.totalFils - order.refundedFils;
    if (amountFils > refundable) throw new BusinessRuleError('Refund exceeds the refundable amount', 'REFUND_TOO_LARGE', { refundableFils: refundable });

    let manual = false;
    if (order.method === 'STRIPE' && order.stripePaymentIntentId) {
      const bookedBefore = order.refundedFils;
      await this.gateway.refund(order.stripePaymentIntentId, amountFils);
      // Stripe's `charge.refunded` webhook may have booked this refund already (see handleStripeRefund): book only the rest.
      const fresh = await this.loadOrder(orderId);
      const unbooked = bookedBefore + amountFils - fresh.refundedFils;
      return { order: unbooked > 0 ? await this.recordRefund(fresh, unbooked, input.reason) : fresh, refundFils: amountFils, manual };
    }
    if (order.method === 'TABBY') {
      // Tabby returns the money to the customer (cancelling instalments first); we book it once Tabby accepted it.
      if (!this.tabby || !order.tabbyPaymentId) throw new BusinessRuleError('Tabby is not configured, refund from the Tabby dashboard', 'TABBY_NOT_CONFIGURED');
      await this.tabby.refund(order.tabbyPaymentId, amountFils, tabbyRefundKey(order.id, order.refundedFils), input.reason);
    } else {
      manual = true; // bank refund is sent by finance; we record it
    }
    return { order: await this.recordRefund(order, amountFils, input.reason), refundFils: amountFils, manual };
  }

  /**
   * Stripe `charge.refunded` for a seat order: a refund made in the Stripe dashboard, or the echo of an admin refund.
   * The event carries the charge's cumulative refunded amount, so only what is not booked yet is recorded (replays and
   * echoes are no-ops). Plan invoices are left to the subscriptions.
   */
  async handleStripeRefund(evt: PaymentWebhookEvent) {
    if (evt.type !== 'refund.succeeded' || !evt.paymentIntentId || evt.amountRefundedFils == null) return { handled: false };
    const order = await this.repo.findOrderByPaymentIntent(evt.paymentIntentId);
    if (!order) return { handled: false };
    const target = Math.min(Math.max(evt.amountRefundedFils, 0), order.totalFils);
    const unbooked = target - order.refundedFils;
    if (unbooked <= 0) return { handled: true, duplicate: true };
    if (order.status !== 'PAID') {
      console.warn(`[finance] Stripe refund of ${unbooked} fils on order ${order.reference} (${order.status}) was not booked`);
      return { handled: true, ignored: order.status };
    }
    await this.recordRefund(order, unbooked, 'Refunded through Stripe');
    return { handled: true };
  }

  /**
   * Stripe chargebacks on a seat order. Opened: the admins are alerted, since evidence must reach Stripe before its deadline.
   * Closed as `lost`: the money is gone, so it is booked like a refund (teacher earnings reversed, seat released when full).
   * Won or withdrawn: nothing changes. Replays are no-ops (a lost dispute books only what is not booked yet).
   */
  async handleStripeDispute(evt: PaymentWebhookEvent) {
    if ((evt.type !== 'dispute.opened' && evt.type !== 'dispute.closed') || !evt.paymentIntentId) return { handled: false };
    const order = await this.repo.findOrderByPaymentIntent(evt.paymentIntentId);
    if (!order) return { handled: false };
    const amountFils = evt.disputeAmountFils ?? order.totalFils;
    if (evt.type === 'dispute.opened') {
      await this.notifier.notifyRole(
        'ADMIN',
        {
          type: 'PAYMENT_DISPUTED',
          title: `Payment disputed · ${order.reference}`,
          body: `${aed(amountFils)} disputed with the card issuer. Respond in the Stripe dashboard before the deadline.`,
          ar: { title: `اعتراض على دفعة · ${order.reference}`, body: `اعترض حامل البطاقة على ${aed(amountFils)} لدى البنك المُصدر. ردّ من لوحة Stripe قبل الموعد النهائي.` },
          data: { orderId: order.id, reference: order.reference },
        },
        { channels: ['in-app', 'realtime', 'email'] },
      );
      return { handled: true };
    }
    if (evt.disputeStatus !== 'lost') return { handled: true }; // won or withdrawn: the money stays
    // A dispute covers what was not refunded yet; a full loss leaves the order REFUNDED, so a replay books nothing.
    const unbooked = Math.min(amountFils, order.totalFils - order.refundedFils);
    if (unbooked <= 0 || order.status !== 'PAID') return { handled: true, duplicate: true };
    await this.recordRefund(order, unbooked, 'Card payment reversed by the card issuer (chargeback)');
    return { handled: true };
  }

  /**
   * Books money that already went back to the student: refunded amount, REFUNDED order + enrollment when full,
   * teacher earnings reversed, seat released to the waitlist, student notified. Used by admin refunds and Apple refunds.
   */
  async recordRefund(order: OrderRecord, amountFils: number, reason: string) {
    const refundedFils = order.refundedFils + amountFils;
    const full = refundedFils >= order.totalFils;
    const updated = await this.repo.updateOrder(order.id, { refundedFils, ...(full && { status: 'REFUNDED' }) });

    const enrollment = await this.repo.findEnrollmentById(order.enrollmentId);
    if (enrollment) {
      await this.earnings.reverseForRefund({
        batchId: enrollment.batchId,
        refundFils: amountFils,
        totalFils: order.totalFils,
        vatFils: order.vatFils,
        reference: order.reference,
      });
      if (full) {
        await this.lifecycle.move(enrollment, 'REFUNDED');
        await this.lifecycle.release(enrollment.batchId);
      }
    }
    this.lifecycle.orderUpdated(updated);
    await this.notifier.notify([order.userId], {
      type: 'ORDER_REFUNDED',
      title: `Refund issued · ${order.reference}`,
      body: `${aed(amountFils)} — ${reason}`,
      ar: { title: `تم استرداد المبلغ · ${order.reference}`, body: `${aed(amountFils)} — ${reason}` },
      data: { orderId: order.id },
      email: (r) => emailsIn(r.locale).refunded(r.name, aed(amountFils), order.reference),
    });
    return updated;
  }
}
