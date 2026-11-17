import { describe, expect, test } from 'bun:test';
import { GRACE_DAYS } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { MAX_REPORT_SEC, periodDays, utcDay, watchedDelta } from '../src/modules/all-access/watch-time';
import type { LessonCourse, LessonRecord, LessonRepository, RecordedSubscription } from '../src/modules/lessons/lesson.repository';
import { LessonService } from '../src/modules/lessons/lesson.service';
import { canReadRecordedCourse, type RecordedPlanSource } from '../src/modules/subscriptions/access-policy';

const DAY = 86_400_000;
const now = new Date('2026-11-20T10:00:00Z');
const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const plan = (status: RecordedSubscription['status'], currentPeriodEnd: Date | null, provider: RecordedSubscription['provider'] = 'STRIPE'): RecordedSubscription => ({ status, currentPeriodEnd, provider });

function source(own: RecordedSubscription | null, allAccess: RecordedSubscription | null): RecordedPlanSource & { asked: number } {
  const s = {
    asked: 0,
    recordedSubscription: async () => own,
    allAccessSubscription: async () => {
      s.asked++;
      return allAccess;
    },
  };
  return s;
}

const published = { id: 'rc', status: 'PUBLISHED' };

describe('canReadRecordedCourse: the all-access plan', () => {
  test('a live all-access plan opens a published recorded course without a plan of its own', async () => {
    expect(await canReadRecordedCourse(source(null, plan('ACTIVE', new Date(now.getTime() + DAY))), published, 'sam', now)).toBe(true);
    expect(await canReadRecordedCourse(source(null, plan('CANCELLING', new Date(now.getTime() + DAY))), published, 'sam', now)).toBe(true);
  });

  test('no plan at all, or an ended all-access plan, stays locked', async () => {
    expect(await canReadRecordedCourse(source(null, null), published, 'zed', now)).toBe(false);
    expect(await canReadRecordedCourse(source(null, plan('ACTIVE', new Date(now.getTime() - 1))), published, 'zed', now)).toBe(false);
    expect(await canReadRecordedCourse(source(null, plan('EXPIRED', new Date(now.getTime() + DAY))), published, 'zed', now)).toBe(false);
    expect(await canReadRecordedCourse(source(null, plan('INCOMPLETE', null)), published, 'zed', now)).toBe(false);
  });

  test('the same grace as a course plan: PAST_DUE card plans keep access for GRACE_DAYS, transfers get none', async () => {
    const ended = new Date(now.getTime() - (GRACE_DAYS - 1) * DAY);
    expect(await canReadRecordedCourse(source(null, plan('PAST_DUE', ended)), published, 'sam', now)).toBe(true);
    expect(await canReadRecordedCourse(source(null, plan('PAST_DUE', new Date(now.getTime() - (GRACE_DAYS + 1) * DAY))), published, 'sam', now)).toBe(false);
    expect(await canReadRecordedCourse(source(null, plan('PAST_DUE', ended, 'BANK_TRANSFER')), published, 'sam', now)).toBe(false);
  });

  test('all-access never opens a course that is not published (drafts, archived)', async () => {
    const live = plan('ACTIVE', new Date(now.getTime() + DAY));
    for (const status of ['DRAFT', 'PENDING_REVIEW', 'ARCHIVED']) {
      expect(await canReadRecordedCourse(source(null, live), { id: 'rc', status }, 'sam', now)).toBe(false);
    }
  });

  test("the course's own plan still works, and then the all-access plan is not even asked", async () => {
    const s = source(plan('ACTIVE', new Date(now.getTime() + DAY)), null);
    expect(await canReadRecordedCourse(s, published, 'sam', now)).toBe(true);
    expect(s.asked).toBe(0);
  });

  test('a repository without all-access support (older fakes) means no all-access plan', async () => {
    expect(await canReadRecordedCourse({ recordedSubscription: async () => null }, published, 'sam', now)).toBe(false);
  });
});

