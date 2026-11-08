import { Hono } from 'hono';
import {
  aedToFils,
  appleVerifyInput,
  bankAccountInput,
  checkoutInput,
  couponInput,
  fxRateInput,
  orderListQuery,
  refundInput,
  reviewTransferInput,
  transferListQuery,
  updateBankAccountInput,
  updateCouponInput,
  uploadReceiptInput,
  type OrderStatus,
} from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { AppleIapService } from './apple/apple-iap.service';
import type { BankAccountService, CouponService } from './catalog-admin.service';
import type { CheckoutService } from './checkout.service';
import type { FinanceAdminService } from './finance-admin.service';
import type { FxService } from './fx.service';
import type { OrderQueries } from './order.queries';
import { receiptFromBody } from './receipt-file';
import type { ReceiptUploadService } from './receipt-upload.service';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { SubscriptionTransferQueries } from '../subscriptions/transfer-queries';
import type { WaitlistQueries } from './waitlist.queries';

export interface PaymentServices {
  checkout: CheckoutService;
  finance: FinanceAdminService;
  fx: FxService;
  bankAccounts: BankAccountService;
  coupons: CouponService;
  orders: OrderQueries;
  waitlist: WaitlistQueries;
  receipts: ReceiptUploadService;
  appleIap: AppleIapService;
  subscriptions: SubscriptionService;
  subscriptionTransfers: SubscriptionTransferQueries;
}

/** Mounted at /api/v1 */
export function paymentRoutes(s: PaymentServices) {
  return new Hono<AppEnv>()
    .get('/fx-rates', async (c) => c.json(await s.fx.rates()))
    .get('/bank-accounts', async (c) => c.json(await s.bankAccounts.list(c.get('user')?.role ?? null)))
    .post('/checkout/quote', validate('json', checkoutInput), async (c) =>
      c.json(await s.checkout.quote(c.req.valid('json'), undefined, c.get('user')?.id ?? null)),
    )
    .post('/checkout', requireAuth, validate('json', checkoutInput), async (c) => {
      const result = await s.checkout.checkout(currentUser(c).id, c.req.valid('json'));
      return c.json(result, result.waitlisted ? 202 : 201);
    })
    .post('/payments/apple/verify', requireAuth, validate('json', appleVerifyInput), async (c) =>
      c.json(await s.appleIap.verifyPurchase(currentUser(c).id, c.req.valid('json'))),
    )
    .post('/batches/:id/waitlist', requireAuth, async (c) => c.json(await s.checkout.joinWaitlist(currentUser(c).id, c.req.param('id')), 201))
    .delete('/batches/:id/waitlist', requireAuth, async (c) => c.json(await s.checkout.leaveWaitlist(currentUser(c).id, c.req.param('id'))))
    .get('/orders/by-reference/:ref', requireAuth, async (c) => c.json(await s.orders.byReference(c.req.param('ref'), currentUser(c))))
    .get('/orders/:id', requireAuth, async (c) => c.json(await s.orders.get(c.req.param('id'), currentUser(c))))
    .post('/orders/:id/receipt', requireAuth, validate('json', uploadReceiptInput), async (c) =>
      c.json(await s.checkout.uploadReceipt(c.req.param('id'), currentUser(c).id, c.req.valid('json').receiptUrl)),
    )
    .post('/orders/:id/receipt/file', requireAuth, async (c) => {
      const order = await s.receipts.upload(c.req.param('id'), currentUser(c).id, receiptFromBody(await c.req.parseBody()));
      return c.json(order);
    })
    .get('/me/orders', requireAuth, async (c) => c.json({ items: await s.orders.mine(currentUser(c).id) }))
    .get('/me/waitlist', requireAuth, async (c) => c.json(await s.waitlist.mine(currentUser(c).id)));
}

const REVIEW_QUEUE: OrderStatus[] = ['VERIFYING', 'AMOUNT_MISMATCH'];

