import { Hono } from 'hono';
import { createPayoutRunInput, markPayoutPaidInput, paginationQuery, payoutAdjustmentInput, teacherBankDetailsInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { PayoutService } from './payout.service';
import type { PayoutDispatchService } from './payout-dispatch.service';
import { z } from 'zod';

const payoutAccountInput = z.object({ stripeAccountId: z.string().trim().max(64).nullable() });

/** Mounted at /api/v1/teacher */
export function teacherPayoutRoutes(service: PayoutService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('TEACHER'))
    .get('/earnings', async (c) => c.json(await service.teacherEarnings(currentUser(c).id)))
    .get('/payouts', async (c) => c.json(await service.teacherPayouts(currentUser(c).id)))
    .get('/bank-details', async (c) => c.json({ bankDetails: await service.getBankDetails(currentUser(c).id) }))
    .put('/bank-details', validate('json', teacherBankDetailsInput), async (c) =>
      c.json(await service.putBankDetails(currentUser(c).id, c.req.valid('json'))),
    );
}

/** Mounted at /api/v1/admin */
export function adminPayoutRoutes(service: PayoutService, dispatch?: PayoutDispatchService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/payout-provider', (c) => c.json(dispatch?.info() ?? { enabled: false, name: null, label: null }))
    .post('/payout-runs/:id/send', async (c) => {
      if (!dispatch) return c.json({ code: 'PAYOUT_PROVIDER_DISABLED', message: 'No payout provider is configured' }, 400);
      await dispatch.sendRun(c.req.param('id'), currentUser(c).id);
      return c.json(await service.getRun(c.req.param('id')));
    })
    .put('/teachers/:id/payout-account', validate('json', payoutAccountInput), async (c) => {
      if (!dispatch) return c.json({ code: 'PAYOUT_PROVIDER_DISABLED', message: 'No payout provider is configured' }, 400);
      return c.json(await dispatch.setStripeAccount(c.req.param('id'), c.req.valid('json').stripeAccountId || null, currentUser(c).id));
    })
    .get('/payout-runs', validate('query', paginationQuery), async (c) => {
      const { page, pageSize } = c.req.valid('query');
      return c.json(paged(await service.listRuns(page, pageSize), page, pageSize));
    })
    .post('/payout-runs', validate('json', createPayoutRunInput), async (c) => c.json(await service.createRun(c.req.valid('json'), currentUser(c).id), 201))
    .get('/payout-runs/:id', async (c) => c.json(await service.getRun(c.req.param('id'))))
    .post('/payout-runs/:id/approve', async (c) => c.json(await service.approve(c.req.param('id'), currentUser(c).id)))
    .on(['GET', 'POST'], '/payout-runs/:id/export', async (c) => {
      const { filename, csv } = await service.exportCsv(c.req.param('id'), currentUser(c).id);
      return c.body(csv, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
    })
    .post('/payout-runs/:id/mark-paid', validate('json', markPayoutPaidInput), async (c) =>
      c.json(await service.markPaid(c.req.param('id'), c.req.valid('json').transferReference, currentUser(c).id, c.req.valid('json').references)),
    )
    .post('/payouts/adjustments', validate('json', payoutAdjustmentInput), async (c) => c.json(await service.adjust(c.req.valid('json'), currentUser(c).id)))
    .post('/teachers/:id/bank-details/verify', async (c) => c.json(await service.verifyBankDetails(c.req.param('id'), currentUser(c).id)));
}
