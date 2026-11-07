import { Hono } from 'hono';
import { batchAnnouncementInput, paginationQuery, platformAnnouncementInput, updateAnnouncementInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { AnnouncementService } from './announcement.service';

/** Mounted at /api/v1 */
export function announcementRoutes(service: AnnouncementService) {
  return new Hono<AppEnv>()
    .get('/me/announcements', requireAuth, validate('query', paginationQuery), async (c) => {
      const { page, pageSize } = c.req.valid('query');
      return c.json(await service.mine(currentUser(c), page, pageSize));
    })
    .get('/batches/:id/announcements', requireAuth, validate('query', paginationQuery), async (c) => {
      const { page, pageSize } = c.req.valid('query');
      return c.json(await service.listForBatch(c.req.param('id'), currentUser(c), page, pageSize));
    })
    .post('/batches/:id/announcements', requireAuth, validate('json', batchAnnouncementInput), async (c) =>
      c.json(await service.postToBatch(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .post('/announcements', requireRole('ADMIN'), validate('json', platformAnnouncementInput), async (c) =>
      c.json(await service.postToPlatform(c.req.valid('json'), currentUser(c)), 201),
    )
    .patch('/announcements/:id', requireAuth, validate('json', updateAnnouncementInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .delete('/announcements/:id', requireAuth, async (c) => c.json(await service.remove(c.req.param('id'), currentUser(c))));
}
