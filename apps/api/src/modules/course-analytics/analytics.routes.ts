import { Hono } from 'hono';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import type { CourseAnalyticsService } from './analytics.service';

/** Mounted at /api/v1/teacher */
export function courseAnalyticsRoutes(service: CourseAnalyticsService) {
  return new Hono<AppEnv>().get('/courses/:courseId/analytics', requireRole('TEACHER', 'ADMIN'), async (c) =>
    c.json(await service.forCourse(c.req.param('courseId'), currentUser(c))),
  );
}
