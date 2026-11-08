import { Hono } from 'hono';
import { currencyInput, updateCurrencyInput } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { CurrencyService } from './currency.service';

/** Mounted at /api/v1: `GET /currencies` (public, enabled only). */
export function currencyRoutes(service: CurrencyService) {
  return new Hono<AppEnv>().get('/currencies', async (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(await service.list());
  });
}

/** Mounted at /api/v1/admin. */
export function adminCurrencyRoutes(service: CurrencyService) {
  return new Hono<AppEnv>()
    .use('/currencies', requireRole('ADMIN'))
    .use('/currencies/*', requireRole('ADMIN'))
    .get('/currencies', async (c) => c.json(await service.adminList()))
    .post('/currencies', validate('json', currencyInput), async (c) => c.json(await service.create(c.req.valid('json')), 201))
    .patch('/currencies/:code', validate('json', updateCurrencyInput), async (c) => c.json(await service.update(c.req.param('code'), c.req.valid('json'))))
    .delete('/currencies/:code', async (c) => c.json(await service.delete(c.req.param('code'))));
}
