import { BusinessRuleError } from '../../../core/errors';
import type { TabbyGateway } from '../../../core/ports';
import { addMinutes } from '../../../core/time';
import type { CheckoutContext, CheckoutStart, CheckoutStrategy } from './checkout-strategy';

/**
 * Tabby's checkout session lapses after 20 minutes and its payment turns EXPIRED about 10 minutes later, so the
 * seat is held a little longer than that: a payment authorised at the last moment still finds its seat.
 */
export const TABBY_HOLD_MINUTES = 45;

/**
 * "Pay in 4" with Tabby on its hosted page. The client only redirects to `checkoutUrl`; the order turns PAID when
 * the payment is AUTHORIZED and we captured it (webhook or the return page's confirm, see TabbyPaymentService).
 */
export class TabbyCheckout implements CheckoutStrategy {
  readonly method = 'TABBY' as const;
  readonly pendingEnrollmentStatus = 'PENDING_PAYMENT' as const;

  constructor(
    private readonly gateway: TabbyGateway,
    private readonly webUrl: string,
    private readonly holdMinutes = TABBY_HOLD_MINUTES,
  ) {}

  async start(ctx: CheckoutContext): Promise<CheckoutStart> {
    const phone = ctx.user.phone?.trim();
    if (!phone) throw new BusinessRuleError('Add your mobile number to your profile to pay with Tabby', 'PHONE_REQUIRED');
    const ref = encodeURIComponent(ctx.reference);
    const back = `${this.webUrl}/checkout/return?ref=${ref}&provider=tabby`;
    const session = await this.gateway.createSession({
      reference: ctx.reference,
      amountFils: ctx.quote.totalFils,
      subtotalFils: ctx.quote.subtotalFils,
      discountFils: ctx.quote.discountFils,
      vatFils: ctx.quote.vatFils,
      buyer: { name: ctx.user.name, email: ctx.user.email, phone },
      registeredSince: ctx.user.createdAt ?? null,
      item: { reference: ctx.batch.id, title: `${ctx.batch.courseTitle} · ${ctx.batch.code}`, category: 'Education' },
      lang: ctx.user.locale === 'ar' ? 'ar' : 'en',
      successUrl: back,
      cancelUrl: `${back}&cancelled=1`,
      failureUrl: `${back}&failed=1`,
    });
    if (session.status !== 'created' || !session.webUrl || !session.paymentId) {
      throw new BusinessRuleError('Tabby cannot approve this purchase, please use another payment method', 'TABBY_REJECTED', {
        reason: session.rejectionReason ?? 'not_available',
      });
    }
    return {
      orderStatus: 'AWAITING_PAYMENT',
      expiresAt: addMinutes(ctx.now, this.holdMinutes),
      tabbyPaymentId: session.paymentId,
      response: { checkoutUrl: session.webUrl },
    };
  }
}
