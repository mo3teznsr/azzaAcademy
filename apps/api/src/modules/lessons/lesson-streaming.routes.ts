import { Hono } from 'hono';
import { z } from 'zod';
import { lessonDownloadStatusInput } from '@azza/shared';
import { currentUser, requireAuth, requireRole } from '../../http/middleware';
import type { AppEnv } from '../../http/types';
import { validate } from '../../http/validate';
import type { LessonStreamingService } from './lesson-streaming.service';

const backfillInput = z.object({ limit: z.number().int().min(1).max(50).optional() });

/** Mounted at /api/v1 — offline downloads for readers, streaming controls for admins. */
export function lessonStreamingRoutes(streaming: LessonStreamingService) {
  return (
    new Hono<AppEnv>()
      // A 15-minute link to the lesson's smallest video file, under the lesson's read rule.
      .post('/lessons/:lessonId/download', requireAuth, async (c) => c.json(await streaming.issueDownload(c.req.param('lessonId'), currentUser(c))))
      // The app's check on its next online launch: which saved lessons may stay on the device.
      .post('/me/lesson-downloads/status', requireAuth, validate('json', lessonDownloadStatusInput), async (c) =>
        c.json(await streaming.downloadStatus(c.req.valid('json').lessonIds, currentUser(c))),
      )
      // Token-signed (no session needed, so download managers can follow it); redirects to the file.
      .get('/lesson-downloads/:token', async (c) => {
        const { url } = await streaming.redeemDownload(c.req.param('token'));
        return c.redirect(url, 302);
      })
      // HLS playlists rewritten with CloudFront-signed segment URLs (token-signed, so players need no session or cookie).
      .get('/lesson-streams/:token/:name', async (c) => {
        const body = await streaming.playlist(c.req.param('token'), c.req.param('name'));
        return c.body(body, 200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'private, max-age=30' });
      })
      .get('/admin/lessons/:lessonId/stream', requireRole('ADMIN'), async (c) => c.json(await streaming.status(c.req.param('lessonId'))))
      // "Prepare for streaming": (re)send the lesson's uploaded video to the transcoder.
      .post('/admin/lessons/:lessonId/stream', requireRole('ADMIN'), async (c) => c.json(await streaming.prepare(c.req.param('lessonId')), 202))
      .post('/admin/lessons/:lessonId/stream/refresh', requireRole('ADMIN'), async (c) => c.json(await streaming.refresh(c.req.param('lessonId'))))
      // Existing videos: prepare the next batch of lessons that were uploaded before streaming was set up.
      .post('/admin/lessons-streaming/backfill', requireRole('ADMIN'), validate('json', backfillInput), async (c) =>
        c.json(await streaming.backfill(c.req.valid('json').limit ?? 10), 202),
      )
  );
}
