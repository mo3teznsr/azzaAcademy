import { Hono } from 'hono';
import { quizInput, quizSubmissionInput, updateQuizInput } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { QuizService } from './quiz.service';

/** Mounted at /api/v1 */
export function quizRoutes(service: QuizService) {
  const one = '/batches/:id/quizzes/:quizId';
  return new Hono<AppEnv>()
    .get('/batches/:id/quizzes', requireAuth, async (c) => c.json(await service.list(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/quizzes', requireAuth, validate('json', quizInput), async (c) =>
      c.json(await service.create(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .patch(one, requireAuth, validate('json', updateQuizInput), async (c) =>
      c.json(await service.update(c.req.param('id'), c.req.param('quizId'), c.req.valid('json'), currentUser(c))),
    )
    .delete(one, requireAuth, async (c) => c.json(await service.remove(c.req.param('id'), c.req.param('quizId'), currentUser(c))))
    .post(`${one}/publish`, requireAuth, async (c) => c.json(await service.publish(c.req.param('id'), c.req.param('quizId'), currentUser(c))))
    .post(`${one}/unpublish`, requireAuth, async (c) => c.json(await service.unpublish(c.req.param('id'), c.req.param('quizId'), currentUser(c))))
    .get('/quizzes/:id', requireAuth, async (c) => c.json(await service.get(c.req.param('id'), currentUser(c))))
    .post('/quizzes/:id/start', requireAuth, async (c) => c.json(await service.start(c.req.param('id'), currentUser(c))))
    .post('/quizzes/:id/attempts', requireAuth, validate('json', quizSubmissionInput), async (c) =>
      c.json(await service.submit(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .get('/quizzes/:id/results', requireAuth, async (c) => c.json(await service.results(c.req.param('id'), currentUser(c))))
    .get('/me/quizzes', requireAuth, async (c) => c.json(await service.mine(currentUser(c))));
}
