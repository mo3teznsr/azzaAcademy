import Stripe from 'stripe';
import { BASE_CURRENCY } from '@azza/shared';
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionArgs,
  CreateSubscriptionCheckoutArgs,
  CreatePaymentIntentArgs,
  PaymentGateway,
  PaymentIntentResult,
  PaymentWebhookEvent,
  UpsertRecordedProductArgs,
  UpsertRecordedProductResult,
  WebhookInvoice,
  WebhookSubscription,
} from '../../core/ports';
import { AppError } from '../../core/errors';
import { PriceCalculator } from '../../modules/payments/price-calculator';

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string | undefined,
    /** The same VAT rule seat checkout uses; Stripe Prices hold the VAT-inclusive amount. */
    private readonly prices: PriceCalculator,
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
        if (session.mode === 'subscription') {
          // The retrieved subscription carries the period and status; a trial's session is `no_payment_required`.
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
          if (!subId) return { type: 'ignored' };
          const sub = await this.stripe.subscriptions.retrieve(subId);
          return { type: 'subscription.updated', subscription: { ...this.toWebhookSubscription(sub), fresh: true } };
        }
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
        const charge = event.data.object;
        const pi = charge.payment_intent;
        const piId = typeof pi === 'string' ? pi : pi?.id;
        return { type: 'refund.succeeded', paymentIntentId: piId, amountRefundedFils: charge.amount_refunded, ...(piId && { invoiceId: await this.invoiceOfPaymentIntent(piId) }) };
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Webhooks can arrive late or out of order, so every one is re-read: each carries the subscription's latest state.
        const retrieved = await this.stripe.subscriptions.retrieve(event.data.object.id).catch(() => null);
        const out = { ...this.toWebhookSubscription(retrieved ?? event.data.object), fresh: retrieved !== null };
        // `deleted` reports the last status it had; the row is over either way.
        return { type: 'subscription.updated', subscription: event.type === 'customer.subscription.deleted' ? { ...out, status: 'canceled' } : out };
      }
      case 'invoice.paid':
        return { type: 'invoice.paid', invoice: await this.toWebhookInvoice(event.data.object) };
      case 'invoice.payment_failed':
        return { type: 'invoice.failed', invoice: await this.toWebhookInvoice(event.data.object) };
      default:
        return { type: 'ignored' };
    }
  }

  private toWebhookSubscription(sub: Stripe.Subscription): WebhookSubscription {
    const item = sub.items.data[0];
    const status = (['active', 'past_due', 'canceled', 'incomplete', 'unpaid'] as const).find((s) => s === sub.status);
    return {
      id: sub.id,
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      // trialing counts as active; incomplete_expired as canceled; paused is not used.
      status: status ?? (sub.status === 'trialing' ? 'active' : sub.status === 'incomplete_expired' ? 'canceled' : 'past_due'),
      currentPeriodEnd: new Date((item?.current_period_end ?? sub.billing_cycle_anchor) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceId: item?.price.id ?? '',
      metadata: { ...sub.metadata },
    };
  }

  private async toWebhookInvoice(inv: Stripe.Invoice): Promise<WebhookInvoice> {
    const details = inv.parent?.subscription_details;
    const sub = details?.subscription;
    const line = inv.lines.data[0];
    return {
      id: inv.id ?? '',
      subscriptionId: sub ? (typeof sub === 'string' ? sub : sub.id) : null,
      amountPaidFils: inv.amount_paid,
      feeFils: inv.amount_paid > 0 ? await this.invoiceFee(inv) : 0,
      periodStart: new Date((line?.period.start ?? inv.period_start) * 1000),
      periodEnd: new Date((line?.period.end ?? inv.period_end) * 1000),
      billingReason: inv.billing_reason ?? null,
      metadata: { ...(details?.metadata ?? {}) },
      customerId: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? null,
    };
  }

  /** The invoice a payment intent paid; undefined for a one-off charge (a seat) or when it cannot be read. */
  private async invoiceOfPaymentIntent(paymentIntentId: string): Promise<string | undefined> {
    try {
      const found = await this.stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntentId }, limit: 1 });
      const inv = found.data[0]?.invoice;
      return typeof inv === 'string' ? inv : inv?.id;
    } catch (e) {
      console.error(`Could not look up the invoice of payment ${paymentIntentId}`, e);
      return undefined;
    }
  }

  /** Stripe's fee on the invoice's payment, from the charge's balance transaction (0 when it cannot be read). */
  private async invoiceFee(inv: Stripe.Invoice): Promise<number> {
    try {
      const payments = await this.stripe.invoicePayments.list({ invoice: inv.id ?? '', status: 'paid', limit: 1 });
      const pi = payments.data[0]?.payment.payment_intent;
      const piId = typeof pi === 'string' ? pi : pi?.id;
      return piId ? await this.feeFor(await this.stripe.paymentIntents.retrieve(piId)) : 0;
    } catch (e) {
      console.error(`Could not read the Stripe fee of invoice ${inv.id}; recording 0`, e);
      return 0;
    }
  }

  async createSubscriptionCheckout(args: CreateSubscriptionCheckoutArgs): Promise<CheckoutSessionResult> {
    const metadata = { reference: args.reference, ...args.metadata, subscriptionRef: args.reference };
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        client_reference_id: args.reference,
        customer_email: args.customerEmail,
        line_items: [{ price: args.priceId, quantity: 1 }],
        metadata,
        subscription_data: { metadata, ...(args.trialEnd && { trial_end: Math.floor(args.trialEnd.getTime() / 1000) }) },
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        // Stripe's minimum is 30 minutes; the default leaves a margin for latency.
        expires_at: Math.floor((args.expiresAt?.getTime() ?? Date.now() + 31 * 60_000) / 1000),
      },
      { idempotencyKey: `sub-checkout-${args.reference}-${args.priceId}${args.trialEnd ? `-t${args.trialEnd.getTime()}-e${args.expiresAt?.getTime() ?? 0}` : ''}` },
    );
    if (!session.url) throw new AppError('Stripe did not return a checkout URL', 500, 'STRIPE');
    return { id: session.id, url: session.url };
  }

  async expireCheckoutSession(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === 'complete') return 'completed';
    if (session.status === 'open') {
      try {
        await this.stripe.checkout.sessions.expire(sessionId);
      } catch (e) {
        // Completed (or expired by itself) between the read and the expire call? Anything else is a real failure.
        const status = (await this.stripe.checkout.sessions.retrieve(sessionId)).status;
        if (status === 'complete') return 'completed';
        if (status !== 'expired') throw e;
      }
    }
    return 'expired';
  }

  async setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
    await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
  }

  async cancelNow(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async switchPlan(subscriptionId: string, newPriceId: string) {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const item = sub.items.data[0];
    if (!item) throw new AppError('Subscription has no items', 500, 'STRIPE');
    const updated = await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: 'create_prorations',
    });
    return { currentPeriodEnd: this.toWebhookSubscription(updated).currentPeriodEnd };
  }

  async customerPortalUrl(customerId: string, returnUrl: string) {
    const session = await this.stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return session.url;
  }

  async refundInvoice(invoiceId: string, amountFils: number) {
    const payments = await this.stripe.invoicePayments.list({ invoice: invoiceId, status: 'paid', limit: 1 });
    const pi = payments.data[0]?.payment.payment_intent;
    const piId = typeof pi === 'string' ? pi : pi?.id;
    if (!piId) throw new AppError('No payment found for this invoice', 422, 'NO_PAYMENT');
    await this.stripe.refunds.create({ payment_intent: piId, amount: amountFils });
  }

  async upsertRecordedProduct(args: UpsertRecordedProductArgs): Promise<UpsertRecordedProductResult> {
    const metadata = { courseId: args.courseId };
    const product = args.productId
      ? await this.stripe.products.update(args.productId, { name: args.name, metadata })
      : await this.stripe.products.create({ name: args.name, metadata });
    const monthly = await this.planPrice(product.id, 'month', this.prices.inclusive(args.monthlyFils), args.currentMonthlyPriceId);
    const yearly = await this.planPrice(product.id, 'year', this.prices.inclusive(args.yearlyFils), args.currentYearlyPriceId);
    // Both new Prices exist before either old one is archived: if the second create fails, nothing has been archived and the
    // course keeps selling on its old Prices. Existing subscriptions point at the old Prices, so archiving does not touch them.
    for (const old of [monthly.replaces, yearly.replaces]) {
      if (!old) continue;
      try {
        await this.stripe.prices.update(old, { active: false });
      } catch (e) {
        // The new ids must still be saved; an old Price left active is only offered by nothing.
        console.error(`[stripe] archiving the old Price ${old} failed`, e);
      }
    }
    return { productId: product.id, monthlyPriceId: monthly.id, yearlyPriceId: yearly.id };
  }

  /**
   * Keeps the current Price when its VAT-inclusive amount still matches; otherwise creates a new one and names the Price it
   * replaces (archived by the caller once every new Price exists).
   */
  private async planPrice(productId: string, interval: 'month' | 'year', amount: number, currentId: string | undefined): Promise<{ id: string; replaces: string | null }> {
    if (currentId) {
      const current = await this.stripe.prices.retrieve(currentId);
      if (current.active && current.unit_amount === amount && current.tax_behavior === 'inclusive' && current.recurring?.interval === interval) return { id: current.id, replaces: null };
    }
    const created = await this.stripe.prices.create({
      product: productId,
      currency: BASE_CURRENCY.toLowerCase(),
      unit_amount: amount,
      recurring: { interval },
      tax_behavior: 'inclusive',
    });
    return { id: created.id, replaces: currentId ?? null };
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
  /** Calls recorded for tests and dev. */
  readonly subscriptionCalls: Array<{ op: string; args: unknown[] }> = [];
  readonly subscriptionCheckouts: CreateSubscriptionCheckoutArgs[] = [];
  /** What `expireCheckoutSession` answers; tests set it to 'completed' to model a paid session. */
  expireResult: 'expired' | 'completed' = 'expired';
  constructor(private readonly prices: PriceCalculator = new PriceCalculator(0)) {}
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
  async upsertRecordedProduct(args: UpsertRecordedProductArgs): Promise<UpsertRecordedProductResult> {
    return {
      productId: args.productId ?? `prod_fake_${args.courseId}`,
      monthlyPriceId: `price_fake_m_${this.prices.inclusive(args.monthlyFils)}`,
      yearlyPriceId: `price_fake_y_${this.prices.inclusive(args.yearlyFils)}`,
    };
  }
  async createSubscriptionCheckout(args: CreateSubscriptionCheckoutArgs) {
    this.subscriptionCheckouts.push(args);
    return { id: `cs_dev_sub_${args.reference}`, url: args.successUrl };
  }
  async expireCheckoutSession(sessionId: string) {
    this.subscriptionCalls.push({ op: 'expireCheckoutSession', args: [sessionId] });
    return this.expireResult;
  }
  async setCancelAtPeriodEnd(subscriptionId: string, cancel: boolean) {
    this.subscriptionCalls.push({ op: 'setCancelAtPeriodEnd', args: [subscriptionId, cancel] });
  }
  async cancelNow(subscriptionId: string) {
    this.subscriptionCalls.push({ op: 'cancelNow', args: [subscriptionId] });
  }
  /** The period end `switchPlan` reports (Stripe resets the billing anchor on a switch). */
  switchPeriodEnd: Date | null = null;
  async switchPlan(subscriptionId: string, newPriceId: string) {
    this.subscriptionCalls.push({ op: 'switchPlan', args: [subscriptionId, newPriceId] });
    return { currentPeriodEnd: this.switchPeriodEnd ?? new Date(Date.now() + 30 * 86_400_000) };
  }
  async customerPortalUrl(customerId: string, returnUrl: string) {
    this.subscriptionCalls.push({ op: 'customerPortalUrl', args: [customerId, returnUrl] });
    return returnUrl;
  }
  async refundInvoice(invoiceId: string, amountFils: number) {
    this.subscriptionCalls.push({ op: 'refundInvoice', args: [invoiceId, amountFils] });
  }
  async parseWebhook(rawBody: string): Promise<PaymentWebhookEvent> {
    return JSON.parse(rawBody) as PaymentWebhookEvent;
  }
}
