import { Hono } from 'hono';
import { z } from 'zod';
import { dateRangeQuery, paginationQuery, registerDeviceInput, updateProfileInput } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { NotificationService } from '../notifications/notification.service';
import type { CalendarService } from './calendar.service';
import type { MeService } from './me.service';

const notificationsQuery = paginationQuery.extend({ unread: z.stringbool().optional() });

export function meRoutes(me: MeService, notifications: NotificationService, calendar: CalendarService) {
  return new Hono<AppEnv>()
    .use('*', requireAuth)
    .get('/', async (c) => c.json(await me.profile(currentUser(c).id)))
    .patch('/', validate('json', updateProfileInput), async (c) => c.json(await me.updateProfile(currentUser(c), c.req.valid('json'))))
    .post('/devices', validate('json', registerDeviceInput), async (c) =>
      c.json(await me.registerDevice(currentUser(c).id, c.req.valid('json')), 201),
    )
    .delete('/devices/:token', async (c) => c.json(await me.removeDevice(currentUser(c).id, c.req.param('token'))))
    .get('/schedule', validate('query', dateRangeQuery), async (c) => c.json(await me.schedule(currentUser(c), c.req.valid('query'))))
    .get('/calendar', (c) => c.json(calendar.feedUrls(currentUser(c).id)))
    .get('/enrollments', async (c) => c.json({ items: await me.enrollments(currentUser(c).id) }))
    .get('/notifications', validate('query', notificationsQuery), async (c) => {
      const { page, pageSize, unread } = c.req.valid('query');
      const result = await notifications.list(currentUser(c).id, page, pageSize, unread ?? false);
      return c.json({ ...paged(result, page, pageSize), unread: result.unread });
    })
    .post('/notifications/read-all', async (c) => c.json(await notifications.markAllRead(currentUser(c).id)))
    .post('/notifications/:id/read', async (c) => c.json(await notifications.markRead(currentUser(c).id, c.req.param('id'))));
}
