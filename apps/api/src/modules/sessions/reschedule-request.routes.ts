import { Hono } from 'hono';
import { decideRescheduleRequestInput, rescheduleRequestListQuery } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { RescheduleRequestService } from './reschedule-request.service';

export function rescheduleRequestRoutes(service: RescheduleRequestService) {
  return new Hono<AppEnv>()
    .use('*', requireAuth)
    .get('/', requireRole('TEACHER', 'ADMIN'), validate('query', rescheduleRequestListQuery), async (c) =>
      c.json(await service.list(currentUser(c), c.req.valid('query').status)),
    )
    .post('/:id/approve', requireRole('ADMIN'), validate('json', decideRescheduleRequestInput), async (c) =>
      c.json(await service.approve(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .post('/:id/decline', requireRole('ADMIN'), validate('json', decideRescheduleRequestInput), async (c) =>
      c.json(await service.decline(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    );
}
