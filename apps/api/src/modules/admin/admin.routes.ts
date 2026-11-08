import { Hono } from 'hono';
import { adminCreateUserInput, adminUpdateUserInput, adminUserListQuery } from '@azza/shared';
import { currentUser, requireRole } from '../../http/middleware';
import { paged } from '../../http/pagination';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { SettingsService } from '../settings/settings.service';
import type { AdminService } from './admin.service';

/** Read-only platform constants + which integrations are configured (never secrets). */
export interface PlatformSettings {
  rules: { EARNING_HOLD_DAYS: number; MIN_PAYOUT_AED: number; BANK_TRANSFER_HOLD_HOURS: number; VAT_PERCENT: number };
  integrations: { stripe: boolean; livekit: boolean; smtp: boolean; push: boolean };
}

/** Mounted at /api/v1/admin */
export function adminRoutes(service: AdminService, settings: PlatformSettings, cutSettings: Pick<SettingsService, 'cuts'>) {
  return new Hono<AppEnv>()
    .use('*', requireRole('ADMIN'))
    // TEACHER_SHARE_PERCENT is kept in the payload for existing clients; it now mirrors the live-course default cut.
    .get('/settings', async (c) =>
      c.json({ ...settings, rules: { ...settings.rules, TEACHER_SHARE_PERCENT: (await cutSettings.cuts()).liveCutPercent } }),
    )
    .get('/dashboard', async (c) => c.json(await service.dashboard()))
    .get('/users', validate('query', adminUserListQuery), async (c) => {
      const { page, pageSize, role, q } = c.req.valid('query');
      return c.json(paged(await service.listUsers({ role, q, skip: (page - 1) * pageSize, take: pageSize }), page, pageSize));
    })
    .post('/users', validate('json', adminCreateUserInput), async (c) => c.json(await service.createUser(c.req.valid('json')), 201))
    .patch('/users/:id', validate('json', adminUpdateUserInput), async (c) =>
      c.json(await service.updateUser(c.req.param('id'), c.req.valid('json'), currentUser(c).id)),
    )
    .get('/live-rooms', async (c) => c.json(await service.liveRooms()));
}
