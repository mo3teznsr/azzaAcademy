import type { PaymentGateway } from '../../../core/ports';
import { addMinutes } from '../../../core/time';
import type { CheckoutContext, CheckoutStart, CheckoutStrategy } from './checkout-strategy';

/**
 * Card payment on Stripe's hosted Checkout page, always charged in AED. The client only redirects to
 * `checkoutUrl`; the order turns PAID when Stripe's `checkout.session.completed` webhook arrives.
 */
export class StripeCheckout implements CheckoutStrategy {
  readonly method = 'STRIPE' as const;
  readonly pendingEnrollmentStatus = 'PENDING_PAYMENT' as const;

  constructor(
    private readonly gateway: PaymentGateway,
    private readonly webUrl: string,
    private readonly holdMinutes = 60,
  ) {}

  async start(ctx: CheckoutContext): Promise<CheckoutStart> {
    const expiresAt = addMinutes(ctx.now, this.holdMinutes);
    const ref = encodeURIComponent(ctx.reference);
    const session = await this.gateway.createCheckoutSession({
      amountFils: ctx.quote.totalFils,
      reference: ctx.reference,
      customerEmail: ctx.user.email,
      productName: `${ctx.batch.courseTitle} · ${ctx.batch.code}`,
      metadata: { batchId: ctx.batch.id, userId: ctx.user.id, batchCode: ctx.batch.code },
      successUrl: `${this.webUrl}/checkout/return?ref=${ref}`,
      cancelUrl: `${this.webUrl}/checkout/return?ref=${ref}&cancelled=1`,
      expiresAt,
    });
    return {
      orderStatus: 'AWAITING_PAYMENT',
      expiresAt,
      stripeCheckoutSessionId: session.id,
      response: { checkoutUrl: session.url },
    };
  }
}
