import { Hono } from 'hono';
import type { AppEnv } from '../../http/types';
import type { StatsService } from './stats.service';

/** Mounted at /api/v1/stats — public. */
export function statsRoutes(stats: StatsService) {
  return new Hono<AppEnv>().get('/live', async (c) => {
    c.header('Cache-Control', 'public, max-age=15');
    return c.json(await stats.liveNow());
  });
}
