import { describe, expect, test } from 'bun:test';
import { quizInput, quizQuestionInput, type QuizQuestionInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { BatchAccessPolicy, type BatchAccessRepository } from '../src/modules/batches/batch-access';
import type { LessonCourse, LessonRecord, LessonRepository, LessonWriteData } from '../src/modules/lessons/lesson.repository';
import { LessonService } from '../src/modules/lessons/lesson.service';
import { gradeQuestion, gradeQuiz, normalizeQuestions, type StoredQuestion } from '../src/modules/quizzes/quiz-grader';
import type { AttemptRecord, QuizBatch, QuizRecord, QuizRepository, QuizWriteData, StudentRef } from '../src/modules/quizzes/quiz.repository';
import { QuizService, SUBMIT_GRACE_MS } from '../src/modules/quizzes/quiz.service';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);

const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const }; // teaches batch b1
const omar = { id: 'omar', role: 'TEACHER' as const };
const sara = { id: 'sara', role: 'STUDENT' as const }; // ACTIVE in b1
const mariam = { id: 'mariam', role: 'STUDENT' as const }; // ACTIVE in b1
const nadia = { id: 'nadia', role: 'STUDENT' as const }; // VERIFYING in b1 (not ACTIVE)

// ───────── grading ─────────

const q = (type: StoredQuestion['type'], correct: number[], n = 4, points = 2): StoredQuestion => ({
  id: 'q',
  type,
  promptEn: 'Q',
  promptAr: null,
  points,
  options: Array.from({ length: n }, (_, i) => ({ id: `o${i}`, textEn: `O${i}`, textAr: null, correct: correct.includes(i) })),
});

describe('grading', () => {
  test('single choice: full points only for exactly the correct option', () => {
    const single = q('SINGLE', [1]);
    expect(gradeQuestion(single, ['o1'])).toEqual({ questionId: 'q', correct: true, earned: 2, points: 2 });
    expect(gradeQuestion(single, ['o0']).earned).toBe(0);
    expect(gradeQuestion(single, ['o1', 'o0']).earned).toBe(0); // two picks on a single-choice question
    expect(gradeQuestion(single, []).earned).toBe(0);
    expect(gradeQuestion(single, ['o1', 'o1']).correct).toBe(true); // duplicates count once
  });

  test('true/false', () => {
    const tf = q('TRUE_FALSE', [0], 2, 1);
    expect(gradeQuestion(tf, ['o0']).correct).toBe(true);
    expect(gradeQuestion(tf, ['o1']).earned).toBe(0);
    expect(gradeQuestion(tf, ['nope']).earned).toBe(0); // unknown ids ignored
  });

  test('multiple choice: partial credit = points × max(0, (right − wrong) / correct options)', () => {
    const multi = q('MULTIPLE', [0, 1, 2], 4, 3);
    expect(gradeQuestion(multi, ['o0', 'o1', 'o2'])).toMatchObject({ correct: true, earned: 3 });
    expect(gradeQuestion(multi, ['o0', 'o1'])).toMatchObject({ correct: false, earned: 2 });
    expect(gradeQuestion(multi, ['o0', 'o1', 'o3']).earned).toBe(1); // 2 right − 1 wrong
    expect(gradeQuestion(multi, ['o0', 'o1', 'o2', 'o3']).earned).toBe(2); // ticking everything never pays full
    expect(gradeQuestion(multi, ['o3']).earned).toBe(0); // floor 0
    expect(gradeQuestion(q('MULTIPLE', [0, 1, 2], 4, 1), ['o0']).earned).toBe(0.33); // rounded to 2 decimals
  });

  test('a whole quiz sums earned points', () => {
    const qs = normalizeQuestions([
      { type: 'SINGLE', promptEn: 'a', points: 2, options: [{ textEn: 'x', correct: true }, { textEn: 'y', correct: false }] },
      { type: 'MULTIPLE', promptEn: 'b', points: 4, options: [{ textEn: 'x', correct: true }, { textEn: 'y', correct: true }, { textEn: 'z', correct: false }] },
    ]);
    const [a, b] = qs as [StoredQuestion, StoredQuestion];
    const graded = gradeQuiz(qs, { [a.id]: [a.options[0]!.id], [b.id]: [b.options[0]!.id] });
    expect(graded).toMatchObject({ score: 4, maxScore: 6 });
    expect(graded.results.map((r) => r.correct)).toEqual([true, false]);
  });

  test('question input rules', () => {
    const base = { promptEn: 'p', options: [{ textEn: 'a', correct: true }, { textEn: 'b', correct: true }] };
    expect(quizQuestionInput.safeParse({ ...base, type: 'SINGLE' }).success).toBe(false); // two correct
    expect(quizQuestionInput.safeParse({ ...base, type: 'MULTIPLE' }).success).toBe(true);
    expect(quizQuestionInput.safeParse({ type: 'TRUE_FALSE', promptEn: 'p', options: [{ textEn: 'T', correct: true }, { textEn: 'F' }, { textEn: '?' }] }).success).toBe(false);
  });

  test('normalizing keeps given ids and fills in missing or duplicate ones', () => {
    const [x, y] = normalizeQuestions([
      { id: 'keep', type: 'SINGLE', promptEn: 'a', points: 1, options: [{ id: 'o', textEn: 'x', correct: true }, { id: 'o', textEn: 'y', correct: false }] },
      { id: 'keep', type: 'SINGLE', promptEn: 'b', points: 1, options: [{ textEn: 'x', correct: true }, { textEn: 'y', correct: false }] },
    ]) as [StoredQuestion, StoredQuestion];
    expect(x.id).toBe('keep');
    expect(y.id).not.toBe('keep');
    expect(x.options[0]!.id).toBe('o');
    expect(x.options[1]!.id).not.toBe('o');
  });
});

