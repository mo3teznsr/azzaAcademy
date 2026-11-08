import { Hono } from 'hono';
import { adminCancelSubscriptionInput, adminSubscriptionListQuery } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SubscriptionService } from './subscription.service';

/** Mounted at /api/v1/admin */
export function adminSubscriptionRoutes(service: SubscriptionService) {
  return new Hono<AppEnv>()
    .use('/subscriptions/*', requireRole('ADMIN'))
    .use('/subscriptions', requireRole('ADMIN'))
    .get('/subscriptions', validate('query', adminSubscriptionListQuery), async (c) => {
      const { page, pageSize, ...filter } = c.req.valid('query');
      return c.json(paged(await service.adminList({ ...filter, skip: (page - 1) * pageSize, take: pageSize }), page, pageSize));
    })
    .post('/subscriptions/:id/cancel', validate('json', adminCancelSubscriptionInput), async (c) =>
      c.json(await service.adminCancel(c.req.param('id'), c.req.valid('json'), currentUser(c).id)),
    );
}

/**
 * Mounted at /api/v1/teacher, before `teacherPayoutRoutes` (whose TEACHER-only guard would turn admins away; this route
 * answers first). The author-or-admin rule is the service's.
 */
export function teacherSubscriberRoutes(service: SubscriptionService) {
  return new Hono<AppEnv>().get('/courses/:id/subscribers', requireRole('TEACHER', 'ADMIN'), async (c) =>
    c.json(await service.subscriberCounts(c.req.param('id'), currentUser(c))),
  );
}
