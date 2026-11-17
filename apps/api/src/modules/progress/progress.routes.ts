import { Hono } from 'hono';
import { updateLearningGoalInput } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ProgressService } from './progress.service';

/** Mounted under `/me`: the learner's own streak, weekly goal and badges. */
export function progressRoutes(progress: ProgressService) {
  return new Hono<AppEnv>()
    .use('/progress', requireAuth)
    .use('/progress/*', requireAuth)
    .use('/badges', requireAuth)
    .get('/progress', async (c) => {
      const u = currentUser(c);
      return c.json(await progress.summary(u.id, u.timezone));
    })
    .put('/progress/goal', validate('json', updateLearningGoalInput), async (c) => {
      const u = currentUser(c);
      return c.json(await progress.setGoal(u.id, c.req.valid('json'), u.timezone));
    })
    .delete('/progress/goal', async (c) => {
      const u = currentUser(c);
      return c.json(await progress.clearGoal(u.id, u.timezone));
    })
    .get('/badges', async (c) => c.json(await progress.badges(currentUser(c).id)));
}
