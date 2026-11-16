import { INACTIVE_AFTER_DAYS } from '@azza/shared';
import { watchedShare } from '../lessons/watch-policy';

// Pure funnel math for a recorded course's teacher analytics. No I/O: the service feeds it rows.

export interface FunnelLesson {
  id: string;
  titleEn: string;
  titleAr: string | null;
}

/** One learner's footprint on one lesson: a saved video position and/or a completion. */
export interface LessonActivity {
  userId: string;
  lessonId: string;
  /** From the video position row; null when the learner never played the video. */
  video: { maxSec: number; durationSec: number | null; updatedAt: Date } | null;
  completedAt: Date | null;
}

export interface LessonFunnelRow {
  lessonId: string;
  titleEn: string;
  titleAr: string | null;
  /** Learners with any video position or a completion on this lesson. */
  started: number;
  completed: number;
  /** Mean share (0–1) of the video watched, over learners whose player reported its length; null when none did. */
  avgWatchedShare: number | null;
  /** Share (0–1) of this lesson's starters who did not start the next lesson; null on the last lesson or with no starters. */
  dropOff: number | null;
}

/** Per lesson in curriculum order: starters, completions, average share watched and drop-off to the next lesson. */
export function lessonFunnel(lessons: FunnelLesson[], activity: LessonActivity[]): LessonFunnelRow[] {
  const starters = new Map<string, Set<string>>(lessons.map((l) => [l.id, new Set<string>()]));
  const completers = new Map<string, Set<string>>(lessons.map((l) => [l.id, new Set<string>()]));
  const shares = new Map<string, number[]>(lessons.map((l) => [l.id, []]));
  for (const a of activity) {
    const s = starters.get(a.lessonId);
    if (!s) continue; // a lesson outside this course
    if (a.video || a.completedAt) s.add(a.userId);
    if (a.completedAt) completers.get(a.lessonId)!.add(a.userId);
    const share = a.video ? watchedShare(a.video) : null;
    if (share !== null) shares.get(a.lessonId)!.push(share);
  }
  return lessons.map((l, i) => {
    const started = starters.get(l.id)!;
    const next = lessons[i + 1] ? starters.get(lessons[i + 1]!.id)! : null;
    const watched = shares.get(l.id)!;
    let dropOff: number | null = null;
    if (next && started.size > 0) {
      let lost = 0;
      for (const u of started) if (!next.has(u)) lost++;
      dropOff = lost / started.size;
    }
    return {
      lessonId: l.id,
      titleEn: l.titleEn,
      titleAr: l.titleAr,
      started: started.size,
      completed: completers.get(l.id)!.size,
      avgWatchedShare: watched.length ? watched.reduce((x, y) => x + y, 0) / watched.length : null,
      dropOff,
    };
  });
}

/** The latest moment each learner touched any lesson (video saved or lesson completed). */
export function lastActivityByUser(activity: LessonActivity[]): Map<string, Date> {
  const last = new Map<string, Date>();
  for (const a of activity) {
    for (const at of [a.video?.updatedAt ?? null, a.completedAt]) {
      if (!at) continue;
      const prev = last.get(a.userId);
      if (!prev || at > prev) last.set(a.userId, at);
    }
  }
  return last;
}

export interface LiveLearner {
  userId: string;
  name: string;
  /** When their current live plan started: a learner who just subscribed is not inactive yet. */
  since: Date;
}

export interface InactiveLearner {
  userId: string;
  name: string;
  /** Null when they never opened a lesson. */
  lastActiveAt: Date | null;
}

/**
 * Learners on a live plan with no lesson activity in the last `days` days (counted from their last activity, or from the
 * plan's start when they never had any), longest idle first, never-active first among equals.
 */
export function inactiveLearners(learners: LiveLearner[], last: Map<string, Date>, now: Date, days = INACTIVE_AFTER_DAYS): InactiveLearner[] {
  const cutoff = now.getTime() - days * 86_400_000;
  return learners
    .map((l) => ({ userId: l.userId, name: l.name, lastActiveAt: last.get(l.userId) ?? null, ref: (last.get(l.userId) ?? l.since).getTime() }))
    .filter((l) => l.ref <= cutoff)
    .sort((a, b) => a.ref - b.ref || (a.lastActiveAt ? 1 : 0) - (b.lastActiveAt ? 1 : 0) || a.name.localeCompare(b.name))
    .map(({ ref: _ref, ...l }) => l);
}
