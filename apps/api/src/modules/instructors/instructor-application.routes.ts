import { Hono } from 'hono';
import { instructorApplicationInput, reviewDecisionInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ApplicationStatus, InstructorApplicationService } from './instructor-application.service';

const STATUSES: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/** Mounted at /api/v1/instructor-applications. */
export function instructorApplicationRoutes(service: InstructorApplicationService) {
  return new Hono<AppEnv>()
    .get('/mine', requireAuth, async (c) => c.json({ application: await service.mine(currentUser(c)) }))
    .post('/', requireAuth, validate('json', instructorApplicationInput), async (c) => c.json(await service.apply(c.req.valid('json'), currentUser(c)), 201))
    .get('/', requireRole('ADMIN'), async (c) => {
      const s = c.req.query('status');
      return c.json(await service.list(STATUSES.includes(s as ApplicationStatus) ? (s as ApplicationStatus) : undefined));
    })
    .post('/:id/review', requireRole('ADMIN'), validate('json', reviewDecisionInput), async (c) =>
      c.json(await service.review(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    );
}
