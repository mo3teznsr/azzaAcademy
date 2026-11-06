import { Hono } from 'hono';
import { courseListQuery, createCourseInput, reviewDecisionInput, updateCourseInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import { paged } from '../../http/pagination';
import type { CourseService } from './course.service';

export function courseRoutes(service: CourseService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', courseListQuery), async (c) => {
      const { page, pageSize, ...filter } = c.req.valid('query');
      const result = await service.list({ ...filter, skip: (page - 1) * pageSize, take: pageSize }, c.get('user'));
      return c.json(paged(result, page, pageSize));
    })
    .get('/:idOrSlug/related', async (c) => c.json(await service.related(c.req.param('idOrSlug'))))
    .get('/:idOrSlug', async (c) => c.json(await service.get(c.req.param('idOrSlug'), c.get('user'))))
    .post('/', requireRole('TEACHER', 'ADMIN'), validate('json', createCourseInput), async (c) =>
      c.json(await service.create(c.req.valid('json'), currentUser(c)), 201),
    )
    .patch('/:id', requireRole('TEACHER', 'ADMIN'), validate('json', updateCourseInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .post('/:id/submit', requireRole('TEACHER'), async (c) => c.json(await service.submit(c.req.param('id'), currentUser(c))))
    .post('/:id/review', requireRole('ADMIN'), validate('json', reviewDecisionInput), async (c) =>
      c.json(await service.review(c.req.param('id'), c.req.valid('json'))),
    );
}
