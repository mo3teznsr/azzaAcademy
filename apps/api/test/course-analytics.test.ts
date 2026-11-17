import { describe, expect, test } from 'bun:test';
import type { AppError } from '../src/core/errors';
import { inactiveLearners, lastActivityByUser, lessonFunnel, type LessonActivity, type LiveLearner } from '../src/modules/course-analytics/analytics-math';
import type { CourseAnalyticsRepository } from '../src/modules/course-analytics/analytics.repository';
import { CourseAnalyticsService } from '../src/modules/course-analytics/analytics.service';
import type { QaLesson } from '../src/modules/lesson-qa/qa.service';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const DAY = 86_400_000;
const now = new Date('2026-11-30T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

const lessons = ['l1', 'l2', 'l3'].map((id) => ({ id, titleEn: `Lesson ${id}`, titleAr: null }));
const video = (maxSec: number, durationSec: number | null, at = daysAgo(1)) => ({ maxSec, durationSec, updatedAt: at });
const row = (userId: string, lessonId: string, v: LessonActivity['video'], completedAt: Date | null = null): LessonActivity => ({ userId, lessonId, video: v, completedAt });

describe('lessonFunnel', () => {
  const activity: LessonActivity[] = [
    // l1: four starters (a video position or a completion), two completions
    row('a', 'l1', video(100, 100), daysAgo(1)),
    row('b', 'l1', video(50, 100)),
    row('c', 'l1', video(30, null)), // length unknown: started, not in the average
    row('d', 'l1', null, daysAgo(2)), // completed without playing (no video)
    // l2: a and b continue; c and d drop off
    row('a', 'l2', video(60, 120)),
    row('b', 'l2', null, daysAgo(1)),
    // someone who skipped l1 entirely still counts on l2
    row('e', 'l2', video(10, 100)),
    // a lesson from another course is ignored
    row('a', 'other', video(1, 1)),
  ];
  const out = lessonFunnel(lessons, activity);

  test('starters and completions per lesson, in course order', () => {
    expect(out.map((r) => [r.lessonId, r.started, r.completed])).toEqual([
      ['l1', 4, 2],
      ['l2', 3, 1],
      ['l3', 0, 0],
    ]);
  });

  test('average share watched, only where the length is known, capped at the full video', () => {
    expect(out[0]!.avgWatchedShare).toBeCloseTo(0.75); // (1 + 0.5) / 2
    expect(out[1]!.avgWatchedShare).toBeCloseTo((0.5 + 0.1) / 2);
    expect(out[2]!.avgWatchedShare).toBeNull();
    expect(lessonFunnel(lessons.slice(0, 1), [row('x', 'l1', video(300, 100))])[0]!.avgWatchedShare).toBe(1);
  });

  test('drop-off: starters of a lesson who never start the next; none on the last lesson or without starters', () => {
    expect(out[0]!.dropOff).toBeCloseTo(0.5); // c and d of four
    expect(out[1]!.dropOff).toBe(1); // nobody started l3
    expect(out[2]!.dropOff).toBeNull();
    expect(lessonFunnel(lessons, [])[0]!.dropOff).toBeNull();
  });

  test('a course without lessons gives no rows', () => {
    expect(lessonFunnel([], activity)).toEqual([]);
  });
});

describe('inactive learners', () => {
  const activity = [
    row('a', 'l1', video(10, 100, daysAgo(20)), daysAgo(3)), // completion 3 days ago: active
    row('b', 'l1', video(10, 100, daysAgo(15))), // idle 15 days
    row('c', 'l1', video(10, 100, daysAgo(30)), daysAgo(16)), // idle 16 days
  ];
  const last = lastActivityByUser(activity);
  const learners: LiveLearner[] = [
    { userId: 'a', name: 'Amal', since: daysAgo(60) },
    { userId: 'b', name: 'Badr', since: daysAgo(60) },
    { userId: 'c', name: 'Camila', since: daysAgo(60) },
    { userId: 'n', name: 'Noor', since: daysAgo(40) }, // never opened a lesson, subscribed long ago
    { userId: 'f', name: 'Fresh', since: daysAgo(2) }, // just subscribed: not inactive yet
  ];

  test('last activity is the latest of video saves and completions', () => {
    expect(last.get('a')).toEqual(daysAgo(3));
    expect(last.get('c')).toEqual(daysAgo(16));
    expect(last.has('n')).toBe(false);
  });

  test('live learners idle 14 days or more, longest idle first, with last active (null when never)', () => {
    expect(inactiveLearners(learners, last, now)).toEqual([
      { userId: 'n', name: 'Noor', lastActiveAt: null },
      { userId: 'c', name: 'Camila', lastActiveAt: daysAgo(16) },
      { userId: 'b', name: 'Badr', lastActiveAt: daysAgo(15) },
    ]);
  });

  test('exactly 14 days counts as inactive; 13 does not', () => {
    const l = [{ userId: 'x', name: 'X', since: daysAgo(100) }];
    expect(inactiveLearners(l, new Map([['x', daysAgo(14)]]), now)).toHaveLength(1);
    expect(inactiveLearners(l, new Map([['x', daysAgo(13)]]), now)).toHaveLength(0);
  });
});

describe('CourseAnalyticsService', () => {
  const course = (over: Partial<QaLesson['course']> = {}): QaLesson['course'] => ({
    id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null, type: 'RECORDED', createdById: 'lina', modules: [{ id: 'm1', order: 0 }], ...over,
  });
  const repo: CourseAnalyticsRepository = {
    async activity(ids) {
      return [row('a', 'l1', video(50, 100, daysAgo(20))), row('a', 'l2', null, daysAgo(20)), row('b', 'l1', video(100, 100, daysAgo(1)))].filter((r) => ids.includes(r.lessonId));
    },
    async liveLearners() {
      return [{ userId: 'a', name: 'Amal', since: daysAgo(60) }, { userId: 'b', name: 'Badr', since: daysAgo(60) }];
    },
  };
  const make = (c = course()) =>
    new CourseAnalyticsService(repo, { courseLessons: async (id) => (id === 'rc' || id === 'logo-design' ? { course: c, lessons: lessons.map((l) => ({ ...l, moduleId: 'm1' })) } : null) }, { now: () => now });

  test('the author gets the funnel and inactive learners by name only', async () => {
    const out = await make().forCourse('rc', { id: 'lina', role: 'TEACHER' });
    expect(out).toMatchObject({ liveLearners: 2, learnersStarted: 2, inactiveAfterDays: 14 });
    expect(out.lessons.map((l) => [l.started, l.completed])).toEqual([[2, 0], [1, 1], [0, 0]]);
    expect(out.lessons[0]!.dropOff).toBeCloseTo(0.5);
    expect(out.inactive).toEqual([{ id: 'a', name: 'Amal', lastActiveAt: daysAgo(20) }]);
    expect(JSON.stringify(out)).not.toContain('email');
  });

  test('admins see any course; other teachers and students are refused', async () => {
    await make().forCourse('logo-design', { id: 'nour', role: 'ADMIN' });
    expect(await codeOf(make().forCourse('rc', { id: 'omar', role: 'TEACHER' }))).toBe('FORBIDDEN');
    expect(await codeOf(make().forCourse('rc', { id: 'sam', role: 'STUDENT' }))).toBe('FORBIDDEN');
    expect(await codeOf(make().forCourse('nope', { id: 'nour', role: 'ADMIN' }))).toBe('NOT_FOUND');
  });

  test('only recorded courses', async () => {
    expect(await codeOf(make(course({ type: 'LIVE' })).forCourse('rc', { id: 'lina', role: 'TEACHER' }))).toBe('ANALYTICS_RECORDED_ONLY');
  });
});
