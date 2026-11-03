import { Hono } from 'hono';
import type { AppEnv } from '../../http/types';
import type { TeacherService } from './teacher.service';

/** Mounted at /api/v1/teachers — public. */
export function teacherRoutes(service: TeacherService) {
  return new Hono<AppEnv>().get('/:id', async (c) => c.json(await service.profile(c.req.param('id'))));
}
