import { Hono } from 'hono';
import { z } from 'zod';
import { cancelSessionInput, rescheduleSessionInput, sessionFeedbackInput, updateAgendaInput, updateAttendanceInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SessionService } from './session.service';

const messagesQuery = z.object({
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export function sessionRoutes(service: SessionService) {
  return new Hono<AppEnv>()
    .use('*', requireAuth)
    .get('/:id', async (c) => c.json(await service.get(c.req.param('id'), currentUser(c))))
    .patch('/:id/agenda', requireRole('TEACHER', 'ADMIN'), validate('json', updateAgendaInput), async (c) =>
      c.json(await service.updateAgenda(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .post('/:id/reschedule', requireRole('TEACHER', 'ADMIN'), validate('json', rescheduleSessionInput), async (c) => {
      const result = await service.reschedule(c.req.param('id'), c.req.valid('json'), currentUser(c));
      return c.json(result, result.requested ? 202 : 200);
    })
    .post('/:id/cancel', requireRole('ADMIN'), validate('json', cancelSessionInput), async (c) =>
      c.json(await service.cancel(c.req.param('id'), c.req.valid('json'))),
    )
    .post('/:id/join', async (c) => c.json(await service.join(c.req.param('id'), currentUser(c))))
    .post('/:id/start', requireRole('TEACHER', 'ADMIN'), async (c) => c.json(await service.start(c.req.param('id'), currentUser(c))))
    .post('/:id/end', requireRole('TEACHER', 'ADMIN'), async (c) => c.json(await service.end(c.req.param('id'), currentUser(c))))
    .post('/:id/participants/:userId/:action{mute|remove|allow-speak}', requireRole('TEACHER', 'ADMIN'), async (c) =>
      c.json(
        await service.moderate(
          c.req.param('id'),
          c.req.param('userId'),
          c.req.param('action') as 'mute' | 'remove' | 'allow-speak',
          currentUser(c),
        ),
      ),
    )
    .get('/:id/hands', async (c) => {
      await service.participantRole(c.req.param('id'), currentUser(c));
      return c.json(service.handQueue(c.req.param('id')));
    })
    .get('/:id/messages', validate('query', messagesQuery), async (c) =>
      c.json(await service.messages(c.req.param('id'), currentUser(c), c.req.valid('query'))),
    )
    .get('/:id/attendance', requireRole('TEACHER', 'ADMIN'), async (c) => c.json(await service.attendance(c.req.param('id'), currentUser(c))))
    .patch('/:id/attendance', requireRole('TEACHER', 'ADMIN'), validate('json', updateAttendanceInput), async (c) =>
      c.json(await service.updateAttendance(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .post('/:id/feedback', requireRole('STUDENT'), validate('json', sessionFeedbackInput), async (c) =>
      c.json(await service.feedback(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    );
}
