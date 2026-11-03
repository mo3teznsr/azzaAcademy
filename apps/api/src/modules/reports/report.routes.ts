import { Hono } from 'hono';
import { reportQuery } from '@azza/shared';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { ReportService } from './report.service';

/** Mounted at /api/v1/admin */
export function adminReportRoutes(service: ReportService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/reports', validate('query', reportQuery), async (c) => c.json(await service.report(c.req.valid('query'))));
}
