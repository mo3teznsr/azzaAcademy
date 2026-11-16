import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { GrowthService } from './growth.service';

const growthQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

/** Mounted at /api/v1/admin */
export function adminGrowthRoutes(service: GrowthService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/growth', validate('query', growthQuery), async (c) => c.json(await service.growth(c.req.valid('query').days)));
}