/** Just enough of the lesson repository for reading a lesson and saving positions. */
function lessonHarness(over: { allAccess?: RecordedSubscription | null; courseStatus?: string } = {}) {
  const course: LessonCourse = {
    id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null, status: over.courseStatus ?? 'PUBLISHED', createdById: 'lina', type: 'RECORDED', previewLessonId: 'l1',
    modules: [{ id: 'm1', order: 0, titleEn: 'Basics', titleAr: null, descriptionEn: null, descriptionAr: null }],
  };
  const lessons: LessonRecord[] = ['l1', 'l2'].map((id, order) => ({ id, moduleId: 'm1', order, titleEn: id, titleAr: null, bodyEn: `body ${id}`, bodyAr: null, videoUrl: 'https://youtu.be/x', attachments: [], createdAt: now, updatedAt: now }));
  const saved: Array<{ userId: string; recordedCourseId?: string }> = [];
  const repo = {
    findCourse: async () => course,
    lessonsOfModules: async () => lessons,
    find: async (id: string) => lessons.find((l) => l.id === id) ?? null,
    courseOfLesson: async () => 'rc',
    completedLessonIds: async () => [],
    videoPosition: async () => null,
    recordedSubscription: async () => null,
    hadSubscription: async () => false,
    allAccessSubscription: async () => over.allAccess ?? null,
    activeCourseIds: async () => ['rc'],
    learnerSubscription: async () => null,
    setVideoPosition: async (userId: string, _l: string, _p: number, watch: { recordedCourseId?: string } = {}) => void saved.push({ userId, recordedCourseId: watch.recordedCourseId }),
    watchProgress: async () => null,
  } as unknown as LessonRepository;
  return { service: new LessonService(repo, { now: () => now }), saved };
}

const sam = { id: 'sam', role: 'STUDENT' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };

describe('lessons under the all-access plan', () => {
  test('an all-access subscriber reads any lesson; without it the lesson needs a plan', async () => {
    const live = lessonHarness({ allAccess: plan('ACTIVE', new Date(now.getTime() + DAY)) });
    expect((await live.service.get('l2', sam)).bodyEn).toBe('body l2');
    expect(await codeOf(lessonHarness().service.get('l2', sam))).toBe('PLAN_REQUIRED');
  });

  test('my progress marks the course open through all-access', async () => {
    const { service } = lessonHarness({ allAccess: plan('ACTIVE', new Date(now.getTime() + DAY)) });
    const [item] = (await service.myProgress(sam)).items;
    expect(item).toMatchObject({ courseId: 'rc', viaAllAccess: true });
  });

  test("a learner's position reports count as watch time; the author's own previews do not", async () => {
    const { service, saved } = lessonHarness({ allAccess: plan('ACTIVE', new Date(now.getTime() + DAY)) });
    await service.saveVideoPosition('l2', { positionSec: 30 }, sam);
    await service.saveVideoPosition('l2', { positionSec: 30 }, lina);
    expect(saved).toEqual([{ userId: 'sam', recordedCourseId: 'rc' }, { userId: 'lina', recordedCourseId: undefined }]);
  });
});

describe('watchedDelta', () => {
  const at = (sec: number) => new Date(now.getTime() + sec * 1000);
  const before = { positionSec: 100, updatedAt: now };

  test('counts the forward move since the last report', () => {
    expect(watchedDelta(before, 110, at(10))).toBe(10);
  });

  test('a rewind, a restart or the end-of-video reset counts nothing', () => {
    expect(watchedDelta(before, 90, at(10))).toBe(0);
    expect(watchedDelta(before, 0, at(10))).toBe(0);
    expect(watchedDelta(before, 100, at(10))).toBe(0);
  });

  test('seeking ahead or 2x speed is capped at the wall time since the last report (plus slack)', () => {
    expect(watchedDelta(before, 400, at(10))).toBe(15);
    expect(watchedDelta(before, 120, at(10))).toBe(15);
  });

  test('a jump after a long pause adds at most MAX_REPORT_SEC', () => {
    expect(watchedDelta(before, 1000, at(3 * 86_400))).toBe(MAX_REPORT_SEC);
  });

  test('the first report of a lesson counts its position, capped', () => {
    expect(watchedDelta(null, 12, now)).toBe(12);
    expect(watchedDelta(null, 900, now)).toBe(MAX_REPORT_SEC);
  });
});

describe('period days', () => {
  test('a period owns the UTC day it starts on, not the day it ends on', () => {
    const { from, to } = periodDays(new Date('2026-11-05T14:30:00Z'), new Date('2026-12-05T14:30:00Z'));
    expect(from.toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-05T00:00:00.000Z');
    expect(utcDay(new Date('2026-12-05T23:59:59Z')).toISOString()).toBe('2026-12-05T00:00:00.000Z');
  });
});
