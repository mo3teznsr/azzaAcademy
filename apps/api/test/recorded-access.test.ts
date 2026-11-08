import { describe, expect, test } from 'bun:test';
import { GRACE_DAYS, quizInput, type QuizQuestionInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { BatchAccessPolicy } from '../src/modules/batches/batch-access';
import type { LessonCourse, LessonRecord, LessonRepository, LessonWriteData, RecordedSubscription } from '../src/modules/lessons/lesson.repository';
import { LessonService } from '../src/modules/lessons/lesson.service';
import { passed } from '../src/modules/quizzes/quiz-grader';
import type { AttemptRecord, CourseRef, QuizBatch, QuizRecord, QuizRepository, QuizWriteData, StudentRef } from '../src/modules/quizzes/quiz.repository';
import { QuizService } from '../src/modules/quizzes/quiz.service';
import { hadPaidPeriod, pickSubscription } from '../src/modules/subscriptions/recorded-subscription';
import { canAccessRecorded } from '../src/modules/subscriptions/access-policy';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const errorOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e);

const DAY = 86_400_000;
const end = new Date('2026-12-01T00:00:00Z');

describe('canAccessRecorded', () => {
  const sub = (status: RecordedSubscription['status'], currentPeriodEnd: Date | null = end, provider?: RecordedSubscription['provider']) => ({ status, currentPeriodEnd, provider });

  test('ACTIVE until the period ends', () => {
    expect(canAccessRecorded(sub('ACTIVE'), new Date(end.getTime() - 1000))).toBe(true);
    expect(canAccessRecorded(sub('ACTIVE'), end)).toBe(false);
    expect(canAccessRecorded(sub('ACTIVE', null), end)).toBe(false);
  });

  test('CANCELLING keeps access until the period ends', () => {
    expect(canAccessRecorded(sub('CANCELLING'), new Date(end.getTime() - DAY))).toBe(true);
    expect(canAccessRecorded(sub('CANCELLING'), end)).toBe(false);
  });

  test('PAST_DUE gets the grace window, read from GRACE_DAYS', () => {
    expect(GRACE_DAYS).toBe(16);
    expect(canAccessRecorded(sub('PAST_DUE', end, 'STRIPE'), new Date(end.getTime() + 15 * DAY + 23 * 3_600_000))).toBe(true);
    expect(canAccessRecorded(sub('PAST_DUE', end, 'STRIPE'), new Date(end.getTime() + 16 * DAY))).toBe(false);
    expect(canAccessRecorded(sub('PAST_DUE'), new Date(end.getTime() + 15 * DAY))).toBe(true); // provider unknown: card rules
  });

  test('bank transfers get no grace', () => {
    expect(canAccessRecorded(sub('PAST_DUE', end, 'BANK_TRANSFER'), new Date(end.getTime() - 1000))).toBe(true);
    expect(canAccessRecorded(sub('PAST_DUE', end, 'BANK_TRANSFER'), end)).toBe(false);
    expect(canAccessRecorded(sub('PAST_DUE', end, 'BANK_TRANSFER'), new Date(end.getTime() + DAY))).toBe(false);
  });

  test('EXPIRED, INCOMPLETE and no subscription are locked', () => {
    expect(canAccessRecorded(sub('EXPIRED'), new Date(end.getTime() - DAY))).toBe(false);
    expect(canAccessRecorded(sub('INCOMPLETE'), new Date(end.getTime() - DAY))).toBe(false);
    expect(canAccessRecorded(null, new Date(0))).toBe(false);
  });

  test('the pending-renewal argument is accepted and does not change the card rules', () => {
    expect(canAccessRecorded(sub('ACTIVE'), end, true)).toBe(false);
  });
});

describe('passed()', () => {
  test('at or above the pass mark', () => {
    expect(passed(70, 70)).toBe(true);
    expect(passed(69, 70)).toBe(false);
    expect(passed(null, 70)).toBe(false);
    expect(passed(0, 0)).toBe(true);
  });
});

// ───────── lessons of a recorded course ─────────

const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const }; // wrote the course
const sam = { id: 'sam', role: 'STUDENT' as const }; // ACTIVE subscriber
const eva = { id: 'eva', role: 'STUDENT' as const }; // only an EXPIRED row
const zed = { id: 'zed', role: 'STUDENT' as const }; // never subscribed
const now = new Date('2026-11-20T10:00:00Z');
const clock = { now: () => now };

