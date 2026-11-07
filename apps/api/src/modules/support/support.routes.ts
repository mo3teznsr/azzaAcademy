import { Hono } from 'hono';
import { supportMessageInput, supportTicketInput, supportTicketsQuery, updateSupportTicketInput } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SupportService } from './support.service';

/** Mounted at /api/v1/support */
export function supportRoutes(service: SupportService) {
  return new Hono<AppEnv>()
    .post('/tickets', requireAuth, validate('json', supportTicketInput), async (c) => c.json(await service.open(c.req.valid('json'), currentUser(c)), 201))
    .get('/tickets', requireAuth, validate('query', supportTicketsQuery), async (c) => c.json(await service.list(c.req.valid('query'), currentUser(c))))
    .get('/tickets/:id', requireAuth, async (c) => c.json(await service.get(c.req.param('id'), currentUser(c))))
    .post('/tickets/:id/messages', requireAuth, validate('json', supportMessageInput), async (c) =>
      c.json(await service.reply(c.req.param('id'), c.req.valid('json').body, currentUser(c)), 201),
    )
    .patch('/tickets/:id', requireAuth, validate('json', updateSupportTicketInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    );
}
