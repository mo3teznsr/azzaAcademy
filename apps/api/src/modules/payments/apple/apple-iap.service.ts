import type { AppleVerifyInput } from '@azza/shared';
import { AppError } from '../../../core/errors';
import type { AppleSignedDataVerifier, AppleTransaction } from '../../../core/ports';
import type { CheckoutService } from '../checkout.service';
import type { FinanceAdminService } from '../finance-admin.service';
import type { PaymentsRepository } from '../payments.repository';
import type { SubscriptionService } from '../../subscriptions/subscription.service';
import {
  APPLE_REJECTION_IS_FINAL,
  APPLE_REJECTION_MESSAGES,
  appleNotificationAction,
  isRecordedPlanProduct,
  decideApplePurchase,
  type AppleRejection,
} from './apple-iap-policy';

const STATUS: Partial<Record<AppleRejection, 403 | 404>> = { FOREIGN_ORDER: 403, ORDER_NOT_FOUND: 404 };

function rejection(reason: AppleRejection, orderId?: string) {
  // `details.finishTransaction` tells the app whether to finish the StoreKit transaction anyway.
  return new AppError(APPLE_REJECTION_MESSAGES[reason], STATUS[reason] ?? 409, reason, {
    code: reason,
    orderId,
    finishTransaction: APPLE_REJECTION_IS_FINAL[reason],
  });
}

/** Apple In-App Purchase: confirms StoreKit 2 transactions and applies App Store Server Notifications. */
export class AppleIapService {
  constructor(
    private readonly repo: Pick<
      PaymentsRepository,
      'findOrder' | 'findOrderByAppleTransaction' | 'findOrderByAppleToken' | 'latestUnpaidAppleOrder'
    >,
    private readonly verifier: AppleSignedDataVerifier,
    private readonly checkout: Pick<CheckoutService, 'confirmPaid'>,
    private readonly finance: Pick<FinanceAdminService, 'recordRefund'>,
    /** Recorded-course plans: notifications for their products go here. */
    private readonly subscriptions?: Pick<SubscriptionService, 'handleAppleNotification'>,
  ) {}

  /** `POST /payments/apple/verify`. Idempotent on the Apple transaction id: a replay returns the paid order. */
  async verifyPurchase(userId: string, input: AppleVerifyInput) {
    const tx = await this.verifier.verifyTransaction(input.signedTransaction);

    const applied = await this.repo.findOrderByAppleTransaction(tx.transactionId);
    if (applied) {
      if (applied.userId !== userId) throw rejection('FOREIGN_ORDER');
      return { order: applied, duplicate: true };
    }

    const order = await this.orderFor(userId, tx, input.orderId);
    const decision = decideApplePurchase(order, tx, userId);
    if (decision.kind === 'duplicate') return { order, duplicate: true };
    if (decision.kind === 'reject') {
      console.warn(`[apple-iap] transaction ${tx.transactionId} (${tx.environment}) rejected for order ${order.id}: ${decision.reason}`);
      throw rejection(decision.reason, order.id);
    }
    return { order: await this.checkout.confirmPaid(order, decision.patch), duplicate: false };
  }

  private async orderFor(userId: string, tx: AppleTransaction, orderId?: string) {
    if (tx.appAccountToken) {
      const byToken = await this.repo.findOrderByAppleToken(tx.appAccountToken);
      if (byToken) {
        if (orderId && byToken.id !== orderId) throw rejection('TOKEN_MISMATCH', orderId);
        return byToken;
      }
    }
    const order = orderId ? await this.repo.findOrder(orderId) : await this.repo.latestUnpaidAppleOrder(userId, tx.productId);
    if (!order) {
      console.warn(`[apple-iap] transaction ${tx.transactionId} (${tx.environment}, ${tx.productId}) matches no order of user ${userId}`);
      throw rejection('ORDER_NOT_FOUND', orderId);
    }
    return order;
  }

  /** `POST /api/webhooks/apple` (App Store Server Notifications V2). REFUND / REVOKE cancel the seat. */
  async handleNotification(signedPayload: string) {
    const n = await this.verifier.verifyNotification(signedPayload);
    if (n.transaction && isRecordedPlanProduct(n.transaction.productId)) {
      return this.subscriptions ? this.subscriptions.handleAppleNotification(n) : { handled: false, type: n.notificationType };
    }
    if (appleNotificationAction(n.notificationType) === 'ignore' || !n.transaction) return { handled: false, type: n.notificationType };
    const order = await this.repo.findOrderByAppleTransaction(n.transaction.transactionId);
    if (!order) return { handled: false, type: n.notificationType };
    if (order.status === 'REFUNDED') return { handled: true, duplicate: true, type: n.notificationType };
    if (order.status !== 'PAID') return { handled: false, type: n.notificationType };
    const reason = n.notificationType === 'REVOKE' ? 'Purchase revoked by Apple' : 'Refunded by Apple';
    await this.finance.recordRefund(order, order.totalFils - order.refundedFils, reason);
    return { handled: true, type: n.notificationType };
  }
}
