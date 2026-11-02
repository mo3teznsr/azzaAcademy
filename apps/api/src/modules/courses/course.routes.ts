import { Hono } from 'hono';
import { courseListQuery, createCourseInput, updateCourseInput } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import { paged } from '../../http/pagination';
import type { CourseService } from './course.service';

export function courseRoutes(service: CourseService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', courseListQuery), async (c) => {
      const { page, pageSize, ...filter } = c.req.valid('query');
      const result = await service.list({ ...filter, skip: (page - 1) * pageSize, take: pageSize }, c.get('user')?.role ?? null);
      return c.json(paged(result, page, pageSize));
    })
    .get('/:idOrSlug', async (c) => c.json(await service.get(c.req.param('idOrSlug'), c.get('user')?.role ?? null)))
    .post('/', requireRole('ADMIN'), validate('json', createCourseInput), async (c) =>
      c.json(await service.create(c.req.valid('json')), 201),
    )
    .patch('/:id', requireRole('ADMIN'), validate('json', updateCourseInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.valid('json'))),
    );
}
