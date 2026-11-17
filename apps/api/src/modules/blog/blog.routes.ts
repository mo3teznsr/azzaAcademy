import { Hono } from 'hono';
import { adminBlogListQuery, blogListQuery, blogPostInput, updateBlogPostInput } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { BlogService } from './blog.service';

/** Mounted at /api/v1/blog — published posts only. */
export function blogRoutes(blog: BlogService) {
  return new Hono<AppEnv>()
    .get('/', validate('query', blogListQuery), async (c) => {
      c.header('Cache-Control', 'public, max-age=60');
      return c.json(await blog.list(c.req.valid('query')));
    })
    .get('/sitemap', async (c) => {
      c.header('Cache-Control', 'public, max-age=300');
      return c.json(await blog.sitemap());
    })
    .get('/:slug', async (c) => {
      c.header('Cache-Control', 'public, max-age=60');
      return c.json(await blog.get(c.req.param('slug')));
    });
}

/** Mounted at /api/v1/admin — write, preview and publish posts. Cover images use `POST /admin/media` (kind `cover`). */
export function adminBlogRoutes(blog: BlogService) {
  return new Hono<AppEnv>()
    .use('/blog', requireRole('ADMIN'))
    .use('/blog/*', requireRole('ADMIN'))
    .get('/blog', validate('query', adminBlogListQuery), async (c) => c.json(await blog.adminList(c.req.valid('query'))))
    .post('/blog', validate('json', blogPostInput), async (c) => c.json(await blog.create(c.req.valid('json')), 201))
    .get('/blog/:id', async (c) => c.json(await blog.adminGet(c.req.param('id'))))
    .patch('/blog/:id', validate('json', updateBlogPostInput), async (c) => c.json(await blog.update(c.req.param('id'), c.req.valid('json'))))
    .delete('/blog/:id', async (c) => c.json(await blog.delete(c.req.param('id'))));
}
