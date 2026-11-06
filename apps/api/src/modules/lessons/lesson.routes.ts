import { Hono } from 'hono';
import { lessonInput, reorderLessonsInput, updateLessonInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { LessonService } from './lesson.service';

/** Mounted at /api/v1 */
export function lessonRoutes(service: LessonService) {
  const base = '/courses/:courseId/modules/:moduleId/lessons';
  return new Hono<AppEnv>()
    .get('/courses/:courseId/lessons', requireAuth, async (c) => c.json(await service.list(c.req.param('courseId'), currentUser(c))))
    .post(base, requireRole('TEACHER', 'ADMIN'), validate('json', lessonInput), async (c) =>
      c.json(await service.create(c.req.param('courseId'), c.req.param('moduleId'), c.req.valid('json'), currentUser(c)), 201),
    )
    .put(`${base}/order`, requireRole('TEACHER', 'ADMIN'), validate('json', reorderLessonsInput), async (c) =>
      c.json(await service.reorder(c.req.param('courseId'), c.req.param('moduleId'), c.req.valid('json'), currentUser(c))),
    )
    .patch(`${base}/:lessonId`, requireRole('TEACHER', 'ADMIN'), validate('json', updateLessonInput), async (c) =>
      c.json(await service.update(c.req.param('courseId'), c.req.param('moduleId'), c.req.param('lessonId'), c.req.valid('json'), currentUser(c))),
    )
    .delete(`${base}/:lessonId`, requireRole('TEACHER', 'ADMIN'), async (c) =>
      c.json(await service.remove(c.req.param('courseId'), c.req.param('moduleId'), c.req.param('lessonId'), currentUser(c))),
    );
}