// ───────── quiz service with in-memory repos ─────────

class Access implements BatchAccessRepository {
  async teacherOf(batchId: string) {
    return batchId === 'b1' ? 'lina' : batchId === 'b2' ? 'omar' : null;
  }
  async enrollmentStatus(userId: string, batchId: string) {
    if (batchId !== 'b1') return null;
    return userId === 'sara' || userId === 'mariam' ? ('ACTIVE' as const) : userId === 'nadia' ? ('VERIFYING' as const) : null;
  }
}

class InMemoryQuizzes implements QuizRepository {
  quizzes: QuizRecord[] = [];
  attemptRows: AttemptRecord[] = [];
  private seq = 0;
  constructor(private readonly now: () => Date) {}
  private batches: Record<string, QuizBatch> = {
    b1: { id: 'b1', code: 'B07', courseId: 'c1', course: { id: 'c1', slug: 'pdf', titleEn: 'Product Design', titleAr: null } },
    b2: { id: 'b2', code: 'B02', courseId: 'c2', course: { id: 'c2', slug: 'ar', titleEn: 'Spoken Arabic', titleAr: null } },
  };
  async batch(id: string) {
    return this.batches[id] ?? null;
  }
  // Course (recorded) quizzes are covered in recorded-access.test.ts; these satisfy the interface.
  async course() {
    return null;
  }
  async recordedSubscription() {
    return null;
  }
  async hadSubscription() {
    return false;
  }
  async listByCourse() {
    return [];
  }
  async createForCourse(): Promise<QuizRecord> {
    throw new Error('not a batch quiz repository operation');
  }
  async attemptUsers(): Promise<StudentRef[]> {
    return [];
  }
  async moduleInCourse(moduleId: string, courseId: string) {
    return courseId === 'c1' && moduleId === 'm1';
  }
  async listByBatch(batchId: string, publishedOnly: boolean) {
    return this.quizzes.filter((q) => q.batchId === batchId && (!publishedOnly || q.status === 'PUBLISHED'));
  }
  async find(id: string) {
    return this.quizzes.find((q) => q.id === id) ?? null;
  }
  async create(batchId: string, d: QuizWriteData & { title: string; questions: StoredQuestion[] }) {
    const row: QuizRecord = {
      id: `quiz${++this.seq}`, batchId, courseId: null, passPercent: 70, moduleId: null, description: '', status: 'DRAFT', dueAt: null, timeLimitMin: null, maxAttempts: 1,
      publishedAt: null, createdAt: this.now(), updatedAt: this.now(), ...d,
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
  async activeStudents(batchId: string): Promise<StudentRef[]> {
    return batchId === 'b1' ? ['mariam', 'sara'].map((id) => ({ id, name: id, email: `${id}@test`, image: null })) : [];
  }
  async publishedForStudent(userId: string) {
    if (userId !== 'sara' && userId !== 'mariam') return [];
    return this.quizzes.filter((q) => q.batchId === 'b1' && q.status === 'PUBLISHED').map((q) => ({ ...q, batch: this.batches.b1! }));
  }
}

function setup(start = new Date('2026-11-06T10:00:00Z')) {
  let now = start;
  const clock = { now: () => now };
  const repo = new InMemoryQuizzes(() => now);
  const notifier = new RecordingNotifier();
  const service = new QuizService(repo, new BatchAccessPolicy(new Access()), notifier, clock);
  return { service, repo, notifier, advance: (ms: number) => (now = new Date(now.getTime() + ms)), at: () => now };
}

const questions: QuizQuestionInput[] = [
  { type: 'SINGLE', promptEn: 'Capital of the UAE?', points: 2, options: [{ textEn: 'Dubai', correct: false }, { textEn: 'Abu Dhabi', correct: true }] },
  { type: 'TRUE_FALSE', promptEn: 'Kerning is letter spacing', points: 1, options: [{ textEn: 'True', correct: true }, { textEn: 'False', correct: false }] },
  {
    type: 'MULTIPLE', promptEn: 'Primary colours', points: 3,
    options: [{ textEn: 'Red', correct: true }, { textEn: 'Blue', correct: true }, { textEn: 'Yellow', correct: true }, { textEn: 'Green', correct: false }],
  },
];

async function publishedQuiz(s: ReturnType<typeof setup>, extra: Partial<Parameters<typeof quizInput.parse>[0]> = {}) {
  const quiz = await s.service.create('b1', quizInput.parse({ title: 'Week 1 check', questions, ...extra }), lina);
  await s.service.publish('b1', quiz.id, lina);
  return quiz;
}

type StudentView = Awaited<ReturnType<QuizService['start']>>;
/** `get` as a student (the staff shape is the other half of its union). */
const asStudent = (s: ReturnType<typeof setup>, id: string, who: typeof sara) => s.service.get(id, who) as Promise<StudentView>;

/** Answers picking the correct option(s) for every question. */
const perfect = (quiz: QuizRecord) => Object.fromEntries(quiz.questions.map((q) => [q.id, q.options.filter((o) => o.correct).map((o) => o.id)]));
const allWrong = (quiz: QuizRecord) => Object.fromEntries(quiz.questions.map((q) => [q.id, [q.options.find((o) => !o.correct)!.id]]));

describe('quiz access gating', () => {
  test('only the batch teacher and admins author; students cannot', async () => {
    const s = setup();
    const input = quizInput.parse({ title: 'Quiz', questions });
    expect(await codeOf(s.service.create('b1', input, omar))).toBe('FORBIDDEN');
    expect(await codeOf(s.service.create('b1', input, sara))).toBe('FORBIDDEN');
    expect((await s.service.create('b1', input, admin)).status).toBe('DRAFT');
    expect(await codeOf(s.service.create('b1', { ...input, moduleId: 'm9' }, lina))).toBe('MODULE_NOT_IN_COURSE');
    expect((await s.service.create('b1', { ...input, moduleId: 'm1' }, lina)).moduleId).toBe('m1');
    expect(await codeOf(s.service.create('nope', input, admin))).toBe('NOT_FOUND');
  });

  test('students only see published quizzes, and only with an ACTIVE enrollment', async () => {
    const s = setup();
    const draft = await s.service.create('b1', quizInput.parse({ title: 'Draft', questions }), lina);
    await publishedQuiz(s);
    expect((await s.service.list('b1', sara)).items.map((q) => q.title)).toEqual(['Week 1 check']);
    expect((await s.service.list('b1', lina)).items).toHaveLength(2);
    expect(await codeOf(s.service.get(draft.id, sara))).toBe('NOT_FOUND');
    expect(await codeOf(s.service.start(draft.id, sara))).toBe('NOT_FOUND');
    expect(await codeOf(s.service.list('b1', nadia))).toBe('FORBIDDEN');
    expect(await codeOf(s.service.get(draft.id, omar))).toBe('FORBIDDEN');
    expect((await s.service.mine(sara)).items).toHaveLength(1);
    expect((await s.service.mine(nadia)).items).toHaveLength(0);
  });

  test('results are for staff only; teachers cannot take quizzes', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s);
    expect(await codeOf(s.service.results(quiz.id, sara))).toBe('FORBIDDEN');
    expect(await codeOf(s.service.start(quiz.id, lina))).toBe('FORBIDDEN');
  });

  test('publishing needs a question and notifies the ACTIVE students', async () => {
    const s = setup();
    const empty = await s.service.create('b1', quizInput.parse({ title: 'Empty' }), lina);
    expect(await codeOf(s.service.publish('b1', empty.id, lina))).toBe('QUIZ_EMPTY');
    const quiz = await publishedQuiz(s);
    expect(s.notifier.sent).toHaveLength(1);
    expect(s.notifier.sent[0]).toMatchObject({ userIds: ['mariam', 'sara'], notice: { type: 'QUIZ_PUBLISHED', data: { quizId: quiz.id, batchId: 'b1' } } });
    expect(await codeOf(s.service.publish('b1', quiz.id, lina))).toBe('ALREADY_PUBLISHED');
    expect(await codeOf(s.service.publish('b2', quiz.id, omar))).toBe('NOT_FOUND'); // quiz of another batch
  });
});

