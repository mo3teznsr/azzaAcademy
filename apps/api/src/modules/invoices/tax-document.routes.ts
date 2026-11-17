import { Hono } from 'hono';
import { z } from 'zod';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { TaxDocumentService } from './tax-document.service';

/** Mounted at /api/v1 */
export function taxDocumentRoutes(service: TaxDocumentService) {
  return new Hono<AppEnv>()
    .get('/me/tax-documents', requireAuth, async (c) => c.json({ items: await service.mine(currentUser(c).id) }))
    .get('/tax-documents/:id', requireAuth, async (c) => c.json(await service.get(c.req.param('id'), currentUser(c))));
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const periodQuery = z.object({ from: day, to: day, format: z.enum(['json', 'csv']).default('json') });

/** Mounted at /api/v1/admin */
export function adminTaxDocumentRoutes(service: TaxDocumentService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/tax-documents', validate('query', periodQuery), async (c) => {
      const q = c.req.valid('query');
      const from = new Date(`${q.from}T00:00:00.000Z`);
      const to = new Date(new Date(`${q.to}T00:00:00.000Z`).getTime() + 86_400_000);
      if (q.format === 'csv') {
        return c.body(await service.csv(from, to), 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tax-documents-${q.from}_${q.to}.csv"` });
      }
      return c.json({ items: await service.forPeriod(from, to) });
    });
}
