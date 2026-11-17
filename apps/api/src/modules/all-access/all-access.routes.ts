import { Hono } from 'hono';
import { allAccessPlanInput, appleProductsInput } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { AllAccessPlanService } from './all-access-plan.service';

/**
 * Mounted at /api/v1. Buying the plan reuses the course plan routes with `ALL_ACCESS_ID` as the course
 * (`POST /courses/_all-access/subscribe`: card, bank transfer, or the App Store when its products are set), and it is managed from `/me/subscriptions` like any plan.
 */
export function allAccessRoutes(service: AllAccessPlanService) {
  return new Hono<AppEnv>().get('/all-access', async (c) => c.json(await service.view()));
}

/** Mounted at /api/v1/admin. */
export function adminAllAccessRoutes(service: AllAccessPlanService) {
  return new Hono<AppEnv>()
    .use('/all-access', requireRole('ADMIN'))
    .use('/all-access/*', requireRole('ADMIN'))
    .get('/all-access', async (c) => c.json(await service.adminView()))
    .put('/all-access', validate('json', allAccessPlanInput), async (c) => c.json(await service.update(c.req.valid('json'))))
    .put('/all-access/apple-products', validate('json', appleProductsInput), async (c) => c.json(await service.setAppleProducts(c.req.valid('json'))));
}
