import { Hono } from 'hono';
import { batchListQuery, createBatchInput, previewScheduleInput, shiftScheduleInput, updateBatchInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { BatchService } from './batch.service';

export function batchRoutes(service: BatchService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', batchListQuery), async (c) => {
      const { page, pageSize, q: _q, ...filter } = c.req.valid('query');
      const result = await service.list({ ...filter, skip: (page - 1) * pageSize, take: pageSize }, c.get('user'));
      return c.json(paged(result, page, pageSize));
    })
    .get('/:id', async (c) => c.json(await service.get(c.req.param('id'), c.get('user'))))
    .post('/schedule/preview', requireRole('ADMIN'), validate('json', previewScheduleInput), async (c) =>
      c.json(await service.preview(c.req.valid('json'))),
    )
    .post('/', requireRole('ADMIN'), validate('json', createBatchInput), async (c) =>
      c.json(await service.create(c.req.valid('json')), 201),
    )
    .patch('/:id', requireRole('ADMIN'), validate('json', updateBatchInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .get('/:id/roster', requireRole('TEACHER', 'ADMIN'), async (c) => c.json(await service.roster(c.req.param('id'), currentUser(c))))
    .post('/:id/shift', requireRole('ADMIN'), validate('json', shiftScheduleInput), async (c) =>
      c.json(await service.shift(c.req.param('id'), c.req.valid('json'))),
    )
    .get('/:id/enrollments', requireRole('ADMIN'), async (c) => c.json(await service.enrollments(c.req.param('id'))));
}