describe('answer hiding', () => {
  test('students never receive the correct flags before they may see them', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { maxAttempts: 2 });
    const view = await asStudent(s, quiz.id, sara);
    expect(JSON.stringify(view)).not.toContain('"correct"');
    expect(view.reveal).toBe(false);
    expect('answerKey' in view).toBe(false);

    const first = await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sara);
    expect(first.result.score).toBe(0);
    expect(first.reveal).toBe(false);
    expect(JSON.stringify(first)).not.toContain('"correct"'); // no per-question correctness yet (it would leak true/false)
    expect('questions' in first.result).toBe(false);

    // Staff see everything.
    expect(JSON.stringify(await s.service.get(quiz.id, lina))).toContain('"correct":true');
  });

  test('answers show once the attempts are used up', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s);
    const res = await s.service.submit(quiz.id, { answers: perfect(quiz) }, sara);
    expect(res.reveal).toBe(true);
    expect(res.result).toMatchObject({ score: 6, maxScore: 6, percent: 100 });
    expect(res.result.questions?.every((q) => q.correct)).toBe(true);
    expect(res.answerKey?.[quiz.questions[0]!.id]).toEqual([quiz.questions[0]!.options[1]!.id]);
    // Another student with attempts left still sees nothing.
    expect((await asStudent(s, quiz.id, mariam)).reveal).toBe(false);
  });

  test('answers show to everyone after the due date', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { maxAttempts: 3, dueAt: '2026-11-07T10:00:00.000Z' });
    expect((await asStudent(s, quiz.id, mariam)).reveal).toBe(false);
    s.advance(25 * 3600_000);
    const view = await asStudent(s, quiz.id, mariam);
    expect(view.reveal).toBe(true);
    expect(view.progress.status).toBe('MISSED');
    expect(await codeOf(s.service.start(quiz.id, mariam))).toBe('QUIZ_CLOSED');
  });
});

