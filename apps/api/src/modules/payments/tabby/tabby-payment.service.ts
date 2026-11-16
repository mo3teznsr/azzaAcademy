import { tabbyInstallmentFils, type OrderStatus, type TabbyEligibility, type TabbyEligibilityQuery, type TabbyUnavailableReason } from '@azza/shared';
import { AppError, ForbiddenError, NotFoundError } from '../../../core/errors';
import type { TabbyGateway, TabbyPayment } from '../../../core/ports';
import type { CheckoutService } from '../checkout.service';
import type { EnrollmentLifecycle } from '../enrollment-lifecycle';
import type { OrderRecord, PaymentsRepository } from '../payments.repository';

/** A Tabby authorization may still pay an order our expiry job already closed (as a late Stripe success does). */
const PAYABLE: OrderStatus[] = ['AWAITING_PAYMENT', 'FAILED', 'EXPIRED'];

export type TabbySyncOutcome = 'paid' | 'failed' | 'pending' | 'duplicate' | 'ignored';

/** Idempotency keys Tabby deduplicates on: derived from our order, never from the clock. */
export const tabbyCaptureKey = (orderId: string) => `capture-${orderId}`;
export const tabbyRefundKey = (orderId: string, refundedBeforeFils: number) => `refund-${orderId}-${refundedBeforeFils}`;

/**
 * Tabby "pay in 4" after the hosted page: eligibility (pre-scoring), and turning a payment status into our order
 * status. The payment is always re-read from Tabby's API — a redirect or a webhook body is only a hint.
 *
 *   AUTHORIZED → capture the full amount → order PAID through the shared `confirmPaid` path (fee 0: Tabby's API
 *   does not report its merchant fee; it is settled in Tabby's payout reports)
 *   REJECTED / EXPIRED / closed without capture → order FAILED (the seat stays held so the student can retry)
 *   CREATED → nothing yet
 */
export class TabbyPaymentService {
  constructor(
    private readonly repo: Pick<PaymentsRepository, 'findOrder' | 'findOrderByTabbyPayment' | 'findUser' | 'updateOrder' | 'updateOrderIf'>,
    /** null when Tabby is not configured: the method is then not offered at all. */
    private readonly gateway: TabbyGateway | null,
    private readonly checkout: Pick<CheckoutService, 'confirmPaid' | 'quote'>,
    private readonly lifecycle: Pick<EnrollmentLifecycle, 'orderUpdated'>,
  ) {}

  get configured() {
    return this.gateway !== null;
  }

  /**
   * Background pre-scoring for the checkout page. Tabby asks merchants to fail open: when its API errors or times
   * out the option stays visible, and session creation gives the final answer.
   */
  async eligibility(userId: string, input: TabbyEligibilityQuery): Promise<TabbyEligibility> {
    const quote = await this.checkout.quote({ batchId: input.batchId, couponCode: input.couponCode, displayCurrency: 'AED' }, undefined, userId);
    const installmentFils = tabbyInstallmentFils(quote.totalFils);
    const no = (reason: TabbyUnavailableReason): TabbyEligibility => ({ available: false, reason, installmentFils });
    if (!this.gateway) return no('NOT_CONFIGURED');
    const user = await this.repo.findUser(userId);
    if (!user) throw new NotFoundError('User', userId);
    if (!user.phone?.trim()) return no('PHONE_REQUIRED');
    try {
      const r = await this.gateway.checkEligibility({ amountFils: quote.totalFils, buyer: { name: user.name, email: user.email, phone: user.phone.trim() } });
      if (!r.eligible) return no((r.rejectionReason as TabbyUnavailableReason | null) ?? 'not_available');
    } catch (e) {
      console.warn('[tabby] eligibility check failed; showing Tabby (fail-open)', e instanceof Error ? e.message : e);
    }
    return { available: true, reason: null, installmentFils };
  }

  /** `POST /payments/tabby/orders/:id/confirm` — the return page asks us to check the payment now. */
  async confirmForUser(userId: string, orderId: string) {
    const order = await this.repo.findOrder(orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.method !== 'TABBY') throw new AppError('Not a Tabby order', 422, 'NOT_TABBY');
    return this.sync(order);
  }

  /**
   * `POST /api/webhooks/tabby`. An unknown payment answers 404 so Tabby retries: its `authorized` webhook can
   * arrive before our checkout committed the order.
   */
  async handleWebhook(rawBody: string, header: (name: string) => string | undefined) {
    if (!this.gateway) throw new AppError('Tabby is not configured', 404, 'TABBY_NOT_CONFIGURED');
    const { paymentId } = this.gateway.parseWebhook(rawBody, header);
    const order = await this.repo.findOrderByTabbyPayment(paymentId);
    if (!order) throw new AppError('Unknown Tabby payment', 404, 'TABBY_PAYMENT_UNKNOWN');
    const { outcome } = await this.sync(order);
    return { handled: outcome !== 'ignored', outcome, orderId: order.id };
  }

  /** Brings the order in line with the payment's current status. Safe to call any number of times, concurrently. */
  async sync(order: OrderRecord): Promise<{ order: OrderRecord; outcome: TabbySyncOutcome }> {
    if (!this.gateway || order.method !== 'TABBY' || !order.tabbyPaymentId) return { order, outcome: 'ignored' };
    if (order.status === 'PAID' || order.status === 'REFUNDED') return { order, outcome: 'duplicate' };
    const payment = await this.gateway.getPayment(order.tabbyPaymentId);

    if (payment.status === 'AUTHORIZED' || (payment.status === 'CLOSED' && payment.capturedFils > 0)) return this.pay(order, payment);
    if (payment.status === 'REJECTED' || payment.status === 'EXPIRED' || payment.status === 'CLOSED') {
      const failed = await this.repo.updateOrderIf(order.id, ['AWAITING_PAYMENT'], { status: 'FAILED' });
      if (!failed) return { order: (await this.repo.findOrder(order.id)) ?? order, outcome: 'duplicate' };
      this.lifecycle.orderUpdated(failed);
      return { order: failed, outcome: 'failed' };
    }
    return { order, outcome: 'pending' };
  }

  private async pay(order: OrderRecord, payment: TabbyPayment) {
    if (payment.currency !== 'AED' || payment.amountFils !== order.totalFils) {
      console.error(`[tabby] payment ${payment.id} is ${payment.amountFils} ${payment.currency}, order ${order.reference} expects ${order.totalFils} AED`);
      throw new AppError('Tabby payment does not match the order', 409, 'TABBY_AMOUNT_MISMATCH', { orderId: order.id });
    }
    // Local claim first (one caller wins: the webhook or the return page), then Tabby's idempotent capture.
    const previous = order.status;
    const claimed = await this.repo.updateOrderIf(order.id, PAYABLE, { status: 'PAID' });
    if (!claimed) return { order: (await this.repo.findOrder(order.id)) ?? order, outcome: 'duplicate' as const };
    if (payment.status === 'AUTHORIZED' && payment.capturedFils < payment.amountFils) {
      try {
        await this.gateway!.capture(payment.id, payment.amountFils - payment.capturedFils, tabbyCaptureKey(order.id));
      } catch (e) {
        await this.repo.updateOrder(order.id, { status: previous }); // release the claim; a retry captures
        throw e;
      }
    }
    return { order: await this.checkout.confirmPaid(order, { feeFils: 0 }), outcome: 'paid' as const };
  }
}
