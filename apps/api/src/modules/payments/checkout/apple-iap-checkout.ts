import { appleSeatProductId } from '@azza/shared';
import { randomUUID } from 'node:crypto';
import { BusinessRuleError } from '../../../core/errors';
import { addMinutes } from '../../../core/time';
import type { CheckoutContext, CheckoutStart, CheckoutStrategy } from './checkout-strategy';

/**
 * iOS: the seat is paid with an Apple In-App Purchase (consumable product per price point). The order carries
 * the product id and a fresh appAccountToken; the app passes the token to StoreKit so the signed transaction
 * names its order. `POST /payments/apple/verify` then confirms it.
 */
export class AppleIapCheckout implements CheckoutStrategy {
  readonly method = 'APPLE_IAP' as const;
  readonly pendingEnrollmentStatus = 'PENDING_PAYMENT' as const;

  constructor(
    private readonly holdMinutes = 60,
    private readonly newToken: () => string = randomUUID,
  ) {}

  async start(ctx: CheckoutContext): Promise<CheckoutStart> {
    // App Store prices are fixed per product, so a coupon cannot lower what StoreKit charges.
    if (ctx.quote.discountFils > 0) throw new BusinessRuleError('Coupons cannot be used with in-app purchase', 'COUPON_NOT_SUPPORTED');
    const productId = appleSeatProductId(ctx.quote.subtotalFils);
    if (!productId) throw new BusinessRuleError('This seat is not sold in the app', 'APPLE_PRODUCT_UNAVAILABLE', { priceFils: ctx.quote.subtotalFils });
    const token = this.newToken().toLowerCase();
    return {
      orderStatus: 'AWAITING_PAYMENT',
      expiresAt: addMinutes(ctx.now, this.holdMinutes),
      appleProductId: productId,
      appleAppAccountToken: token,
      response: { appleProductId: productId, appAccountToken: token },
    };
  }
}
