import Stripe from 'stripe';
import { BASE_CURRENCY } from '@azza/shared';
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionArgs,
  CreatePaymentIntentArgs,
  PaymentGateway,
  PaymentIntentResult,
  PaymentWebhookEvent,
} from '../../core/ports';
import { AppError } from '../../core/errors';

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(args: CreatePaymentIntentArgs): Promise<PaymentIntentResult> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: args.amountFils,
        currency: BASE_CURRENCY.toLowerCase(), // every charge is in AED
        automatic_payment_methods: { enabled: true },
        receipt_email: args.customerEmail,
        metadata: { reference: args.reference, ...args.metadata },
      },
      { idempotencyKey: `order-${args.reference}` },
    );
    if (!intent.client_secret) throw new AppError('Stripe did not return a client secret', 500, 'STRIPE');
    return { id: intent.id, clientSecret: intent.client_secret };
  }

  async createCheckoutSession(args: CreateCheckoutSessionArgs): Promise<CheckoutSessionResult> {
    const metadata = { reference: args.reference, ...args.metadata };
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: args.reference,
        customer_email: args.customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: { currency: BASE_CURRENCY.toLowerCase(), unit_amount: args.amountFils, product_data: { name: args.productName } },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        // Stripe needs at least 30 minutes; the seat hold covers the rest.
        expires_at: Math.max(Math.floor(args.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + 31 * 60),
      },
      { idempotencyKey: `checkout-${args.reference}` },
    );
    if (!session.url) throw new AppError('Stripe did not return a checkout URL', 500, 'STRIPE');
    return { id: session.id, url: session.url };
  }

  async refund(paymentIntentId: string, amountFils: number) {
    await this.stripe.refunds.create({ payment_intent: paymentIntentId, amount: amountFils });
  }

  async parseWebhook(rawBody: string, signature: string | undefined): Promise<PaymentWebhookEvent> {
    if (!this.webhookSecret || !signature) throw new AppError('Missing Stripe signature', 400, 'STRIPE_SIGNATURE');
    const event = await this.stripe.webhooks.constructEventAsync(rawBody, signature, this.webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        return { type: 'payment.succeeded', paymentIntentId: intent.id, feeFils: await this.feeFor(intent) };
      }
      // Hosted Checkout: paid immediately (cards) or later (async methods).
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') return { type: 'ignored' };
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        const intent = piId ? await this.stripe.paymentIntents.retrieve(piId) : null;
        return { type: 'payment.succeeded', checkoutSessionId: session.id, paymentIntentId: piId, feeFils: intent ? await this.feeFor(intent) : 0 };
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        return { type: 'payment.failed', checkoutSessionId: event.data.object.id };
      case 'payment_intent.payment_failed':
        return { type: 'payment.failed', paymentIntentId: event.data.object.id };
      case 'charge.refunded': {
        const pi = event.data.object.payment_intent;
        return { type: 'refund.succeeded', paymentIntentId: typeof pi === 'string' ? pi : pi?.id };
      }
      default:
        return { type: 'ignored' };
    }
  }

  private async feeFor(intent: Stripe.PaymentIntent): Promise<number> {
    const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
    if (!chargeId) return 0;
    const charge = await this.stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] });
    const bt = charge.balance_transaction;
    return typeof bt === 'object' && bt ? bt.fee : 0;
  }
}

/** Development fallback so checkout works without Stripe keys. */
export class FakePaymentGateway implements PaymentGateway {
  readonly refunds: Array<{ paymentIntentId: string; amountFils: number }> = [];
  async createPaymentIntent(args: CreatePaymentIntentArgs) {
    return { id: `pi_dev_${args.reference}`, clientSecret: `pi_dev_${args.reference}_secret` };
  }
  async createCheckoutSession(args: CreateCheckoutSessionArgs) {
    // Dev: no hosted page — go straight to the success URL; confirm with a fake webhook POST.
    return { id: `cs_dev_${args.reference}`, url: args.successUrl };
  }
  async refund(paymentIntentId: string, amountFils: number) {
    this.refunds.push({ paymentIntentId, amountFils });
  }
  async parseWebhook(rawBody: string): Promise<PaymentWebhookEvent> {
    return JSON.parse(rawBody) as PaymentWebhookEvent;
  }
}
