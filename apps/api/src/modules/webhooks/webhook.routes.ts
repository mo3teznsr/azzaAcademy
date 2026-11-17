import { Hono } from 'hono';
import { AppError } from '../../core/errors';
import type { PaymentGateway, VideoProvider } from '../../core/ports';
import type { AppEnv } from '../../http/types';
import type { AppleIapService } from '../payments/apple/apple-iap.service';
import type { CheckoutService } from '../payments/checkout.service';
import type { FinanceAdminService } from '../payments/finance-admin.service';
import type { TabbyPaymentService } from '../payments/tabby/tabby-payment.service';
import type { LessonStreamingService } from '../lessons/lesson-streaming.service';
import type { PayoutDispatchService } from '../payouts/payout-dispatch.service';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { SessionService } from '../sessions/session.service';

/** Mounted at /api/webhooks. Bodies are read raw so signatures can be verified. */
export function webhookRoutes(deps: {
  payments: PaymentGateway;
  video: VideoProvider;
  checkout: CheckoutService;
  finance: Pick<FinanceAdminService, 'handleStripeRefund' | 'handleStripeDispute'>;
  subscriptions: SubscriptionService;
  sessions: SessionService;
  appleIap: AppleIapService;
  tabby: Pick<TabbyPaymentService, 'handleWebhook'>;
  lessonStreaming?: Pick<LessonStreamingService, 'handleWebhook'>;
  payoutDispatch?: Pick<PayoutDispatchService, 'handleWebhook'>;
}) {
  return new Hono<AppEnv>()
    .post('/stripe', async (c) => {
      const raw = await c.req.text();
      const event = await deps.payments.parseWebhook(raw, c.req.header('stripe-signature'));
      // Seat orders first (payments, refunds, disputes); whatever they do not claim (plan and invoice events) is the subscriptions' to handle.
      for (const handle of [
        () => deps.checkout.handlePaymentEvent(event),
        () => deps.finance.handleStripeRefund(event),
        () => deps.finance.handleStripeDispute(event),
      ]) {
        const out = await handle();
        if (out.handled) return c.json({ received: true, ...out });
      }
      return c.json({ received: true, ...(await deps.subscriptions.handleStripeEvent(event)) });
    })
    // Tabby: verified by the static auth header registered with the webhook; the payment is re-read from Tabby's API.
    .post('/tabby', async (c) => {
      const raw = await c.req.text();
      return c.json({ received: true, ...(await deps.tabby.handleWebhook(raw, (name) => c.req.header(name))) });
    })
    // MediaConvert job state changes: EventBridge → SNS (HTTPS subscription). The SNS signature and topic are verified,
    // subscription confirmations are answered, and the job is re-read with GetJob.
    .post('/mediaconvert', async (c) => {
      const raw = await c.req.text();
      if (!deps.lessonStreaming) return c.json({ received: true, handled: false });
      return c.json({ received: true, ...(await deps.lessonStreaming.handleWebhook(raw, (name) => c.req.header(name))) });
    })
    // App Store Server Notifications V2: `{ signedPayload }`, verified against Apple's certificate chain.
    .post('/apple', async (c) => {
      const body = (await c.req.json().catch(() => null)) as { signedPayload?: unknown } | null;
      if (typeof body?.signedPayload !== 'string') throw new AppError('Missing signedPayload', 400, 'APPLE_PAYLOAD');
      return c.json({ received: true, ...(await deps.appleIap.handleNotification(body.signedPayload)) });
    })
    // Teacher payouts (Stripe Connect events on connected accounts): signature verified by the adapter, then re-read from Stripe.
    .post('/payouts', async (c) => {
      const raw = await c.req.text();
      if (!deps.payoutDispatch) return c.json({ received: true, handled: false });
      return c.json({ received: true, ...(await deps.payoutDispatch.handleWebhook(raw, (name) => c.req.header(name))) });
    })
    .post('/livekit', async (c) => {
      const raw = await c.req.text();
      const event = await deps.video.parseWebhook(raw, c.req.header('authorization'));
      return c.json({ received: true, ...(await deps.sessions.handleVideoEvent(event)) });
    });
}
