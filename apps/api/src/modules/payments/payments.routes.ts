import { Hono } from 'hono';
import {
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
import { BusinessRuleError } from '../../core/errors';
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
import type { ReceiptUploadService } from './receipt-upload.service';
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
      const body = await c.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) throw new BusinessRuleError('Attach the receipt as a multipart `file` field', 'RECEIPT_FILE_INVALID', { reason: 'MISSING' });
      const order = await s.receipts.upload(c.req.param('id'), currentUser(c).id, {
        type: file.type,
        size: file.size,
        bytes: async () => new Uint8Array(await file.arrayBuffer()),
      });
      return c.json(order);
    })
    .get('/me/orders', requireAuth, async (c) => c.json({ items: await s.orders.mine(currentUser(c).id) }))
    .get('/me/waitlist', requireAuth, async (c) => c.json(await s.waitlist.mine(currentUser(c).id)));
}

const REVIEW_QUEUE: OrderStatus[] = ['VERIFYING', 'AMOUNT_MISMATCH'];

/** Mounted at /api/v1/admin */
export function adminFinanceRoutes(s: PaymentServices) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/transfers', validate('query', transferListQuery), async (c) => {
      const { page, pageSize, status, q } = c.req.valid('query');
      const result = await s.orders.list({
        statuses: status ? [status] : REVIEW_QUEUE,
        method: 'BANK_TRANSFER',
        q,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return c.json(paged(result, page, pageSize));
    })
    .get('/orders', validate('query', orderListQuery), async (c) => {
      const { page, pageSize, status, method, q } = c.req.valid('query');
      const result = await s.orders.list({ statuses: status ? [status] : undefined, method, q, skip: (page - 1) * pageSize, take: pageSize });
      return c.json(paged(result, page, pageSize));
    })
    .post('/orders/:id/review', validate('json', reviewTransferInput), async (c) =>
      c.json(await s.finance.review(c.req.param('id'), c.req.valid('json'), currentUser(c).id)),
    )
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