type InboxEntry = { receiptUploadedAt: Date | null; createdAt: Date };
/** Oldest receipt first, items without one last (newest first), as the seat list is ordered. */
function mergeInbox<A extends InboxEntry, B extends InboxEntry>(a: A[], b: B[]): Array<A | B> {
  return [...a, ...b].sort((x, y) => {
    const ux = x.receiptUploadedAt?.getTime() ?? Infinity;
    const uy = y.receiptUploadedAt?.getTime() ?? Infinity;
    return ux - uy || y.createdAt.getTime() - x.createdAt.getTime();
  });
}

/** Mounted at /api/v1/admin */
export function adminFinanceRoutes(s: PaymentServices) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/transfers', validate('query', transferListQuery), async (c) => {
      const { page, pageSize, status, q } = c.req.valid('query');
      const statuses = status ? [status] : REVIEW_QUEUE;
      // Seats and plans share one queue: take enough of each to fill the page, then merge by upload time.
      const take = (page - 1) * pageSize + pageSize;
      const [seats, plans] = await Promise.all([
        s.orders.list({ statuses, method: 'BANK_TRANSFER', q, skip: 0, take }),
        s.subscriptionTransfers.list({ statuses, q, skip: 0, take }),
      ]);
      const items = mergeInbox(
        seats.items.map((o) => ({ ...o, kind: 'SEAT' as const })),
        plans.items,
      ).slice((page - 1) * pageSize, take);
      return c.json(paged({ items, total: seats.total + plans.total }, page, pageSize));
    })
    .get('/orders', validate('query', orderListQuery), async (c) => {
      const { page, pageSize, status, method, q } = c.req.valid('query');
      const result = await s.orders.list({ statuses: status ? [status] : undefined, method, q, skip: (page - 1) * pageSize, take: pageSize });
      return c.json(paged(result, page, pageSize));
    })
    .post('/orders/:id/review', validate('json', reviewTransferInput), async (c) => {
      const id = c.req.param('id');
      const input = c.req.valid('json');
      // The inbox sends the item id for both kinds; a plan payment is reviewed by the subscription service.
      if (await s.subscriptions.isTransferPayment(id)) {
        const review =
          input.decision === 'APPROVE'
            ? { approve: true, receivedFils: aedToFils(input.receivedAed) }
            : input.decision === 'REJECT'
              ? { approve: false, note: input.reason }
              : { approve: false, newReceipt: true, note: input.reason };
        return c.json(await s.subscriptions.reviewTransfer(id, review, currentUser(c).id));
      }
      return c.json(await s.finance.review(id, input, currentUser(c).id));
    })
    .post('/orders/:id/refund', validate('json', refundInput), async (c) => c.json(await s.finance.refund(c.req.param('id'), c.req.valid('json'))))
    .get('/bank-accounts', async (c) => c.json(await s.bankAccounts.list('ADMIN')))
    .post('/bank-accounts', validate('json', bankAccountInput), async (c) => c.json(await s.bankAccounts.create(c.req.valid('json')), 201))
    .patch('/bank-accounts/:id', validate('json', updateBankAccountInput), async (c) =>
      c.json(await s.bankAccounts.update(c.req.param('id'), c.req.valid('json'))),
    )
    .put('/fx-rates', validate('json', fxRateInput), async (c) => {
      const { currency, ratePerAed } = c.req.valid('json');
      return c.json(await s.fx.set(currency, ratePerAed));
    })
    .get('/coupons', async (c) => c.json(await s.coupons.list()))
    .post('/coupons', validate('json', couponInput), async (c) => c.json(await s.coupons.create(c.req.valid('json')), 201))
    .patch('/coupons/:id', validate('json', updateCouponInput), async (c) => c.json(await s.coupons.update(c.req.param('id'), c.req.valid('json'))))
    .get('/coupons/:id/usage', async (c) => c.json(await s.coupons.usage(c.req.param('id'))));
}
