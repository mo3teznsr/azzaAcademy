import { BADGE_IDS, type BadgeId, type BadgeView, type LearnerProgress, type LearningGoalUnit, type UpdateLearningGoalInput } from '@azza/shared';
import type { Clock } from '../../core/ports';
import type { Notifier } from '../notifications/notification.types';
import {
  computeStreak,
  earnedBadges,
  goalProgress,
  goalReminderDue,
  inReminderWindow,
  learningDays,
  localDay,
  localHour,
  weekSummary,
  type ActivitySignals,
} from './progress.policy';

export interface LearnerActivity extends ActivitySignals {
  lessonsCompleted: number;
  liveClassesAttended: number;
  certificates: number;
  perfectQuiz: boolean;
}

export interface LearningGoal {
  unit: LearningGoalUnit;
  target: number;
  reminders: boolean;
}

export interface GoalHolder extends LearningGoal {
  userId: string;
  timezone: string;
}

export interface ProgressRepository {
  /** Every learning signal of the learner (lesson completions, quiz submissions, live attendance, watch time). */
  activity(userId: string): Promise<LearnerActivity>;
  timezone(userId: string): Promise<string>;
  goal(userId: string): Promise<LearningGoal | null>;
  saveGoal(userId: string, goal: LearningGoal, at: Date): Promise<void>;
  deleteGoal(userId: string): Promise<void>;
  /** Learners with a goal and reminders on. */
  goalHolders(): Promise<GoalHolder[]>;
  badges(userId: string): Promise<Array<{ id: BadgeId; earnedAt: Date }>>;
  /** Stores the badge once; false when the learner already had it. */
  award(userId: string, badge: BadgeId, at: Date): Promise<boolean>;
  /** Learners with any learning signal since `since` (for the badge sweep). */
  activeSince(since: Date): Promise<string[]>;
  /** Records a message once per user and key (shared with the lifecycle job); false when already sent. */
  claim(userId: string, key: string, at: Date): Promise<boolean>;
}

/** Bilingual copy for each badge (notifications; the apps carry their own UI copy). */
export const BADGE_COPY: Record<BadgeId, { en: string; ar: string }> = {
  FIRST_LESSON: { en: 'First lesson', ar: 'الدرس الأول' },
  FIRST_LIVE_CLASS: { en: 'First live class', ar: 'أول صف مباشر' },
  LESSONS_10: { en: '10 lessons', ar: '10 دروس' },
  PERFECT_QUIZ: { en: 'Full marks', ar: 'العلامة الكاملة' },
  STREAK_7: { en: '7-day streak', ar: 'تتابع 7 أيام' },
  FIRST_CERTIFICATE: { en: 'First certificate', ar: 'الشهادة الأولى' },
  LESSONS_50: { en: '50 lessons', ar: '50 درسًا' },
  STREAK_30: { en: '30-day streak', ar: 'تتابع 30 يومًا' },
};

const DAY = 86_400_000;

/**
 * Streaks, the weekly goal and badges.
 * Badges are awarded when the learner opens their progress and by the hourly sweep, each once (LearnerBadge is
 * unique per learner and badge), with an in-app and push notice. The weekly reminder is claimed in LifecycleMessage
 * under `goal-reminder:<monday>`, so a learner gets at most one per week.
 */