describe('attempt limit', () => {
  test('a student gets maxAttempts tries (default 1)', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s);
    await s.service.submit(quiz.id, { answers: perfect(quiz) }, sara);
    expect(await codeOf(s.service.start(quiz.id, sara))).toBe('NO_ATTEMPTS_LEFT');
    expect(await codeOf(s.service.submit(quiz.id, { answers: perfect(quiz) }, sara))).toBe('NO_ATTEMPTS_LEFT');
  });

  test('best score across attempts; start is idempotent while an attempt is open', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { maxAttempts: 2 });
    const a = await s.service.start(quiz.id, sara);
    const b = await s.service.start(quiz.id, sara);
    expect(b.openAttempt?.id).toBe(a.openAttempt!.id);
    await s.service.submit(quiz.id, { answers: perfect(quiz) }, sara);
    const second = await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sara);
    expect(second.result.number).toBe(2);
    expect(second.progress).toMatchObject({ attemptsUsed: 2, attemptsLeft: 0, bestScore: 6, bestPercent: 100, status: 'SUBMITTED', canStart: false });
    expect(await codeOf(s.service.start(quiz.id, sara))).toBe('NO_ATTEMPTS_LEFT');
    expect((await s.service.mine(sara)).items[0]!.mine.bestScore).toBe(6);
  });

  test('questions lock once anyone has started', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s);
    await s.service.start(quiz.id, sara);
    expect(await codeOf(s.service.update('b1', quiz.id, { questions }, lina))).toBe('QUIZ_HAS_ATTEMPTS');
    expect((await s.service.update('b1', quiz.id, { title: 'Renamed' }, lina)).title).toBe('Renamed');
  });
});

