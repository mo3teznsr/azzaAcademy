import { Hono } from 'hono';
import { requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import type { AppStoreSyncCoordinator } from './appstore-sync.coordinator';

/** Mounted at /api/v1/admin */
export function adminAppStoreRoutes(sync: Pick<AppStoreSyncCoordinator, 'status' | 'startSync'>) {
  return new Hono<AppEnv>()
    .use('/app-store/*', requireRole('ADMIN'))
    .get('/app-store/status', async (c) => c.json(await sync.status()))
    // Runs in the background; a run already in progress is not started twice.
    .post('/app-store/sync', (c) => c.json(sync.startSync()));
}
