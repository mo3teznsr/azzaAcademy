import { Hono } from 'hono';
import { z } from 'zod';
import { lessonAnswerInput, lessonQaHiddenInput, lessonQuestionInput, lessonQuestionsQuery } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { LessonQaService } from './qa.service';

const inboxQuery = lessonQuestionsQuery.extend({ unanswered: z.enum(['true', 'false']).optional().transform((v) => v === 'true') });

/** Mounted at /api/v1 */
export function lessonQaRoutes(service: LessonQaService) {
  return new Hono<AppEnv>()
    .get('/lessons/:lessonId/questions', requireAuth, validate('query', lessonQuestionsQuery), async (c) =>
      c.json(await service.list(c.req.param('lessonId'), c.req.valid('query'), currentUser(c))),
    )
    .post('/lessons/:lessonId/questions', requireAuth, validate('json', lessonQuestionInput), async (c) =>
      c.json(await service.ask(c.req.param('lessonId'), c.req.valid('json'), currentUser(c)), 201),
    )
    .get('/courses/:courseId/questions', requireRole('TEACHER', 'ADMIN'), validate('query', inboxQuery), async (c) =>
      c.json(await service.courseInbox(c.req.param('courseId'), c.req.valid('query'), currentUser(c))),
    )
    .post('/lesson-questions/:id/answers', requireAuth, validate('json', lessonAnswerInput), async (c) =>
      c.json(await service.answer(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .delete('/lesson-questions/:id', requireAuth, async (c) => c.json(await service.deleteQuestion(c.req.param('id'), currentUser(c))))
    .put('/lesson-questions/:id/hidden', requireAuth, validate('json', lessonQaHiddenInput), async (c) =>
      c.json(await service.setQuestionHidden(c.req.param('id'), c.req.valid('json').hidden, currentUser(c))),
    )
    .put('/lesson-answers/:id/hidden', requireAuth, validate('json', lessonQaHiddenInput), async (c) =>
      c.json(await service.setAnswerHidden(c.req.param('id'), c.req.valid('json').hidden, currentUser(c))),
    )
    .put('/lesson-answers/:id/accepted', requireAuth, async (c) => c.json(await service.setAccepted(c.req.param('id'), true, currentUser(c))))
    .delete('/lesson-answers/:id/accepted', requireAuth, async (c) => c.json(await service.setAccepted(c.req.param('id'), false, currentUser(c))));
}
