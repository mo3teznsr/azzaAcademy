import { Hono } from 'hono';
import { courseCutInput, cutSettingsInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SettingsService } from './settings.service';

/** Mounted at /api/v1/admin */
export function adminSettingsRoutes(service: SettingsService) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .get('/settings/cuts', async (c) => c.json(await service.cuts()))
    .put('/settings/cuts', validate('json', cutSettingsInput), async (c) => c.json(await service.updateCuts(c.req.valid('json'), currentUser(c))))
    .put('/courses/:id/cut', validate('json', courseCutInput), async (c) =>
      c.json(await service.setCourseCut(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    );
}
