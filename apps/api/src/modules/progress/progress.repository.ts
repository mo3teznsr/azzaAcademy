import { BADGE_IDS, type BadgeId } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { GoalHolder, LearnerActivity, LearningGoal, ProgressRepository } from './progress.service';

const isBadge = (v: string): v is BadgeId => (BADGE_IDS as readonly string[]).includes(v);
/** Streaks look back this far; older history only matters for totals. */
const HISTORY_DAYS = 400;

export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly db: Db) {}

  async activity(userId: string): Promise<LearnerActivity> {
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
    const [completions, lessonsCompleted, quizzes, perfect, joins, marks, watch, certificates] = await Promise.all([
      this.db.lessonProgress.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
      this.db.lessonProgress.count({ where: { userId } }),
      this.db.quizAttempt.findMany({ where: { userId, submittedAt: { gte: since } }, select: { submittedAt: true } }),
      this.db.quizAttempt.findMany({
        where: { userId, submittedAt: { not: null }, timedOut: false, maxScore: { gt: 0 }, score: { not: null } },
        select: { score: true, maxScore: true },
      }),
      this.db.attendance.findMany({ where: { userId, joinedAt: { gte: since } }, select: { sessionId: true, joinedAt: true } }),
      // Teacher corrections count too (e.g. a learner marked present after joining from another device).
      this.db.attendanceMark.findMany({
        where: { userId, mark: { in: ['PRESENT', 'LATE', 'LEFT_EARLY'] } },
        select: { sessionId: true, session: { select: { startsAt: true } } },
      }),
      this.db.lessonWatchTime.groupBy({ by: ['day'], where: { userId, day: { gte: since } }, _sum: { seconds: true } }),
      this.db.certificate.count({ where: { userId } }),
    ]);
    const attended = new Map<string, Date>();
    for (const m of marks) attended.set(m.sessionId, m.session.startsAt);
    for (const j of joins) if (!attended.has(j.sessionId)) attended.set(j.sessionId, j.joinedAt);
    return {
      lessonCompletions: completions.map((c) => c.completedAt),
      quizSubmissions: quizzes.flatMap((q) => (q.submittedAt ? [q.submittedAt] : [])),
      liveAttendance: [...attended.values()],
      watchSecondsByDay: watch.map((w) => ({ day: w.day.toISOString().slice(0, 10), seconds: w._sum.seconds ?? 0 })),
      lessonsCompleted,
      liveClassesAttended: attended.size,
      certificates,
      perfectQuiz: perfect.some((q) => (q.score ?? 0) >= q.maxScore),
    };
  }

  async timezone(userId: string) {
    const u = await this.db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
    return u?.timezone ?? 'Asia/Dubai';
  }

  async goal(userId: string): Promise<LearningGoal | null> {
    return this.db.learningGoal.findUnique({ where: { userId }, select: { unit: true, target: true, reminders: true } });
  }

  async saveGoal(userId: string, goal: LearningGoal) {
    await this.db.learningGoal.upsert({ where: { userId }, create: { userId, ...goal }, update: goal });
  }

  async deleteGoal(userId: string) {
    await this.db.learningGoal.deleteMany({ where: { userId } });
  }

  async goalHolders(): Promise<GoalHolder[]> {
    const rows = await this.db.learningGoal.findMany({
      where: { reminders: true, user: { banned: false } },
      select: { userId: true, unit: true, target: true, reminders: true, user: { select: { timezone: true } } },
    });
    return rows.map(({ user, ...g }) => ({ ...g, timezone: user.timezone }));
  }

  async badges(userId: string) {
    const rows = await this.db.learnerBadge.findMany({ where: { userId }, select: { badge: true, earnedAt: true } });
    return rows.flatMap((r) => (isBadge(r.badge) ? [{ id: r.badge, earnedAt: r.earnedAt }] : []));
  }

  async award(userId: string, badge: BadgeId, at: Date) {
    const r = await this.db.learnerBadge.createMany({ data: [{ userId, badge, earnedAt: at }], skipDuplicates: true });
    return r.count > 0;
  }

  async activeSince(since: Date) {
    const [a, b, c, d] = await Promise.all([
      this.db.lessonProgress.findMany({ where: { completedAt: { gte: since } }, select: { userId: true }, distinct: ['userId'] }),
      this.db.quizAttempt.findMany({ where: { submittedAt: { gte: since } }, select: { userId: true }, distinct: ['userId'] }),
      this.db.attendance.findMany({ where: { joinedAt: { gte: since } }, select: { userId: true }, distinct: ['userId'] }),
      this.db.certificate.findMany({ where: { issuedAt: { gte: since } }, select: { userId: true }, distinct: ['userId'] }),
    ]);
    // Watch time is keyed by day: yesterday's and today's rows.
    const watch = await this.db.lessonWatchTime.findMany({
      where: { day: { gte: new Date(since.toISOString().slice(0, 10)) } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return [...new Set([...a, ...b, ...c, ...d, ...watch].map((r) => r.userId))];
  }

  async claim(userId: string, key: string, at: Date) {
    const r = await this.db.lifecycleMessage.createMany({ data: [{ userId, key, sentAt: at }], skipDuplicates: true });
    return r.count > 0;
  }
}
