import { Hono } from 'hono';
import { z } from 'zod';
import { marketingSpendSchema } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { GrowthService } from './growth.service';
import type { InvestorService } from './investor.service';

const growthQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

/** Mounted at /api/v1/admin */
export function adminGrowthRoutes(service: GrowthService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/growth', validate('query', growthQuery), async (c) => c.json(await service.growth(c.req.valid('query').days)));
}

const investorQuery = z.object({ months: z.coerce.number().int().min(3).max(36).default(12), format: z.enum(['json', 'csv']).default('json') });
const spendQuery = z.object({ months: z.coerce.number().int().min(1).max(36).default(12) });

/** Mounted at /api/v1/admin */
export function adminInvestorRoutes(service: InvestorService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/investors', validate('query', investorQuery), async (c) => {
      const q = c.req.valid('query');
      if (q.format === 'csv') {
        return c.body(await service.csv(q.months), 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="azza-investor-metrics-${q.months}m.csv"` });
      }
      return c.json(await service.metrics(q.months));
    })
    .get('/marketing-spend', validate('query', spendQuery), async (c) => c.json(await service.spend(c.req.valid('query').months)))
    .put('/marketing-spend', validate('json', marketingSpendSchema), async (c) => c.json(await service.saveSpend(c.req.valid('json'), currentUser(c).id)))
    .delete('/marketing-spend/:id', async (c) => {
      await service.deleteSpend(c.req.param('id'), currentUser(c).id);
      return c.json({ ok: true });
    });
}