class RecordedLessons implements LessonRepository {
  courses: LessonCourse[] = [
    {
      id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: null, status: 'PUBLISHED', createdById: 'lina', type: 'RECORDED', previewLessonId: 'l1',
      modules: [{ id: 'm1', order: 0, titleEn: 'Basics', titleAr: null, descriptionEn: null, descriptionAr: null }],
    },
    { id: 'live', slug: 'arabic', titleEn: 'Arabic', titleAr: null, status: 'PUBLISHED', createdById: 'lina', type: 'LIVE', previewLessonId: null, modules: [{ id: 'm2', order: 0, titleEn: 'M', titleAr: null, descriptionEn: null, descriptionAr: null }] },
  ];
  rows: LessonRecord[] = ['l1', 'l2', 'l3'].map((id, order) => ({
    id, moduleId: 'm1', order, titleEn: `Lesson ${id}`, titleAr: null, bodyEn: `body ${id}`, bodyAr: null, videoUrl: `https://v/${id}`, attachments: [], createdAt: now, updatedAt: now,
  }));
  subs: Array<RecordedSubscription & { courseId: string; userId: string }> = [
    { courseId: 'rc', userId: 'sam', status: 'ACTIVE', currentPeriodEnd: new Date('2026-12-20T00:00:00Z'), provider: 'STRIPE' },
    { courseId: 'rc', userId: 'eva', status: 'EXPIRED', currentPeriodEnd: new Date('2026-10-01T00:00:00Z'), provider: 'STRIPE' },
  ];
  positions = new Map<string, number>();
  done = new Set<string>();
  async findCourse(idOrSlug: string) {
    return this.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async lessonsOfModules(ids: string[]) {
    return this.rows.filter((l) => ids.includes(l.moduleId));
  }
  async find(id: string) {
    return this.rows.find((l) => l.id === id) ?? null;
  }
  async create(_m: string, _d: LessonWriteData & { titleEn: string; order: number }): Promise<LessonRecord> {
    throw new Error('unused');
  }
  async update(_id: string, _d: LessonWriteData): Promise<LessonRecord> {
    throw new Error('unused');
  }
  async delete(id: string) {
    this.rows = this.rows.filter((l) => l.id !== id);
  }
  async setOrder() {}
  async isActiveStudent() {
    return false;
  }
  async teachesCourse() {
    return false;
  }
  async completedLessonIds(userId: string, ids: string[]) {
    return ids.filter((id) => this.done.has(`${userId}:${id}`));
  }
  async setCompleted(userId: string, lessonId: string, completed: boolean) {
    if (completed) this.done.add(`${userId}:${lessonId}`);
    else this.done.delete(`${userId}:${lessonId}`);
  }
  async activeCourseIds() {
    return [];
  }
  async learnerSubscription() {
    return null;
  }
  async courseOfLesson(lessonId: string) {
    return this.rows.some((l) => l.id === lessonId) ? 'rc' : null;
  }
  async recordedSubscription(courseId: string, userId: string) {
    return this.subs.find((s) => s.courseId === courseId && s.userId === userId && s.status !== 'EXPIRED') ?? null;
  }
  async hadSubscription(courseId: string, userId: string) {
    return this.subs.some((s) => s.courseId === courseId && s.userId === userId && hadPaidPeriod(s));
  }
  async videoPosition(userId: string, lessonId: string) {
    return this.positions.get(`${userId}:${lessonId}`) ?? null;
  }
  async setVideoPosition(userId: string, lessonId: string, positionSec: number) {
    this.positions.set(`${userId}:${lessonId}`, positionSec);
  }
}

const lessonSetup = () => {
  const repo = new RecordedLessons();
  return { repo, service: new LessonService(repo, clock) };
};

describe('recorded lessons', () => {
  test('a non-subscriber sees titles and structure, locked, except the preview lesson', async () => {
    const { service } = lessonSetup();
    const out = await service.list('logo-design', zed);
    const lessons = out.modules.flatMap((m) => m.lessons);
    expect(lessons.map((l) => [l.id, 'locked' in l ? l.locked : undefined])).toEqual([['l1', false], ['l2', true], ['l3', true]]);
    const locked = lessons[1]!;
    expect(locked).toMatchObject({ titleEn: 'Lesson l2', completed: false });
    expect(JSON.stringify(locked)).not.toContain('body l2');
    expect(JSON.stringify(locked)).not.toContain('https://v/l2');
    expect(lessons[0]).toMatchObject({ bodyEn: 'body l1', videoUrl: 'https://v/l1' });
    expect(out.progress).toMatchObject({ completed: 0, total: 3 });
  });

  test('a subscriber, the author and an admin see every lesson unlocked', async () => {
    const { service } = lessonSetup();
    for (const who of [sam, lina, admin]) {
      const lessons = (await service.list('logo-design', who)).modules.flatMap((m) => m.lessons);
      expect(lessons.every((l) => !('locked' in l) || l.locked === false)).toBe(true);
      expect(lessons[1]).toMatchObject({ bodyEn: 'body l2' });
    }
  });

  test('a lapsed learner still sees their progress on a locked list', async () => {
    const { repo, service } = lessonSetup();
    repo.done.add('eva:l2');
    const out = await service.list('logo-design', eva);
    expect(out.progress).toMatchObject({ completed: 1, total: 3 });
    expect(out.modules[0]!.lessons.find((l) => l.id === 'l2')).toMatchObject({ locked: true, completed: true });
  });

  test('a dangling preview lesson falls back to the first lesson; its own endpoint is a 404', async () => {
    const { repo, service } = lessonSetup();
    repo.rows = repo.rows.filter((l) => l.id !== 'l1');
    const out = await service.list('logo-design', zed);
    const lessons = out.modules.flatMap((m) => m.lessons);
    expect(lessons.map((l) => [l.id, 'locked' in l ? l.locked : undefined])).toEqual([['l2', false], ['l3', true]]);
    expect(out.course.previewLessonId).toBe('l2');
    expect(await codeOf(service.preview('l1'))).toBe('NOT_FOUND');
    expect(await service.preview('l2')).toMatchObject({ id: 'l2', locked: false });
  });

  test('no preview lesson set: the first lesson in curriculum order (module order, then lesson order) is free', async () => {
    const { repo, service } = lessonSetup();
    const course = repo.courses[0]!;
    course.previewLessonId = null;
    // A second module listed first but ordered after m1, and m1's lessons stored out of order.
    course.modules = [{ id: 'm9', order: 5, titleEn: 'Later', titleAr: null, descriptionEn: null, descriptionAr: null }, ...course.modules];
    repo.rows = [
      { ...repo.rows[0]!, id: 'z1', moduleId: 'm9', order: 0 },
      { ...repo.rows[2]!, order: 2 },
      { ...repo.rows[1]!, order: 1 },
      { ...repo.rows[0]!, order: 0 },
    ];
    const out = await service.list('logo-design', zed);
    expect(out.course.previewLessonId).toBe('l1');
    const unlocked = out.modules.flatMap((m) => m.lessons).filter((l) => 'locked' in l && !l.locked).map((l) => l.id);
    expect(unlocked).toEqual(['l1']);
    expect(await service.preview('l1')).toMatchObject({ id: 'l1', bodyEn: 'body l1' });
    expect(await codeOf(service.preview('z1'))).toBe('NOT_FOUND');
    expect(await codeOf(service.preview('l2'))).toBe('NOT_FOUND');
  });

  test("the teacher's valid choice is kept over the first lesson", async () => {
    const { repo, service } = lessonSetup();
    repo.courses[0]!.previewLessonId = 'l3';
    const out = await service.list('logo-design', zed);
    expect(out.course.previewLessonId).toBe('l3');
    expect(out.modules.flatMap((m) => m.lessons).filter((l) => 'locked' in l && !l.locked).map((l) => l.id)).toEqual(['l3']);
    expect(await codeOf(service.preview('l1'))).toBe('NOT_FOUND');
    expect(await service.preview('l3')).toMatchObject({ id: 'l3' });
  });

  test('reading a locked lesson is 403 PLAN_REQUIRED with the course slug and whether they lapsed', async () => {
    const { service } = lessonSetup();
    const never = await errorOf(service.get('l2', zed));
    expect(never).toMatchObject({ status: 403, code: 'PLAN_REQUIRED', details: { courseSlug: 'logo-design', lapsed: false } });
    const lapsed = await errorOf(service.get('l2', eva));
    expect(lapsed).toMatchObject({ status: 403, code: 'PLAN_REQUIRED', details: { courseSlug: 'logo-design', lapsed: true } });
    expect(await codeOf(service.setCompleted('l2', true, zed))).toBe('PLAN_REQUIRED');
    expect(await codeOf(service.saveVideoPosition('l2', { positionSec: 5 }, zed))).toBe('PLAN_REQUIRED');
  });

  test('an abandoned checkout (INCOMPLETE, never paid) is not a lapsed plan', async () => {
    const { repo, service } = lessonSetup();
    repo.subs.push({ courseId: 'rc', userId: 'abe', status: 'INCOMPLETE', currentPeriodEnd: null, provider: 'STRIPE' });
    const abe = { id: 'abe', role: 'STUDENT' as const };
    expect(await errorOf(service.get('l2', abe))).toMatchObject({ code: 'PLAN_REQUIRED', details: { lapsed: false } });
  });

  test('hadPaidPeriod: a period end or a PAID/REFUNDED payment counts, an unpaid checkout does not', () => {
    expect(hadPaidPeriod({ currentPeriodEnd: null })).toBe(false);
    expect(hadPaidPeriod({ currentPeriodEnd: null, paymentStatuses: ['EXPIRED', 'REJECTED', 'AWAITING_REVIEW'] })).toBe(false);
    expect(hadPaidPeriod({ currentPeriodEnd: end })).toBe(true);
    expect(hadPaidPeriod({ currentPeriodEnd: null, paymentStatuses: ['PAID'] })).toBe(true);
    expect(hadPaidPeriod({ currentPeriodEnd: null, paymentStatuses: ['REFUNDED'] })).toBe(true);
  });

  test('a PAST_DUE subscriber is locked once the grace is over', async () => {
    const { repo, service } = lessonSetup();
    repo.subs.push({ courseId: 'rc', userId: 'pat', status: 'PAST_DUE', currentPeriodEnd: new Date(now.getTime() - 15 * DAY), provider: 'STRIPE' });
    const pat = { id: 'pat', role: 'STUDENT' as const };
    expect((await service.get('l2', pat)).id).toBe('l2');
    repo.subs[2]!.currentPeriodEnd = new Date(now.getTime() - 16 * DAY);
    expect(await codeOf(service.get('l2', pat))).toBe('PLAN_REQUIRED');
  });

  test('the preview lesson is readable without signing in, and only that lesson', async () => {
    const { service } = lessonSetup();
    expect(await service.preview('l1')).toMatchObject({ id: 'l1', bodyEn: 'body l1', courseId: 'rc' });
    expect(await codeOf(service.preview('l2'))).toBe('NOT_FOUND');
    expect(await codeOf(service.preview('nope'))).toBe('NOT_FOUND');
  });

  test('a DRAFT course’s preview lesson is a 404; a PUBLISHED one is readable', async () => {
    const { repo, service } = lessonSetup();
    repo.courses[0]!.status = 'DRAFT';
    expect(await codeOf(service.preview('l1'))).toBe('NOT_FOUND');
    repo.courses[0]!.status = 'PUBLISHED';
    expect((await service.preview('l1')).id).toBe('l1');
  });

  test('an unpublished recorded course is a 404 for a non-subscriber and leaks no lesson', async () => {
    const { repo, service } = lessonSetup();
    repo.courses[0]!.status = 'DRAFT';
    const err = await errorOf(service.list('logo-design', zed));
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(JSON.stringify(err)).not.toContain('body l1');
    expect((await service.list('logo-design', lina)).modules[0]!.lessons).toHaveLength(3); // the author still sees it
  });

  test('a video position round-trips and rides on the lesson payload', async () => {
    const { service } = lessonSetup();
    expect((await service.get('l2', sam)).videoPositionSec).toBe(0);
    expect(await service.saveVideoPosition('l2', { positionSec: 125 }, sam)).toEqual({ lessonId: 'l2', positionSec: 125 });
    expect((await service.get('l2', sam)).videoPositionSec).toBe(125);
    expect((await service.get('l2', admin)).videoPositionSec).toBe(0); // per user
    await service.saveVideoPosition('l2', { positionSec: 40 }, sam);
    expect((await service.get('l2', sam)).videoPositionSec).toBe(40);
  });

  test('completion survives a lapsed plan', async () => {
    const { repo, service } = lessonSetup();
    repo.done.add('eva:l1');
    await service.list('logo-design', eva);
    expect(repo.done.has('eva:l1')).toBe(true);
  });

  test('live courses keep the enrollment rule', async () => {
    const { service } = lessonSetup();
    expect(await codeOf(service.list('arabic', zed))).toBe('FORBIDDEN');
  });
});

// ───────── course-level quizzes ─────────

const questions: QuizQuestionInput[] = [
  { type: 'SINGLE', promptEn: 'Capital?', points: 2, options: [{ textEn: 'Dubai', correct: false }, { textEn: 'Abu Dhabi', correct: true }] },
  { type: 'TRUE_FALSE', promptEn: 'Kerning is spacing', points: 2, options: [{ textEn: 'True', correct: true }, { textEn: 'False', correct: false }] },
];

type StoredQuestionList = QuizRecord['questions'];

class CourseQuizzes implements QuizRepository {
  quizzes: QuizRecord[] = [];
  attemptRows: AttemptRecord[] = [];
  private seq = 0;
  courses: Record<string, CourseRef> = {
    rc: { id: 'rc', slug: 'logo-design', type: 'RECORDED', status: 'DRAFT', createdById: 'lina' },
    live: { id: 'live', slug: 'arabic', type: 'LIVE', status: 'DRAFT', createdById: 'lina' },
  };
  subs: Array<RecordedSubscription & { userId: string }> = [
    { userId: 'sam', status: 'ACTIVE', currentPeriodEnd: new Date('2026-12-20T00:00:00Z'), provider: 'STRIPE' },
    { userId: 'eva', status: 'EXPIRED', currentPeriodEnd: new Date('2026-10-01T00:00:00Z'), provider: 'STRIPE' },
  ];
  async batch(): Promise<QuizBatch | null> {
    return null;
  }
  async course(idOrSlug: string) {
    return Object.values(this.courses).find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async recordedSubscription(_courseId: string, userId: string) {
    return this.subs.find((s) => s.userId === userId && s.status !== 'EXPIRED') ?? null;
  }
  async hadSubscription(_courseId: string, userId: string) {
    return this.subs.some((s) => s.userId === userId && hadPaidPeriod(s));
  }
  async moduleInCourse(moduleId: string, courseId: string) {
    return courseId === 'rc' && moduleId === 'm1';
  }
  async listByBatch(batchId: string, publishedOnly: boolean) {
    return this.quizzes.filter((q) => q.batchId === batchId && (!publishedOnly || q.status === 'PUBLISHED'));
  }
  async listByCourse(courseId: string, publishedOnly: boolean) {
    return this.quizzes.filter((q) => q.courseId === courseId && (!publishedOnly || q.status === 'PUBLISHED'));
  }
  async find(id: string) {
    return this.quizzes.find((q) => q.id === id) ?? null;
  }
  async create(batchId: string, d: QuizWriteData & { title: string; questions: StoredQuestionList }) {
    return this.insert({ batchId, courseId: null }, d);
  }
  async createForCourse(courseId: string, d: QuizWriteData & { title: string; questions: StoredQuestionList }) {
    return this.insert({ batchId: null, courseId }, d);
  }
  private async insert(scope: { batchId: string | null; courseId: string | null }, d: QuizWriteData & { title: string; questions: StoredQuestionList }) {
    const row: QuizRecord = {
      id: `quiz${++this.seq}`, moduleId: null, description: '', status: 'DRAFT', dueAt: null, timeLimitMin: null, maxAttempts: 1, passPercent: 70,
      publishedAt: null, createdAt: now, updatedAt: now, ...scope, ...d,
    };
    this.quizzes.push(row);
    return row;
  }
  async update(id: string, d: QuizWriteData) {
    const row = this.quizzes.find((q) => q.id === id)!;
    Object.assign(row, d);
    return row;
  }
  async delete(id: string) {
    this.quizzes = this.quizzes.filter((q) => q.id !== id);
  }
  async attempts(quizId: string, userId?: string) {
    return this.attemptRows.filter((a) => a.quizId === quizId && (!userId || a.userId === userId)).map((a) => ({ ...a }));
  }
  async attemptsOf(userId: string, quizIds: string[]) {
    return this.attemptRows.filter((a) => a.userId === userId && quizIds.includes(a.quizId)).map((a) => ({ ...a }));
  }
  async attemptUsers(quizId: string): Promise<StudentRef[]> {
    return [...new Set(this.attemptRows.filter((a) => a.quizId === quizId).map((a) => a.userId))].map((id) => ({ id, name: id, email: `${id}@test`, image: null }));
  }
  async createAttempt(d: { quizId: string; userId: string; number: number; startedAt: Date }) {
    const a: AttemptRecord = { id: `att${++this.seq}`, ...d, submittedAt: null, answers: {}, results: [], score: null, maxScore: 0, timedOut: false };
    this.attemptRows.push(a);
    return { ...a };
  }
  async finishAttempt(id: string, d: Pick<AttemptRecord, 'submittedAt' | 'answers' | 'results' | 'score' | 'maxScore' | 'timedOut'>) {
    const a = this.attemptRows.find((x) => x.id === id)!;
    Object.assign(a, d);
    return { ...a };
  }
  async activeStudents(): Promise<StudentRef[]> {
    return [];
  }
  async publishedForStudent() {
    return [];
  }
}

function quizSetup() {
  const repo = new CourseQuizzes();
  const notifier = new RecordingNotifier();
  const access = new BatchAccessPolicy({ teacherOf: async (id) => (id === 'b1' ? 'lina' : null), enrollmentStatus: async () => null });
  const service = new QuizService(repo, access, notifier, clock);
  return { repo, service, notifier };
}

const perfect = (quiz: QuizRecord) => Object.fromEntries(quiz.questions.map((q) => [q.id, q.options.filter((o) => o.correct).map((o) => o.id)]));
const allWrong = (quiz: QuizRecord) => Object.fromEntries(quiz.questions.map((q) => [q.id, [q.options.find((o) => !o.correct)!.id]]));

async function publishedCourseQuiz(s: ReturnType<typeof quizSetup>, extra: Record<string, unknown> = {}) {
  const quiz = await s.service.createInCourse('rc', quizInput.parse({ title: 'Module 1 check', questions, ...extra }), admin);
  await s.service.publishInCourse('rc', quiz.id, admin);
  return quiz;
}

describe('course-level quizzes', () => {
  test('editors create them on recorded courses only; attempts are unlimited and there is no due date', async () => {
    const s = quizSetup();
    const input = quizInput.parse({ title: 'Module 1 check', questions, maxAttempts: 3, dueAt: '2026-12-01T00:00:00.000Z' });
    const quiz = await s.service.createInCourse('rc', input, lina);
    expect(quiz).toMatchObject({ courseId: 'rc', batchId: null, dueAt: null, passPercent: 70, status: 'DRAFT' });
    expect(await codeOf(s.service.createInCourse('live', input, admin))).toBe('NOT_RECORDED_COURSE');
    expect(await codeOf(s.service.createInCourse('rc', input, sam))).toBe('FORBIDDEN');
    expect(await codeOf(s.service.createInCourse('rc', { ...input, moduleId: 'm9' }, admin))).toBe('MODULE_NOT_IN_COURSE');
    expect(await codeOf(s.service.createInCourse('nope', input, admin))).toBe('NOT_FOUND');
  });

  test('the pass mark can be set on creation and edited on a course quiz and a batch quiz', async () => {
    const s = quizSetup();
    const quiz = await s.service.createInCourse('rc', quizInput.parse({ title: 'Module 1 check', questions, passPercent: 80 }), admin);
    expect(quiz.passPercent).toBe(80);
    expect((await s.service.updateInCourse('rc', quiz.id, { passPercent: 60 }, admin)).passPercent).toBe(60);
    const batchQuiz = await s.service.create('b1', quizInput.parse({ title: 'Batch quiz', questions }), lina);
    expect(batchQuiz.passPercent).toBe(70);
    expect((await s.service.update('b1', batchQuiz.id, { passPercent: 55 }, lina)).passPercent).toBe(55);
  });

  test('a subscriber can take a 3rd attempt and the best score decides the pass', async () => {
    const s = quizSetup();
    const quiz = await publishedCourseQuiz(s);
    const first = await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sam);
    expect(first.progress).toMatchObject({ attemptsUsed: 1, attemptsLeft: null, canStart: true, bestPercent: 0, passed: false });
    await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sam);
    const third = await s.service.submit(quiz.id, { answers: perfect(quiz) }, sam);
    expect(third.result.number).toBe(3);
    expect(third.progress).toMatchObject({ attemptsUsed: 3, bestPercent: 100, passed: true, canStart: true });
    const fourth = await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sam);
    expect(fourth.progress).toMatchObject({ attemptsUsed: 4, bestPercent: 100, passed: true }); // the best one stands
    expect(JSON.stringify(fourth)).not.toContain('"correct"'); // answers stay hidden
  });

