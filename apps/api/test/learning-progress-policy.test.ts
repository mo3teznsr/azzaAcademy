import { describe, expect, test } from 'bun:test';
import {
  computeStreak,
  earnedBadges,
  goalReminderDue,
  learningDays,
  localDay,
  localHour,
  weekStart,
  weekSummary,
} from '../src/modules/progress/progress.policy';

// 2026-11-16 is a Monday.
const days = (...d: number[]) => new Set(d.map((n) => `2026-11-${String(n).padStart(2, '0')}`));
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;

describe('learning days', () => {
  test('the local calendar day, not the UTC one', () => {
    expect(localDay(new Date('2026-11-16T21:00:00Z'), 'Asia/Dubai')).toBe('2026-11-17');
    expect(localDay(new Date('2026-11-16T21:00:00Z'), 'Europe/London')).toBe('2026-11-16');
    expect(localDay(new Date('2026-11-16T21:00:00Z'), 'Not/AZone')).toBe('2026-11-17'); // falls back to Dubai
    expect(localHour(new Date('2026-11-16T13:00:00Z'), 'Asia/Dubai')).toBe(17);
  });

  test('weeks start on Monday', () => {
    expect(weekStart('2026-11-16')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
  });

  test('a lesson, a quiz, a live class or five minutes of video', () => {
    const set = learningDays(
      {
        lessonCompletions: [new Date('2026-11-10T08:00:00Z')],
        quizSubmissions: [new Date('2026-11-11T08:00:00Z')],
        liveAttendance: [new Date('2026-11-12T20:30:00Z')], // 00:30 on the 13th in Dubai
        watchSecondsByDay: [
          { day: '2026-11-14', seconds: 200 },
          { day: '2026-11-14', seconds: 100 }, // two lessons: 300 s in all
          { day: '2026-11-15', seconds: 299 },
        ],
      },
      'Asia/Dubai',
    );
    expect([...set].sort()).toEqual(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14']);
  });
});

describe('streaks', () => {
  test('no activity, no streak', () => {
    expect(computeStreak(new Set(), day(16))).toEqual({ current: 0, best: 0, todayDone: false, freezeAvailable: true, frozenDays: [] });
  });

  test('consecutive days, and today is still pending', () => {
    expect(computeStreak(days(12, 13, 14, 15, 16), day(16))).toMatchObject({ current: 5, best: 5, todayDone: true });
    expect(computeStreak(days(12, 13, 14, 15), day(16))).toMatchObject({ current: 4, todayDone: false, frozenDays: [] });
  });

  test('one missed day is bridged by the week’s freeze and does not count', () => {
    const s = computeStreak(days(10, 11, 13, 14), day(14));
    expect(s).toMatchObject({ current: 4, best: 4, frozenDays: [day(12)], freezeAvailable: false });
  });

  test('yesterday missed, today pending: the freeze keeps the streak alive', () => {
    expect(computeStreak(days(10, 11, 12, 13), day(15))).toMatchObject({ current: 4, frozenDays: [day(14)] });
  });

  test('two missed days in a row end it', () => {
    expect(computeStreak(days(9, 10, 13, 14), day(14))).toMatchObject({ current: 2, best: 2, frozenDays: [] });
  });

  test('a second missed day in the same week ends it', () => {
    // Mon 9, Wed 11, Fri 13 — Tue 10 bridged, Thu 12 not.
    expect(computeStreak(days(9, 11, 13), day(13))).toMatchObject({ current: 1, best: 2 });
  });

  test('one freeze per week: misses in two different weeks are both bridged', () => {
    // Sun 15 (week of the 9th) and Tue 17 (week of the 16th).
    const s = computeStreak(days(13, 14, 16, 18), day(18));
    expect(s).toMatchObject({ current: 4, frozenDays: [day(15), day(17)], freezeAvailable: false });
    expect(computeStreak(days(13, 14, 16, 17), day(18)).freezeAvailable).toBe(true);
  });

  test('the best streak is remembered after a break', () => {
    const s = computeStreak(new Set([...days(1, 2, 3, 4, 5, 6, 7, 8), ...days(15, 16)]), day(16));
    expect(s).toMatchObject({ current: 2, best: 8 });
  });

  test('days after today are ignored', () => {
    expect(computeStreak(days(15, 16, 17), day(16))).toMatchObject({ current: 2, best: 2 });
  });
});

describe('weekly goal reminder', () => {
  const week = (d: number[], lessons = 0) => weekSummary(days(...d), Array.from({ length: lessons }, () => day(17)), day(20));

  test('week summary counts only this week', () => {
    expect(weekSummary(days(14, 16, 18), [day(15), day(16), day(18)], day(18))).toEqual({ start: day(16), days: [day(16), day(18)], lessons: 2 });
  });

  test('due on Friday evening or Saturday when behind and still reachable', () => {
    const base = { unit: 'DAYS' as const, target: 3, week: week([16]) };
    expect(goalReminderDue({ ...base, today: day(20), localHour: 16 })).toBe(false); // too early
    expect(goalReminderDue({ ...base, today: day(20), localHour: 17 })).toBe(true);
    expect(goalReminderDue({ ...base, today: day(21), localHour: 9 })).toBe(true);
    expect(goalReminderDue({ ...base, today: day(19), localHour: 20 })).toBe(false); // Thursday
    expect(goalReminderDue({ ...base, today: day(22), localHour: 20 })).toBe(false); // Sunday: too late to be useful
  });

  test('not when the goal is met or out of reach', () => {
    expect(goalReminderDue({ unit: 'DAYS', target: 2, week: week([16, 17]), today: day(20), localHour: 18 })).toBe(false);
    // 5 days with 1 done on Friday evening: 4 needed, only Fri–Sun left.
    expect(goalReminderDue({ unit: 'DAYS', target: 5, week: week([16]), today: day(20), localHour: 18 })).toBe(false);
    expect(goalReminderDue({ unit: 'DAYS', target: 4, week: week([16]), today: day(20), localHour: 18 })).toBe(true);
    expect(goalReminderDue({ unit: 'LESSONS', target: 5, week: week([], 2), today: day(20), localHour: 18 })).toBe(true);
    expect(goalReminderDue({ unit: 'LESSONS', target: 2, week: week([], 2), today: day(20), localHour: 18 })).toBe(false);
  });
});

describe('badges', () => {
  test('earned from real milestones, in catalogue order', () => {
    const none = { lessonsCompleted: 0, liveClassesAttended: 0, certificates: 0, perfectQuiz: false, bestStreak: 0 };
    expect(earnedBadges(none)).toEqual([]);
    expect(earnedBadges({ ...none, lessonsCompleted: 10, bestStreak: 7 })).toEqual(['FIRST_LESSON', 'LESSONS_10', 'STREAK_7']);
    expect(earnedBadges({ lessonsCompleted: 50, liveClassesAttended: 1, certificates: 1, perfectQuiz: true, bestStreak: 30 })).toHaveLength(8);
  });
});
