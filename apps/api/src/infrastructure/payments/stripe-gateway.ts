import Stripe from 'stripe';
import { BASE_CURRENCY } from '@azza/shared';
import type {
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
  async refund(paymentIntentId: string, amountFils: number) {
    this.refunds.push({ paymentIntentId, amountFils });
  }
  async parseWebhook(rawBody: string): Promise<PaymentWebhookEvent> {
    return JSON.parse(rawBody) as PaymentWebhookEvent;
  }
}
