/**
 * Watch time for the all-access split (pure).
 *
 * The players report the video position about every 10 seconds (and on exit). Each report adds the seconds played since
 * the previous one to the learner's `LessonWatchTime` row for the lesson and the UTC day:
 * - only forward moves count (a rewind, a restart or the end-of-video reset to 0 add nothing);
 * - a move can't count for more than the wall time since the previous report (plus a little slack for network delay),
 *   so seeking ahead or playing at 2x is not paid as extra minutes;
 * - and never more than `MAX_REPORT_SEC` at once, so a jump after a long pause (or a resume days later) adds at most that.
 * The first report of a lesson (no saved position yet) counts its position, up to the same cap.
 */
export const MAX_REPORT_SEC = 60;
export const REPORT_SLACK_SEC = 5;

export function watchedDelta(before: { positionSec: number; updatedAt: Date } | null, positionSec: number, now: Date): number {
  if (!before) return Math.max(0, Math.min(positionSec, MAX_REPORT_SEC));
  const moved = positionSec - before.positionSec;
  if (moved <= 0) return 0;
  const elapsedSec = Math.max(0, Math.floor((now.getTime() - before.updatedAt.getTime()) / 1000));
  return Math.min(moved, elapsedSec + REPORT_SLACK_SEC, MAX_REPORT_SEC);
}

/** Midnight UTC of the instant's day (the `LessonWatchTime.day` key). */
export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * The UTC days whose watch time belongs to a paid period `[start, end)`: days `from <= day < to`. Watch time is kept per
 * day, so a period owns the day it starts on (the purchase day, often the busiest) and not the day it ends on (that one
 * opens the next period). Consecutive periods never share a day. A plan's very last day, after its final renewal, is
 * left out: at most one day's watching per plan, accepted to keep one row per lesson and day.
 */
export function periodDays(start: Date, end: Date): { from: Date; to: Date } {
  return { from: utcDay(start), to: utcDay(end) };
}