describe('time limit', () => {
  test('a timed quiz must be started first', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { timeLimitMin: 10 });
    expect(await codeOf(s.service.submit(quiz.id, { answers: perfect(quiz) }, sara))).toBe('ATTEMPT_NOT_STARTED');
  });

  test('submissions inside the limit plus the grace are graded', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { timeLimitMin: 10 });
    const started = await s.service.start(quiz.id, sara);
    expect(started.openAttempt?.deadline?.toISOString()).toBe('2026-11-06T10:10:00.000Z');
    s.advance(10 * 60_000 + SUBMIT_GRACE_MS - 1000);
    expect((await s.service.submit(quiz.id, { answers: perfect(quiz) }, sara)).result.score).toBe(6);
  });

  test('late submissions are refused and the attempt is recorded as 0', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { timeLimitMin: 10, maxAttempts: 2 });
    await s.service.start(quiz.id, sara);
    s.advance(10 * 60_000 + SUBMIT_GRACE_MS + 1000);
    expect(await codeOf(s.service.submit(quiz.id, { answers: perfect(quiz) }, sara))).toBe('QUIZ_TIME_UP');
    const view = await asStudent(s, quiz.id, sara);
    expect(view.attempts).toEqual([expect.objectContaining({ score: 0, timedOut: true })]);
    expect(view.progress).toMatchObject({ attemptsUsed: 1, attemptsLeft: 1 });
  });

  test('an abandoned attempt is closed when the student comes back', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { timeLimitMin: 5, maxAttempts: 2 });
    await s.service.start(quiz.id, sara);
    s.advance(60 * 60_000);
    const next = await s.service.start(quiz.id, sara);
    expect(next.attempts[0]).toMatchObject({ timedOut: true, score: 0 });
    expect(next.openAttempt?.number).toBe(2);
  });

  test('the due date caps the time limit', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { timeLimitMin: 60, dueAt: '2026-11-06T10:05:00.000Z' });
    const started = await s.service.start(quiz.id, sara);
    expect(started.openAttempt?.deadline?.toISOString()).toBe('2026-11-06T10:05:00.000Z');
  });
});

