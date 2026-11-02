import { aedToFils, formatMoney, type ReviewTransferInput } from '@azza/shared';
import { BusinessRuleError, NotFoundError } from '../../core/errors';
import type { PaymentGateway } from '../../core/ports';
import { addHours, formatInZone } from '../../core/time';
import { appEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { RefundEarningsReverser } from '../payouts/payout.service';
import type { EnrollmentLifecycle } from './enrollment-lifecycle';
import type { PaymentsRepository } from './payments.repository';

const aed = (fils: number) => formatMoney(fils / 100, 'AED');

/** Admin money operations: verifying bank transfers and refunds. */
export class FinanceAdminService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly lifecycle: EnrollmentLifecycle,
    private readonly gateway: PaymentGateway,
    private readonly earnings: RefundEarningsReverser,
    private readonly notifier: Notifier,
    private readonly bankTransferHoldHours: number,
  ) {}

  private async loadOrder(id: string) {
    const order = await this.repo.findOrder(id);
    if (!order) throw new NotFoundError('Order', id);
    return order;
  }

  async review(orderId: string, input: ReviewTransferInput, adminId: string) {
    const order = await this.loadOrder(orderId);
    if (order.method !== 'BANK_TRANSFER') throw new BusinessRuleError('Only bank transfers are reviewed', 'NOT_BANK_TRANSFER');
    if (order.status !== 'VERIFYING' && order.status !== 'AMOUNT_MISMATCH') {
      throw new BusinessRuleError(`Order is ${order.status}, nothing to review`, 'ORDER_NOT_REVIEWABLE');
    }
    const enrollment = await this.repo.findEnrollmentById(order.enrollmentId);
    if (!enrollment) throw new NotFoundError('Enrollment', order.enrollmentId);
    const now = this.lifecycle.now();

    if (input.decision === 'APPROVE') {
      const receivedFils = aedToFils(input.receivedAed);
      if (receivedFils !== order.totalFils) {
        const mismatched = await this.repo.updateOrder(order.id, { status: 'AMOUNT_MISMATCH', receivedFils, verifiedById: adminId, verifiedAt: now });
        this.lifecycle.orderUpdated(mismatched);
        await this.notifier.notify([order.userId], {
          type: 'TRANSFER_AMOUNT_MISMATCH',
          title: `Transfer amount differs · ${order.reference}`,
          body: `Received ${aed(receivedFils)}, expected ${aed(order.totalFils)}`,
          data: { orderId: order.id },
          email: (r) => appEmails.amountMismatch(r.name, order.reference, aed(order.totalFils), aed(receivedFils)),
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
      if (order.couponCode) await this.repo.redeemCoupon(order.couponCode);
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
        data: { orderId: order.id },
        email: (r) => appEmails.transferRejected(r.name, order.reference, input.reason),
      });
      return rejected;
    }

    // REQUEST_NEW_RECEIPT: back to awaiting receipt with a fresh hold
    const expiresAt = addHours(now, this.bankTransferHoldHours);
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
      data: { orderId: order.id },
      email: (r) => appEmails.newReceiptRequested(r.name, order.reference, input.reason, formatInZone(expiresAt, r.timezone, r.locale)),
    });
    return reopened;
  }

  async refund(orderId: string, input: { amountAed: number; reason: string }) {
    const order = await this.loadOrder(orderId);
    if (order.status !== 'PAID') throw new BusinessRuleError('Only paid orders can be refunded', 'ORDER_NOT_PAID');
    const amountFils = aedToFils(input.amountAed);
    const refundable = order.totalFils - order.refundedFils;
    if (amountFils > refundable) throw new BusinessRuleError('Refund exceeds the refundable amount', 'REFUND_TOO_LARGE', { refundableFils: refundable });

    let manual = false;
    if (order.method === 'STRIPE' && order.stripePaymentIntentId) {
      await this.gateway.refund(order.stripePaymentIntentId, amountFils);
    } else {
      manual = true; // bank refund is sent by finance; we record it
    }
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
      body: `${aed(amountFils)} — ${input.reason}`,
      data: { orderId: order.id },
      email: (r) => appEmails.refunded(r.name, aed(amountFils), order.reference),
    });
    return { order: updated, refundFils: amountFils, manual };
  }
}
