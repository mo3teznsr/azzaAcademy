import { Hono } from 'hono';
import { NotFoundError } from '../../core/errors';
import type { AppEnv } from '../../http/types';
import type { CalendarService } from './calendar.service';

/** Mounted at /api/calendar — public, authenticated by the signed token in the URL. */
export function calendarFeedRoutes(calendar: CalendarService) {
  return new Hono<AppEnv>().get('/:userId/:file', async (c) => {
    const m = /^([a-f0-9]+)\.ics$/.exec(c.req.param('file'));
    if (!m) throw new NotFoundError('Calendar');
    const body = await calendar.feed(c.req.param('userId'), m[1]!);
    return c.body(body, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="azza.ics"',
      'Cache-Control': 'private, max-age=300',
    });
  });
}