  test('the list holds published quizzes with the viewer’s best score; staff see drafts too', async () => {
    const s = quizSetup();
    const quiz = await publishedCourseQuiz(s);
    await s.service.createInCourse('rc', quizInput.parse({ title: 'Draft', questions }), admin);
    await s.service.submit(quiz.id, { answers: perfect(quiz) }, sam);
    const mine = (await s.service.listInCourse('rc', sam)).items as Array<{ title: string; mine: { bestPercent: number | null; passed: boolean } }>;
    expect(mine.map((q) => q.title)).toEqual(['Module 1 check']);
    expect(mine[0]!.mine).toMatchObject({ bestPercent: 100, passed: true });
    expect((await s.service.listInCourse('rc', lina)).items).toHaveLength(2);
  });

  test('access goes through the course: no plan is 403 PLAN_REQUIRED, staff cannot take quizzes', async () => {
    const s = quizSetup();
    const quiz = await publishedCourseQuiz(s);
    expect(await errorOf(s.service.start(quiz.id, zed))).toMatchObject({ status: 403, code: 'PLAN_REQUIRED', details: { courseSlug: 'logo-design', lapsed: false } });
    expect(await errorOf(s.service.submit(quiz.id, { answers: {} }, eva))).toMatchObject({ code: 'PLAN_REQUIRED', details: { lapsed: true } });
    expect(await codeOf(s.service.listInCourse('rc', zed))).toBe('PLAN_REQUIRED');
    expect(await codeOf(s.service.start(quiz.id, admin))).toBe('FORBIDDEN');
    expect(JSON.stringify(await s.service.get(quiz.id, sam))).not.toContain('"correct"');
    expect(JSON.stringify(await s.service.get(quiz.id, lina))).toContain('"correct":true');
  });

