import type { PaymentGateway } from '../../../core/ports';
import { addMinutes } from '../../../core/time';
import type { CheckoutContext, CheckoutStart, CheckoutStrategy } from './checkout-strategy';

/** Card payment via a PaymentIntent, always charged in AED. */
export class StripeCheckout implements CheckoutStrategy {
  readonly method = 'STRIPE' as const;
  readonly pendingEnrollmentStatus = 'PENDING_PAYMENT' as const;

  constructor(
    private readonly gateway: PaymentGateway,
    private readonly holdMinutes = 60,
  ) {}

  async start(ctx: CheckoutContext): Promise<CheckoutStart> {
    const intent = await this.gateway.createPaymentIntent({
      amountFils: ctx.quote.totalFils,
      reference: ctx.reference,
      customerEmail: ctx.user.email,
      metadata: { batchId: ctx.batch.id, userId: ctx.user.id, batchCode: ctx.batch.code },
    });
    return {
      orderStatus: 'AWAITING_PAYMENT',
      expiresAt: addMinutes(ctx.now, this.holdMinutes),
      stripePaymentIntentId: intent.id,
      response: { clientSecret: intent.clientSecret },
    };
  }
}
