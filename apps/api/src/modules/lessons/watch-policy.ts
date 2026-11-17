import { parseCourseVideoUrl } from '@azza/shared';

/** How much of an uploaded lesson video must be watched before the lesson can be marked complete. */
export const WATCH_TO_COMPLETE = 0.8;
/** Watching this much completes the lesson on its own. */
export const WATCH_TO_AUTOCOMPLETE = 0.9;

/** The furthest point reached in a lesson video, and its length when the player reported it. */
export interface WatchProgress {
  maxSec: number;
  durationSec: number | null;
}

/** Pure: the share of the video watched (0–1), or null when the length is unknown. */
export function watchedShare(w: WatchProgress | null): number | null {
  if (!w || !w.durationSec || w.durationSec <= 0) return null;
  return Math.min(1, w.maxSec / w.durationSec);
}

/**
 * Pure: may the reader mark this lesson complete? Lessons without an uploaded video, and YouTube or Vimeo videos (whose
 * position can't be tracked), always may. An uploaded video needs 80% watched; when the player never reported the
 * length (older app versions), the lesson is not blocked.
 */
export function mayComplete(videoUrl: string | null, w: WatchProgress | null): { ok: true } | { ok: false; watchedPercent: number } {
  if (parseCourseVideoUrl(videoUrl)?.kind !== 'file') return { ok: true };
  const share = watchedShare(w);
  if (share === null || share >= WATCH_TO_COMPLETE) return { ok: true };
  return { ok: false, watchedPercent: Math.floor(share * 100) };
}
