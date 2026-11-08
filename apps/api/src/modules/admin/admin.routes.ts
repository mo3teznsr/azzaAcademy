import { Hono } from 'hono';
import { adminCreateUserInput, adminUpdateUserInput, adminUserListQuery } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SiteSettingsService } from '../settings/site-settings.service';
import type { AdminService } from './admin.service';

/** Mounted at /api/v1/admin */
export function adminRoutes(service: AdminService, settings: Pick<SiteSettingsService, 'adminView'>) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    // Effective rules + env defaults, contact, socials, and which integrations are configured (never secrets).
    // TEACHER_SHARE_PERCENT is kept in the payload for existing clients; it mirrors the live-course default cut.
    .get('/settings', async (c) => c.json(await settings.adminView()))
    .get('/dashboard', async (c) => c.json(await service.dashboard()))
    .get('/users', validate('query', adminUserListQuery), async (c) => {
      const { page, pageSize, role, q } = c.req.valid('query');
      return c.json(paged(await service.listUsers({ role, q, skip: (page - 1) * pageSize, take: pageSize }), page, pageSize));
    })
    .post('/users', validate('json', adminCreateUserInput), async (c) => c.json(await service.createUser(c.req.valid('json')), 201))
    .patch('/users/:id', validate('json', adminUpdateUserInput), async (c) =>
      c.json(await service.updateUser(c.req.param('id'), c.req.valid('json'), currentUser(c).id)),
    )
    .get('/live-rooms', async (c) => c.json(await service.liveRooms()));
}