  test('a draft is invisible to learners; staff results cover the people who attempted', async () => {
    const s = quizSetup();
    const draft = await s.service.createInCourse('rc', quizInput.parse({ title: 'Draft', questions }), admin);
    expect(await codeOf(s.service.get(draft.id, sam))).toBe('NOT_FOUND');
    const quiz = await publishedCourseQuiz(s);
    await s.service.submit(quiz.id, { answers: perfect(quiz) }, sam);
    const results = await s.service.results(quiz.id, lina);
    expect(results.students).toHaveLength(1);
    expect(results.students[0]).toMatchObject({ attempts: 1, bestPercent: 100 });
    expect(await codeOf(s.service.results(quiz.id, sam))).toBe('FORBIDDEN');
  });

  test('a course quiz is not reachable through the batch routes', async () => {
    const s = quizSetup();
    const quiz = await publishedCourseQuiz(s);
    expect(await codeOf(s.service.update('b1', quiz.id, { title: 'x' }, lina))).toBe('NOT_FOUND');
  });
});

describe('pickSubscription', () => {
  const row = (status: RecordedSubscription['status'], createdAt: string) => ({ status, currentPeriodEnd: end, provider: 'STRIPE' as const, createdAt: new Date(createdAt) });

  test('an ACTIVE row beats a newer INCOMPLETE one, so a failed second checkout cannot lock a subscriber out', () => {
    const picked = pickSubscription([row('INCOMPLETE', '2026-11-19T00:00:00Z'), row('ACTIVE', '2026-10-01T00:00:00Z')]);
    expect(picked?.status).toBe('ACTIVE');
    expect(canAccessRecorded(picked, new Date(end.getTime() - DAY))).toBe(true);
  });

  test('among access-granting rows the newest wins; EXPIRED is skipped; nothing gives null', () => {
    expect(pickSubscription([row('PAST_DUE', '2026-09-01T00:00:00Z'), row('CANCELLING', '2026-10-01T00:00:00Z')])?.status).toBe('CANCELLING');
    expect(pickSubscription([row('EXPIRED', '2026-10-01T00:00:00Z'), row('INCOMPLETE', '2026-09-01T00:00:00Z')])?.status).toBe('INCOMPLETE');
    expect(pickSubscription([row('EXPIRED', '2026-10-01T00:00:00Z')])).toBeNull();
  });
});
