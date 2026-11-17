import { BADGE_IDS, MIN_WATCH_SECONDS_PER_DAY, type BadgeId, type LearningGoalUnit } from '@azza/shared';
import { addDays, weekdayOf } from '../../core/time';

/*
 * Pure rules for streaks, the weekly goal and badges. Days are YYYY-MM-DD strings in the learner's timezone.
 *
 * Streak rule
 * - A streak is a run of learning days. Today never breaks it: until midnight it is still "pending".
 * - Freeze: one missed day per week (weeks start on Monday, as in the UAE) is bridged automatically, so a
 *   single quiet day keeps the streak. A bridged day does not add to the count.
 * - Two missed days in a row, or a second missed day in the same week, end the streak.
 * - Best streak is the longest run ever, under the same rule.
 */

/** The calendar day (YYYY-MM-DD) of an instant in a timezone. Unknown zones fall back to Asia/Dubai. */
export function localDay(at: Date, timeZone: string): string {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  try {
    return fmt(timeZone);
  } catch {
    return fmt('Asia/Dubai');
  }
}

/** The local hour (0–23) of an instant in a timezone. */
export function localHour(at: Date, timeZone: string): number {
  const fmt = (tz: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(at));
  try {
    return fmt(timeZone);
  } catch {
    return fmt('Asia/Dubai');
  }
}

/** Monday of the day's week. */
export function weekStart(day: string): string {
  const wd = weekdayOf(day); // 0 = Sunday
  return addDays(day, -((wd + 6) % 7));
}

export interface ActivitySignals {
  lessonCompletions: Date[];
  quizSubmissions: Date[];
  liveAttendance: Date[];
  /** Seconds watched per day. LessonWatchTime is keyed by UTC day, used as the local day (see docs). */
  watchSecondsByDay: Array<{ day: string; seconds: number }>;
}

/** The learner's learning days. */
export function learningDays(s: ActivitySignals, timeZone: string, minWatchSeconds = MIN_WATCH_SECONDS_PER_DAY): Set<string> {
  const days = new Set<string>();
  for (const at of [...s.lessonCompletions, ...s.quizSubmissions, ...s.liveAttendance]) days.add(localDay(at, timeZone));
  const watched = new Map<string, number>();
  for (const w of s.watchSecondsByDay) watched.set(w.day, (watched.get(w.day) ?? 0) + w.seconds);
  for (const [day, seconds] of watched) if (seconds >= minWatchSeconds) days.add(day);
  return days;
}

export interface StreakResult {
  current: number;
  best: number;
  todayDone: boolean;
  freezeAvailable: boolean;
  frozenDays: string[];
}

/** Current and best streak as of `today`. Days after today are ignored. */
export function computeStreak(days: ReadonlySet<string>, today: string): StreakResult {
  const sorted = [...days].filter((d) => d <= today).sort();
  const thisWeek = weekStart(today);
  if (!sorted.length) return { current: 0, best: 0, todayDone: false, freezeAvailable: true, frozenDays: [] };

  let count = 0;
  let best = 0;
  let frozen: string[] = [];
  let prevMissed = false;
  for (let d = sorted[0]!; d <= today; d = addDays(d, 1)) {
    if (days.has(d)) {
      count++;
      prevMissed = false;
      best = Math.max(best, count);
      continue;
    }
    if (d === today) break; // pending
    const week = weekStart(d);
    if (count > 0 && !prevMissed && !frozen.some((f) => weekStart(f) === week)) {
      frozen.push(d);
      prevMissed = true;
      continue;
    }
    count = 0;
    frozen = [];
    prevMissed = false;
  }
  return {
    current: count,
    best,
    todayDone: days.has(today),
    freezeAvailable: !frozen.some((f) => weekStart(f) === thisWeek),
    frozenDays: count > 0 ? frozen : [],
  };
}

export interface WeekSummary {
  start: string;
  days: string[];
  lessons: number;
}

/** This week's learning days and completed lessons. */
export function weekSummary(days: ReadonlySet<string>, lessonDays: string[], today: string): WeekSummary {
  const start = weekStart(today);
  const inWeek = (d: string) => d >= start && d <= today;
  return { start, days: [...days].filter(inWeek).sort(), lessons: lessonDays.filter(inWeek).length };
}

export function goalProgress(unit: LearningGoalUnit, week: WeekSummary): number {
  return unit === 'DAYS' ? week.days.length : week.lessons;
}

/** Friday from 17:00 local, or any time on Saturday. */
export function inReminderWindow(today: string, hour: number): boolean {
  const wd = weekdayOf(today);
  return wd === 6 || (wd === 5 && hour >= 17);
}

/**
 * Whether the late-week reminder is due: Friday from 17:00 local (or Saturday, if Friday was missed), the goal is
 * not met yet and can still be met this week (for DAYS: enough days left, today included).
 */
export function goalReminderDue(input: {
  unit: LearningGoalUnit;
  target: number;
  week: WeekSummary;
  today: string;
  localHour: number;
}): boolean {
  if (!inReminderWindow(input.today, input.localHour)) return false;
  const wd = weekdayOf(input.today); // 5 = Friday, 6 = Saturday
  const progress = goalProgress(input.unit, input.week);
  if (progress >= input.target) return false;
  if (input.unit === 'DAYS') {
    const daysLeft = wd === 5 ? 3 : 2; // through Sunday, today included
    const todayCounts = input.week.days.includes(input.today) ? 1 : 0;
    if (input.target - progress > daysLeft - todayCounts) return false;
  }
  return true;
}

export interface BadgeStats {
  lessonsCompleted: number;
  liveClassesAttended: number;
  certificates: number;
  perfectQuiz: boolean;
  bestStreak: number;
}

/** The badges these totals have earned, in catalogue order. */
export function earnedBadges(s: BadgeStats): BadgeId[] {
  const rules: Record<BadgeId, boolean> = {
    FIRST_LESSON: s.lessonsCompleted >= 1,
    FIRST_LIVE_CLASS: s.liveClassesAttended >= 1,
    LESSONS_10: s.lessonsCompleted >= 10,
    PERFECT_QUIZ: s.perfectQuiz,
    STREAK_7: s.bestStreak >= 7,
    FIRST_CERTIFICATE: s.certificates >= 1,
    LESSONS_50: s.lessonsCompleted >= 50,
    STREAK_30: s.bestStreak >= 30,
  };
  return BADGE_IDS.filter((id) => rules[id]);
}
