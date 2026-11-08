import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  assignmentInput,
  gradeInput,
  materialInput,
  MAX_MATERIAL_FILE_BYTES,
  MAX_SUBMISSION_FILE_BYTES,
  submissionInput,
  updateAssignmentInput,
} from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ContentService } from './content.service';

// batchId comes from the URL, so the body schema drops it.
const materialBody = materialInput.omit({ batchId: true });
const assignmentBody = assignmentInput.omit({ batchId: true });

/** Rejects bodies over `maxBytes` (plus room for the multipart envelope) while streaming, before anything is buffered. */
function fileBodyLimit(maxBytes: number, code: string) {
  return bodyLimit({
    maxSize: maxBytes + 1024 * 1024,
    onError: () => {
      throw new BusinessRuleError(`The file is larger than ${maxBytes / (1024 * 1024)} MB`, code, { reason: 'TOO_LARGE', maxBytes });
    },
  });
}

/** The multipart `file` field, or 422 `code` / MISSING. */
async function multipartFile(c: Context<AppEnv>, code: string) {
  const file = (await c.req.parseBody()).file;
  if (!(file instanceof File)) throw new BusinessRuleError('Attach the file as a multipart `file` field', code, { reason: 'MISSING' });
  return { type: file.type, size: file.size, name: file.name, bytes: async () => new Uint8Array(await file.arrayBuffer()) };
}

/** Mounted at /api/v1 */
export function contentRoutes(service: ContentService) {
  return new Hono<AppEnv>()
    .get('/batches/:id/materials', requireAuth, async (c) => c.json(await service.materials(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/materials', requireAuth, validate('json', materialBody), async (c) =>
      c.json(await service.addMaterial(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .post('/batches/:id/materials/file', requireAuth, fileBodyLimit(MAX_MATERIAL_FILE_BYTES, 'MATERIAL_FILE_INVALID'), async (c) =>
      c.json(await service.uploadMaterialFile(c.req.param('id'), await multipartFile(c, 'MATERIAL_FILE_INVALID'), currentUser(c)), 201),
    )
    .get('/batches/:id/assignments', requireAuth, async (c) => c.json(await service.assignments(c.req.param('id'), currentUser(c))))
    .post('/batches/:id/assignments', requireAuth, validate('json', assignmentBody), async (c) =>
      c.json(await service.addAssignment(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .patch('/assignments/:id', requireAuth, validate('json', updateAssignmentInput), async (c) =>
      c.json(await service.updateAssignment(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .delete('/assignments/:id', requireAuth, async (c) => c.json(await service.deleteAssignment(c.req.param('id'), currentUser(c))))
    .get('/assignments/:id/submissions', requireAuth, async (c) => c.json(await service.submissions(c.req.param('id'), currentUser(c))))
    .post('/assignments/:id/submissions', requireAuth, validate('json', submissionInput), async (c) =>
      c.json(await service.submit(c.req.param('id'), c.req.valid('json'), currentUser(c)), 201),
    )
    .post('/assignments/:id/submission/file', requireRole('STUDENT'), fileBodyLimit(MAX_SUBMISSION_FILE_BYTES, 'SUBMISSION_FILE_INVALID'), async (c) =>
      c.json(await service.uploadSubmissionFile(c.req.param('id'), await multipartFile(c, 'SUBMISSION_FILE_INVALID'), currentUser(c)), 201),
    )
    .post('/submissions/:id/grade', requireAuth, validate('json', gradeInput), async (c) =>
      c.json(await service.grade(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    )
    .get('/me/recordings', requireAuth, async (c) => c.json(await service.recordings(currentUser(c))));
}
