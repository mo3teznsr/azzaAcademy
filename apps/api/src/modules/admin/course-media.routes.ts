import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { BusinessRuleError } from '../../core/errors';
import { requireRole } from '../../http/middleware';
import type { Role } from '@azza/shared';
import type { AppEnv } from '../../http/types';
import { MAX_COURSE_VIDEO_BYTES } from './course-media-file';
import type { CourseMediaService } from './course-media.service';

/** Largest file we accept plus room for the multipart envelope. */
const MAX_BODY_BYTES = MAX_COURSE_VIDEO_BYTES + 1024 * 1024;

/** Mounted at /api/v1/admin (admins) and /api/v1/courses (teachers too) — `POST /media` (multipart `file` + `kind`). */
export function adminMediaRoutes(media: CourseMediaService, roles: Role[] = ['ADMIN']) {
  return new Hono<AppEnv>().post(
    '/media',
    requireRole(...roles),
    // Reject oversized uploads while streaming instead of buffering 1 GB first.
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw new BusinessRuleError('The file is larger than 200 MB', 'COURSE_MEDIA_INVALID', { reason: 'TOO_LARGE', maxBytes: MAX_COURSE_VIDEO_BYTES });
      },
    }),
    async (c) => {
      const body = await c.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) throw new BusinessRuleError('Attach the file as a multipart `file` field', 'COURSE_MEDIA_INVALID', { reason: 'MISSING' });
      return c.json(
        await media.upload(body.kind, { type: file.type, size: file.size, bytes: async () => new Uint8Array(await file.arrayBuffer()) }),
        201,
      );
    },
  );
}
