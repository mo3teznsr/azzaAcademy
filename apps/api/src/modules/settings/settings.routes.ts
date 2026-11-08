import { Hono } from 'hono';
import { contactSettingsInput, courseCutInput, cutSettingsInput, ruleSettingsInput } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SettingsService } from './settings.service';
import type { SiteSettingsService } from './site-settings.service';

/** Mounted at /api/v1/admin */
export function adminSettingsRoutes(service: SettingsService, site: Pick<SiteSettingsService, 'updateRules' | 'updateContact'>) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    .put('/settings/rules', validate('json', ruleSettingsInput), async (c) => c.json(await site.updateRules(c.req.valid('json'))))
    .put('/settings/contact', validate('json', contactSettingsInput), async (c) => c.json(await site.updateContact(c.req.valid('json'))))
    .get('/settings/cuts', async (c) => c.json(await service.cuts()))
    .put('/settings/cuts', validate('json', cutSettingsInput), async (c) => c.json(await service.updateCuts(c.req.valid('json'), currentUser(c))))
    .put('/courses/:id/cut', validate('json', courseCutInput), async (c) =>
      c.json(await service.setCourseCut(c.req.param('id'), c.req.valid('json'), currentUser(c))),
    );
}

/** Mounted at /api/v1: `GET /site-settings` (public; contact details and the social links that are set). */
export function siteSettingsRoutes(site: Pick<SiteSettingsService, 'siteSettings'>) {
  return new Hono<AppEnv>().get('/site-settings', async (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(await site.siteSettings());
  });
}
