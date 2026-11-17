import { Hono } from 'hono';
import { z } from 'zod';
import { paginationQuery, REFERRAL_STATUSES, referralProgramInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ReferralService } from './referral.service';

/** Mounted at /api/v1/referrals */
export function referralRoutes(service: ReferralService) {
  return new Hono<AppEnv>().use('*', requireAuth).get('/me', async (c) => c.json(await service.mine(currentUser(c).id)));
}

const listQuery = paginationQuery.extend({ status: z.enum(REFERRAL_STATUSES).optional() });

/** Mounted at /api/v1/admin */
export function adminReferralRoutes(service: ReferralService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/referrals', validate('query', listQuery), async (c) => {
      const { page, pageSize, status } = c.req.valid('query');
      const { items, total, counts } = await service.adminList({ page, pageSize, status });
      return c.json({ ...paged({ items, total }, page, pageSize), counts });
    })
    .get('/referral-program', async (c) => c.json(await service.program()))
    .put('/referral-program', validate('json', referralProgramInput), async (c) => c.json(await service.updateProgram(c.req.valid('json'))));
}
