import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { BusinessRuleError } from '../../core/errors';
import { MAX_COURSE_COVER_BYTES } from '../admin/course-media-file';
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

/** Mounted at /api/v1/admin: `POST /categories/:slug/image` (multipart `file`) and `DELETE /categories/:slug/image`. */
export function adminCategoryImageRoutes(service: CategoryService) {
  return new Hono<AppEnv>()
    .post(
      '/categories/:slug/image',
      requireRole('ADMIN'),
      bodyLimit({
        maxSize: MAX_COURSE_COVER_BYTES + 1024 * 1024,
        onError: () => {
          throw new BusinessRuleError(`The photo is larger than ${MAX_COURSE_COVER_BYTES / (1024 * 1024)} MB`, 'COURSE_MEDIA_INVALID', { reason: 'TOO_LARGE', maxBytes: MAX_COURSE_COVER_BYTES });
        },
      }),
      async (c) => {
        const body = await c.req.parseBody();
        const file = body.file;
        if (!(file instanceof File)) throw new BusinessRuleError('Attach the image as a multipart `file` field', 'COURSE_MEDIA_INVALID', { reason: 'MISSING' });
        return c.json(await service.uploadImage(c.req.param('slug'), { type: file.type, size: file.size, bytes: async () => new Uint8Array(await file.arrayBuffer()) }));
      },
    )
    .delete('/categories/:slug/image', requireRole('ADMIN'), async (c) => c.json(await service.removeImage(c.req.param('slug'))));
}
