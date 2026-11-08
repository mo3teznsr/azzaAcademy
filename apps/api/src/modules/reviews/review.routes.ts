import { Hono } from 'hono';
import { courseReviewInput, paginationQuery, reviewModerationInput, reviewReplyInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ReviewService } from './review.service';
import type { SavedCourseService } from './saved-course.service';

/** Mounted at /api/v1 — course reviews and saved courses (wishlist). */
export function engagementRoutes(reviews: ReviewService, saved: SavedCourseService) {
  return new Hono<AppEnv>()
    .get('/courses/:id/reviews', validate('query', paginationQuery), async (c) => {
      const { page, pageSize } = c.req.valid('query');
      const user = c.get('user');
      return c.json(await reviews.list(c.req.param('id'), page, pageSize, user ? { id: user.id, role: user.role } : null));
    })
    .put('/courses/:id/reviews/mine', requireRole('STUDENT'), validate('json', courseReviewInput), async (c) =>
      c.json(await reviews.upsert(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .delete('/courses/:id/reviews/mine', requireRole('STUDENT'), async (c) => c.json(await reviews.deleteMine(c.req.param('id'), currentUser(c))))
    .post('/reviews/:id/reply', requireRole('TEACHER', 'ADMIN'), validate('json', reviewReplyInput), async (c) =>
      c.json(await reviews.reply(c.req.param('id'), c.req.valid('json').reply, currentUser(c))),
    )
    .patch('/reviews/:id', requireRole('ADMIN'), validate('json', reviewModerationInput), async (c) =>
      c.json(await reviews.moderate(c.req.param('id'), c.req.valid('json').hidden)),
    )
    .get('/me/saved-courses', requireRole('STUDENT', 'TEACHER', 'ADMIN'), async (c) => c.json(await saved.list(currentUser(c).id, currentUser(c).role)))
    .put('/courses/:id/save', requireRole('STUDENT', 'TEACHER', 'ADMIN'), async (c) => c.json(await saved.save(currentUser(c).id, c.req.param('id'))))
    .delete('/courses/:id/save', requireRole('STUDENT', 'TEACHER', 'ADMIN'), async (c) => c.json(await saved.unsave(currentUser(c).id, c.req.param('id'))));
}
