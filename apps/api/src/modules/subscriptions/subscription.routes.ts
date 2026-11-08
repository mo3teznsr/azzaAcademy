import { Hono } from 'hono';
import { appleVerifyInput, subscribeInput } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import { receiptFromBody } from '../payments/receipt-file';
import type { ReceiptUploadService } from '../payments/receipt-upload.service';
import type { SubscriptionService } from './subscription.service';

const verifyAppleInput = appleVerifyInput.pick({ signedTransaction: true });
const switchInput = subscribeInput.pick({ plan: true });

/** Mounted at /api/v1 */
export function subscriptionRoutes(service: SubscriptionService, receipts?: ReceiptUploadService) {
  return new Hono<AppEnv>()
    .post('/courses/:id/subscribe', requireAuth, validate('json', subscribeInput), async (c) =>
      c.json(await service.subscribe(currentUser(c).id, c.req.param('id'), c.req.valid('json')), 201),
    )
    .post('/subscriptions/apple/verify', requireAuth, validate('json', verifyAppleInput), async (c) =>
      c.json(await service.verifyApple(currentUser(c).id, c.req.valid('json').signedTransaction)),
    )
    .get('/subscriptions/by-reference/:ref', requireAuth, async (c) => c.json(await service.byReference(c.req.param('ref'), currentUser(c).id)))
    .get('/me/subscriptions', requireAuth, async (c) => c.json(await service.mine(currentUser(c).id)))
    .post('/subscriptions/:id/cancel', requireAuth, async (c) => c.json(await service.cancel(c.req.param('id'), currentUser(c).id)))
    .post('/subscriptions/:id/resume', requireAuth, async (c) => c.json(await service.resume(c.req.param('id'), currentUser(c).id)))
    .post('/subscriptions/:id/switch', requireAuth, validate('json', switchInput), async (c) =>
      c.json(await service.switchPlan(c.req.param('id'), currentUser(c).id, c.req.valid('json'))),
    )
    .post('/subscriptions/:id/switch-to-card', requireAuth, async (c) => c.json(await service.switchToCard(c.req.param('id'), currentUser(c).id)))
    .post('/subscription-payments/:id/receipt', requireAuth, async (c) => {
      if (!receipts) throw new BusinessRuleError('Plans are not paid by transfer here', 'METHOD_UNAVAILABLE');
      return c.json(await receipts.uploadForSubscriptionPayment(c.req.param('id'), currentUser(c).id, receiptFromBody(await c.req.parseBody())));
    })
    .post('/subscriptions/:id/portal', requireAuth, async (c) => c.json(await service.portal(c.req.param('id'), currentUser(c).id)));
}
