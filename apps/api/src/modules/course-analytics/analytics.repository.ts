import type { Db } from '../../infrastructure/db';
import type { LessonActivity, LiveLearner } from './analytics-math';

const LIVE = ['ACTIVE', 'CANCELLING', 'PAST_DUE'] as const;

/** Persistence port for course analytics. */
export interface CourseAnalyticsRepository {
  /** Every learner's video position and completion on these lessons, merged per learner and lesson. */
  activity(lessonIds: string[]): Promise<LessonActivity[]>;
  /** Learners with a live plan (ACTIVE, CANCELLING, PAST_DUE) on the course: names only, never emails. */
  liveLearners(courseId: string): Promise<LiveLearner[]>;
}

export class PrismaCourseAnalyticsRepository implements CourseAnalyticsRepository {
  constructor(private readonly db: Db) {}

  async activity(lessonIds: string[]) {
    if (!lessonIds.length) return [];
    const [positions, progress] = await Promise.all([
      this.db.lessonVideoPosition.findMany({ where: { lessonId: { in: lessonIds } }, select: { userId: true, lessonId: true, maxSec: true, durationSec: true, updatedAt: true } }),
      this.db.lessonProgress.findMany({ where: { lessonId: { in: lessonIds } }, select: { userId: true, lessonId: true, completedAt: true } }),
    ]);
    const rows = new Map<string, LessonActivity>();
    for (const p of positions) {
      rows.set(`${p.userId}:${p.lessonId}`, { userId: p.userId, lessonId: p.lessonId, video: { maxSec: p.maxSec, durationSec: p.durationSec, updatedAt: p.updatedAt }, completedAt: null });
    }
    for (const p of progress) {
      const key = `${p.userId}:${p.lessonId}`;
      const row = rows.get(key);
      if (row) row.completedAt = p.completedAt;
      else rows.set(key, { userId: p.userId, lessonId: p.lessonId, video: null, completedAt: p.completedAt });
    }
    return [...rows.values()];
  }

  async liveLearners(courseId: string) {
    const subs = await this.db.subscription.findMany({
      where: { courseId, status: { in: [...LIVE] } },
      select: { userId: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const byUser = new Map<string, LiveLearner>();
    for (const s of subs) if (!byUser.has(s.userId)) byUser.set(s.userId, { userId: s.userId, name: s.user.name, since: s.createdAt });
    return [...byUser.values()];
  }
}