export class ProgressService {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  async summary(userId: string, timezone?: string): Promise<LearnerProgress> {
    const tz = timezone ?? (await this.repo.timezone(userId));
    const now = this.clock.now();
    const today = localDay(now, tz);
    const [activity, goal] = await Promise.all([this.repo.activity(userId), this.repo.goal(userId)]);
    const days = learningDays(activity, tz);
    const streak = computeStreak(days, today);
    await this.awardFor(userId, activity, streak.best, now);
    const badges = await this.repo.badges(userId);
    const week = weekSummary(days, activity.lessonCompletions.map((d) => localDay(d, tz)), today);
    const progress = goal ? goalProgress(goal.unit, week) : 0;
    return {
      today,
      timezone: tz,
      streak,
      week,
      goal: goal ? { ...goal, progress, met: progress >= goal.target } : null,
      latestBadges: [...badges]
        .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())
        .slice(0, 3)
        .map((b) => ({ id: b.id, earnedAt: b.earnedAt.toISOString() })),
      badgeCount: { earned: badges.length, total: BADGE_IDS.length },
    };
  }

  /** Every badge, earned or locked, in catalogue order. */
  async badges(userId: string): Promise<{ items: BadgeView[] }> {
    const earned = new Map((await this.repo.badges(userId)).map((b) => [b.id, b.earnedAt]));
    return { items: BADGE_IDS.map((id) => ({ id, earnedAt: earned.get(id)?.toISOString() ?? null })) };
  }

  async setGoal(userId: string, input: UpdateLearningGoalInput, timezone?: string) {
    await this.repo.saveGoal(userId, { unit: input.unit, target: input.target, reminders: input.reminders }, this.clock.now());
    return this.summary(userId, timezone);
  }

  async clearGoal(userId: string, timezone?: string) {
    await this.repo.deleteGoal(userId);
    return this.summary(userId, timezone);
  }

  /** Hourly: badges for recently active learners, then the weekly goal reminders. */
  async run() {
    const now = this.clock.now();
    let awarded = 0;
    for (const userId of await this.repo.activeSince(new Date(now.getTime() - 2 * DAY))) {
      const tz = await this.repo.timezone(userId);
      const activity = await this.repo.activity(userId);
      const best = computeStreak(learningDays(activity, tz), localDay(now, tz)).best;
      awarded += await this.awardFor(userId, activity, best, now);
    }
    return { awarded, reminded: await this.remindGoals(now) };
  }

  private async remindGoals(now: Date) {
    let reminded = 0;
    for (const g of await this.repo.goalHolders()) {
      if (!g.reminders) continue;
      const today = localDay(now, g.timezone);
      const hour = localHour(now, g.timezone);
      // Cheap check first: most hours of the week are not reminder hours.
      if (!inReminderWindow(today, hour)) continue;
      const activity = await this.repo.activity(g.userId);
      const week = weekSummary(learningDays(activity, g.timezone), activity.lessonCompletions.map((d) => localDay(d, g.timezone)), today);
      if (!goalReminderDue({ unit: g.unit, target: g.target, week, today, localHour: hour })) continue;
      if (!(await this.repo.claim(g.userId, `goal-reminder:${week.start}`, now))) continue;
      const left = g.target - goalProgress(g.unit, week);
      await this.notifier.notify([g.userId], this.reminderNotice(g.unit, left), { channels: ['in-app', 'push'] });
      reminded++;
    }
    return reminded;
  }

  private reminderNotice(unit: LearningGoalUnit, left: number) {
    const en =
      unit === 'DAYS'
        ? left === 1 ? 'One more learning day reaches this week’s goal.' : `${left} more learning days reach this week’s goal.`
        : left === 1 ? 'One more lesson reaches this week’s goal.' : `${left} more lessons reach this week’s goal.`;
    const ar =
      unit === 'DAYS'
        ? left === 1 ? 'يوم تعلّم واحد إضافي يحقق هدف هذا الأسبوع.' : `${left} أيام تعلّم إضافية تحقق هدف هذا الأسبوع.`
        : left === 1 ? 'درس واحد إضافي يحقق هدف هذا الأسبوع.' : `${left} دروس إضافية تحقق هدف هذا الأسبوع.`;
    return {
      type: 'LEARNING_GOAL_REMINDER',
      title: 'Your weekly goal is within reach',
      body: `${en} A short session is enough.`,
      ar: { title: 'هدفك الأسبوعي في المتناول', body: `${ar} جلسة قصيرة تكفي.` },
      data: { url: `${this.webUrl}/progress`, left: String(left) },
    };
  }

  private async awardFor(userId: string, a: LearnerActivity, bestStreak: number, now: Date) {
    const ids = earnedBadges({ ...a, bestStreak });
    if (!ids.length) return 0;
    const have = new Set((await this.repo.badges(userId)).map((b) => b.id));
    let count = 0;
    for (const id of ids) {
      if (have.has(id) || !(await this.repo.award(userId, id, now))) continue;
      count++;
      const copy = BADGE_COPY[id];
      await this.notifier.notify(
        [userId],
        {
          type: 'BADGE_EARNED',
          title: `New badge: ${copy.en}`,
          body: 'It’s on your progress page.',
          ar: { title: `شارة جديدة: ${copy.ar}`, body: 'تجدها في صفحة تقدّمك.' },
          data: { badge: id, url: `${this.webUrl}/progress` },
        },
        { channels: ['in-app', 'push'] },
      );
    }
    return count;
  }
}