describe('results', () => {
  test('best score per student and per-question correctness rates', async () => {
    const s = setup();
    const quiz = await publishedQuiz(s, { maxAttempts: 2 });
    await s.service.submit(quiz.id, { answers: allWrong(quiz) }, sara);
    await s.service.submit(quiz.id, { answers: perfect(quiz) }, sara);
    const [single] = quiz.questions;
    await s.service.submit(quiz.id, { answers: { [single!.id]: [single!.options[1]!.id] } }, mariam);
    const r = await s.service.results(quiz.id, lina);
    expect(r.summary).toEqual({ students: 2, submitted: 2, averagePercent: Math.round((100 + 33) / 2) });
    expect(r.students.find((x) => x.user.id === 'sara')).toMatchObject({ attempts: 2, bestScore: 6, bestPercent: 100 });
    expect(r.students.find((x) => x.user.id === 'mariam')).toMatchObject({ attempts: 1, bestScore: 2 });
    expect(r.questions.map((q) => q.rate)).toEqual([1, 0.5, 0.5]);
  });
});

// ───────── lessons ─────────

class InMemoryLessons implements LessonRepository {
  courses: LessonCourse[] = [
    {
      id: 'c1', slug: 'pdf', titleEn: 'Product Design', titleAr: null, status: 'DRAFT', createdById: 'lina', type: 'LIVE', previewLessonId: null,
      modules: [{ id: 'm1', order: 0, titleEn: 'Basics', titleAr: null, descriptionEn: null, descriptionAr: null }],
    },
  ];
  rows: LessonRecord[] = [];
  private seq = 0;
  async findCourse(idOrSlug: string) {
    return this.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async lessonsOfModules(ids: string[]) {
    return this.rows.filter((l) => ids.includes(l.moduleId)).sort((a, b) => a.order - b.order);
  }
  async find(id: string) {
    return this.rows.find((l) => l.id === id) ?? null;
  }
  async create(moduleId: string, d: LessonWriteData & { titleEn: string; order: number }) {
    const row: LessonRecord = {
      id: `l${++this.seq}`, moduleId, titleAr: null, bodyEn: '', bodyAr: null, videoUrl: null, attachments: [], createdAt: new Date(), updatedAt: new Date(), ...d,
    };
    this.rows.push(row);
    return row;
  }
  async update(id: string, d: LessonWriteData) {
    const row = this.rows.find((l) => l.id === id)!;
    Object.assign(row, d);
    return row;
  }
  async delete(id: string) {
    this.rows = this.rows.filter((l) => l.id !== id);
  }
  async setOrder(ids: string[]) {
    ids.forEach((id, order) => (this.rows.find((l) => l.id === id)!.order = order));
  }
  async isActiveStudent(courseId: string, userId: string) {
    return courseId === 'c1' && userId === 'sara';
  }
  async teachesCourse(courseId: string, userId: string) {
    return courseId === 'c1' && userId === 'omar';
  }
  done = new Set<string>();
  async completedLessonIds(userId: string, ids: string[]) {
    return ids.filter((id) => this.done.has(`${userId}:${id}`));
  }
  async setCompleted(userId: string, lessonId: string, completed: boolean) {
    if (completed) this.done.add(`${userId}:${lessonId}`);
    else this.done.delete(`${userId}:${lessonId}`);
  }
  async activeCourseIds(userId: string) {
    return userId === 'sara' ? ['c1'] : [];
  }
  async learnerSubscription() {
    return null;
  }
  async courseOfLesson(lessonId: string) {
    return this.rows.some((l) => l.id === lessonId) ? 'c1' : null;
  }
  // Recorded-course access is covered in recorded-access.test.ts; these satisfy the interface.
  async recordedSubscription() {
    return null;
  }
  async hadSubscription() {
    return false;
  }
  async videoPosition() {
    return null;
  }
  async setVideoPosition() {}
}

describe('lessons', () => {
  const input = { titleEn: 'Grids', bodyEn: '# Grids', attachments: [] };

  test('the proposing teacher edits while DRAFT / PENDING_REVIEW; admins always', async () => {
    const repo = new InMemoryLessons();
    const service = new LessonService(repo);
    const l1 = await service.create('c1', 'm1', input, lina);
    await service.create('c1', 'm1', { ...input, titleEn: 'Type' }, admin);
    expect(await codeOf(service.create('c1', 'm1', input, omar))).toBe('FORBIDDEN');
    expect(await codeOf(service.create('c1', 'm1', input, sara))).toBe('FORBIDDEN');
    expect(await codeOf(service.create('c1', 'm9', input, lina))).toBe('NOT_FOUND');
    repo.courses[0]!.status = 'PUBLISHED';
    expect(await codeOf(service.update('c1', 'm1', l1.id, { titleEn: 'Grids 2' }, lina))).toBe('COURSE_LOCKED');
    expect((await service.update('c1', 'm1', l1.id, { titleEn: 'Grids 2' }, admin)).titleEn).toBe('Grids 2');
  });

  test('reorder and delete keep a dense order', async () => {
    const service = new LessonService(new InMemoryLessons());
    const a = await service.create('c1', 'm1', input, lina);
    const b = await service.create('c1', 'm1', input, lina);
    const c = await service.create('c1', 'm1', input, lina);
    expect(await codeOf(service.reorder('c1', 'm1', { ids: [a.id, b.id] }, lina))).toBe('LESSON_ORDER_MISMATCH');
    expect((await service.reorder('c1', 'm1', { ids: [c.id, a.id, b.id] }, lina)).items.map((l) => l.id)).toEqual([c.id, a.id, b.id]);
    await service.remove('c1', 'm1', a.id, lina);
    expect((await service.list('c1', lina)).modules[0]!.lessons.map((l) => [l.id, l.order])).toEqual([[c.id, 0], [b.id, 1]]);
  });

  test('reading needs an ACTIVE enrollment, a teaching batch, authorship or admin', async () => {
    const service = new LessonService(new InMemoryLessons());
    await service.create('c1', 'm1', input, lina);
    expect((await service.list('pdf', sara)).modules[0]!.lessons).toHaveLength(1);
    expect((await service.list('c1', omar)).modules[0]!.lessons).toHaveLength(1);
    expect((await service.list('c1', admin)).modules).toHaveLength(1);
    expect(await codeOf(service.list('c1', nadia))).toBe('FORBIDDEN');
    expect(await codeOf(service.list('c1', mariam))).toBe('FORBIDDEN');
  });
});

describe('lesson progress', () => {
  const input = { titleEn: 'Grids', bodyEn: '', attachments: [] };

  test('marking lessons done moves progress and the next lesson; outsiders cannot', async () => {
    const repo = new InMemoryLessons();
    repo.courses[0]!.modules.push({ id: 'm2', order: 1, titleEn: 'Type', titleAr: null, descriptionEn: null, descriptionAr: null });
    const service = new LessonService(repo);
    const a = await service.create('c1', 'm1', { ...input, titleEn: 'Grids' }, lina);
    const b = await service.create('c1', 'm2', { ...input, titleEn: 'Pairing fonts' }, lina);
    expect((await service.list('c1', sara)).progress).toMatchObject({ completed: 0, total: 2, nextLesson: { id: a.id, moduleTitleEn: 'Basics' } });
    await service.setCompleted(a.id, true, sara);
    const after = await service.list('c1', sara);
    expect(after.progress).toMatchObject({ completed: 1, total: 2, nextLesson: { id: b.id, moduleTitleEn: 'Type' } });
    expect(after.modules[0]!.lessons[0]!.completed).toBe(true);
    await service.setCompleted(b.id, true, sara);
    expect((await service.myProgress(sara)).items).toMatchObject([{ courseId: 'c1', completed: 2, total: 2, nextLesson: null }]);
    await service.setCompleted(b.id, false, sara);
    expect((await service.myProgress(sara)).items[0]!.completed).toBe(1);
    expect(await codeOf(service.setCompleted(a.id, true, nadia))).toBe('FORBIDDEN');
    expect(await codeOf(service.setCompleted('nope', true, sara))).toBe('NOT_FOUND');
  });
});
