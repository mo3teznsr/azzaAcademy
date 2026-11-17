import { z } from 'zod';

/**
 * Learning progress: streaks, a weekly goal and personal badges (docs/PROGRESS.md).
 *
 * A learning day is a calendar day in the learner's timezone with at least one of: a completed lesson,
 * `MIN_WATCH_SECONDS_PER_DAY` of video watched, a submitted quiz, or a live class attended.
 */
export const MIN_WATCH_SECONDS_PER_DAY = 5 * 60;

export const LEARNING_GOAL_UNITS = ['DAYS', 'LESSONS'] as const;
export type LearningGoalUnit = (typeof LEARNING_GOAL_UNITS)[number];

/** The targets offered in the apps (per week). */
export const LEARNING_GOAL_TARGETS = [2, 3, 5] as const;

export const updateLearningGoalInput = z.object({
  unit: z.enum(LEARNING_GOAL_UNITS),
  // DAYS caps at 7; LESSONS allows a little more headroom.
  target: z.number().int().min(1).max(20),
  /** One gentle reminder late in the week when behind (in-app and push). */
  reminders: z.boolean().default(true),
}).refine((g) => g.unit !== 'DAYS' || g.target <= 7, { message: 'A week has 7 days', path: ['target'] });
export type UpdateLearningGoalInput = z.infer<typeof updateLearningGoalInput>;

/** Personal milestones, in display order. Never ranked against other learners. */
export const BADGE_IDS = [
  'FIRST_LESSON',
  'FIRST_LIVE_CLASS',
  'LESSONS_10',
  'PERFECT_QUIZ',
  'STREAK_7',
  'FIRST_CERTIFICATE',
  'LESSONS_50',
  'STREAK_30',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export interface BadgeView {
  id: BadgeId;
  /** ISO time, or null while locked. */
  earnedAt: string | null;
}

export interface LearningGoalView {
  unit: LearningGoalUnit;
  target: number;
  reminders: boolean;
  /** Learning days or lessons completed this week. */
  progress: number;
  met: boolean;
}

export interface LearnerProgress {
  /** Today in the learner's timezone (YYYY-MM-DD) and the timezone used. */
  today: string;
  timezone: string;
  streak: {
    current: number;
    best: number;
    /** Today already counts as a learning day. */
    todayDone: boolean;
    /** This week's freeze is still unused. */
    freezeAvailable: boolean;
    /** Missed days bridged by a freeze in the current streak (YYYY-MM-DD). */
    frozenDays: string[];
  };
  week: {
    /** Monday of this week (YYYY-MM-DD). */
    start: string;
    /** Learning days so far this week (YYYY-MM-DD). */
    days: string[];
    lessons: number;
  };
  goal: LearningGoalView | null;
  /** The three most recent badges, newest first. */
  latestBadges: BadgeView[];
  badgeCount: { earned: number; total: number };
}
