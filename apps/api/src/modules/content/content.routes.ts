import { Hono } from 'hono';
import { assignmentInput, gradeInput, materialInput, submissionInput } from '@azza/shared';
import { currentUser, requireAuth } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ContentService } from './content.service';

// batchId comes from the URL, so the body schema drops it.
const materialBody = materialInput.omit({ batchId: true });
const assignmentBody = assignmentInput.omit({ batchId: true });

/** Mounted at /api/v1 */
export function contentRoutes(service: ContentService) {
  return new Hono<AppEnv>()
    .get('/batches/:id/materials', requireAuth, async (c) => c.json(await service.materials(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/materials', requireAuth, validate('json', materialBody), async (c) =>
      c.json(await service.addMaterial(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .get('/batches/:id/assignments', requireAuth, async (c) => c.json(await service.assignments(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/assignments', requireAuth, validate('json', assignmentBody), async (c) =>
      c.json(await service.addAssignment(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .get('/assignments/:id/submissions', requireAuth, async (c) => c.json(await service.submissions(c.req.param('id'), currentUser(c))))
    .post('/assignments/:id/submissions', requireAuth, validate('json', submissionInput), async (c) =>
      c.json(await service.submit(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .post('/submissions/:id/grade', requireAuth, validate('json', gradeInput), async (c) =>
      c.json(await service.grade(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .get('/me/recordings', requireAuth, async (c) => c.json(await service.recordings(currentUser(c))));
}
