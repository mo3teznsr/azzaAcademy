import { Hono } from 'hono';
import { AppError } from '../../core/errors';
import type { PaymentGateway, VideoProvider } from '../../core/ports';
import type { AppEnv } from '../../http/types';
import type { AppleIapService } from '../payments/apple/apple-iap.service';
import type { CheckoutService } from '../payments/checkout.service';
import type { SessionService } from '../sessions/session.service';

/** Mounted at /api/webhooks. Bodies are read raw so signatures can be verified. */
export function webhookRoutes(deps: {
  payments: PaymentGateway;
  video: VideoProvider;
  checkout: CheckoutService;
  sessions: SessionService;
  appleIap: AppleIapService;
}) {
  return new Hono<AppEnv>()
    .post('/stripe', async (c) => {
      const raw = await c.req.text();
      const event = await deps.payments.parseWebhook(raw, c.req.header('stripe-signature'));
      return c.json({ received: true, ...(await deps.checkout.handlePaymentEvent(event)) });
    })
    // App Store Server Notifications V2: `{ signedPayload }`, verified against Apple's certificate chain.
    .post('/apple', async (c) => {
      const body = (await c.req.json().catch(() => null)) as { signedPayload?: unknown } | null;
      if (typeof body?.signedPayload !== 'string') throw new AppError('Missing signedPayload', 400, 'APPLE_PAYLOAD');
      return c.json({ received: true, ...(await deps.appleIap.handleNotification(body.signedPayload)) });
    })
    .post('/livekit', async (c) => {
      const raw = await c.req.text();
      const event = await deps.video.parseWebhook(raw, c.req.header('authorization'));
      return c.json({ received: true, ...(await deps.sessions.handleVideoEvent(event)) });
    });
}
