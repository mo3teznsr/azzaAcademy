import { Hono } from 'hono';
import { categoryInput, updateCategoryInput } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { CategoryService } from './category.service';

/** Mounted at /api/v1/categories. `?all=true` (admins) includes hidden ones. */
export function categoryRoutes(service: CategoryService) {
  return new Hono<AppEnv>()
    .get('/', async (c) => c.json(await service.list(c.req.query('all') === 'true' && c.get('user')?.role === 'ADMIN')))
    .post('/', requireRole('ADMIN'), validate('json', categoryInput), async (c) => c.json(await service.create(c.req.valid('json')), 201))
    .patch('/:slug', requireRole('ADMIN'), validate('json', updateCategoryInput), async (c) =>
      c.json(await service.update(c.req.param('slug'), c.req.valid('json'))),
    )
    .delete('/:slug', requireRole('ADMIN'), async (c) => c.json(await service.delete(c.req.param('slug'))));
}
