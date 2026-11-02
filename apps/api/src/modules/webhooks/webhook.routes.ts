import { Hono } from 'hono';
import type { PaymentGateway, VideoProvider } from '../../core/ports';
import type { AppEnv } from '../../http/types';
import type { CheckoutService } from '../payments/checkout.service';
import type { SessionService } from '../sessions/session.service';

/** Mounted at /api/webhooks. Bodies are read raw so signatures can be verified. */
export function webhookRoutes(deps: { payments: PaymentGateway; video: VideoProvider; checkout: CheckoutService; sessions: SessionService }) {
  return new Hono<AppEnv>()
    .post('/stripe', async (c) => {
      const raw = await c.req.text();
      const event = await deps.payments.parseWebhook(raw, c.req.header('stripe-signature'));
      return c.json({ received: true, ...(await deps.checkout.handlePaymentEvent(event)) });
    })
    .post('/livekit', async (c) => {
      const raw = await c.req.text();
      const event = await deps.video.parseWebhook(raw, c.req.header('authorization'));
      return c.json({ received: true, ...(await deps.sessions.handleVideoEvent(event)) });
    });
}
