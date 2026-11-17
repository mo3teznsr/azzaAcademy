import { describe, expect, test } from 'bun:test';
import { LESSON_QUESTIONS_PER_DAY, lessonAnswerInput, lessonQuestionInput, type Role } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import type { LessonCourse, LessonRecord, LessonRepository, RecordedSubscription } from '../src/modules/lessons/lesson.repository';
import { LessonService } from '../src/modules/lessons/lesson.service';
import { canAccept, canAsk, canDeleteQuestion, canSee, isInstructor, preview, questionsLeft } from '../src/modules/lesson-qa/qa-policy';
import type { AnswerRecord, CourseQuestionFilter, LessonQaRepository, QaPerson, QuestionRecord, Visibility } from '../src/modules/lesson-qa/qa.repository';
import { LessonQaService } from '../src/modules/lesson-qa/qa.service';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);

const people: Record<string, QaPerson> = {
  nour: { id: 'nour', name: 'Nour', image: null, role: 'ADMIN' },
  lina: { id: 'lina', name: 'Lina', image: null, role: 'TEACHER' }, // wrote the course
  omar: { id: 'omar', name: 'Omar', image: null, role: 'TEACHER' }, // another teacher
  sam: { id: 'sam', name: 'Sam', image: null, role: 'STUDENT' }, // ACTIVE subscriber
  dana: { id: 'dana', name: 'Dana', image: null, role: 'STUDENT' }, // ACTIVE subscriber
  eva: { id: 'eva', name: 'Eva', image: null, role: 'STUDENT' }, // plan EXPIRED
  zed: { id: 'zed', name: 'Zed', image: null, role: 'STUDENT' }, // never subscribed
};
const as = (id: string) => ({ id, role: people[id]!.role as Role });
const admin = as('nour');
const lina = as('lina');
const omar = as('omar');
const sam = as('sam');
const dana = as('dana');
const eva = as('eva');
const zed = as('zed');

let now = new Date('2026-11-20T10:00:00Z');
const clock = { now: () => now };

/** Just enough of the lesson repository for the read rule. */
class Lessons implements Partial<LessonRepository> {
  courses: LessonCourse[] = [
    {
      id: 'rc', slug: 'logo-design', titleEn: 'Logo design', titleAr: 'تصميم الشعارات', status: 'PUBLISHED', createdById: 'lina', type: 'RECORDED', previewLessonId: null,
      modules: [{ id: 'm1', order: 0, titleEn: 'Basics', titleAr: null, descriptionEn: null, descriptionAr: null }],
    },
    { id: 'live', slug: 'arabic', titleEn: 'Arabic', titleAr: null, status: 'PUBLISHED', createdById: 'lina', type: 'LIVE', previewLessonId: null, modules: [{ id: 'm2', order: 0, titleEn: 'M', titleAr: null, descriptionEn: null, descriptionAr: null }] },
  ];
  rows: LessonRecord[] = [
    ...['l1', 'l2'].map((id, order) => ({ id, moduleId: 'm1', order, titleEn: `Lesson ${id}`, titleAr: `درس ${id}`, bodyEn: '', bodyAr: null, videoUrl: null, attachments: [], createdAt: now, updatedAt: now })),
    { id: 'lv', moduleId: 'm2', order: 0, titleEn: 'Live lesson', titleAr: null, bodyEn: '', bodyAr: null, videoUrl: null, attachments: [], createdAt: now, updatedAt: now },
  ];
  subs: Array<RecordedSubscription & { userId: string }> = [
    { userId: 'sam', status: 'ACTIVE', currentPeriodEnd: new Date('2026-12-20T00:00:00Z'), provider: 'STRIPE' },
    { userId: 'dana', status: 'CANCELLING', currentPeriodEnd: new Date('2026-12-01T00:00:00Z'), provider: 'STRIPE' },
    { userId: 'eva', status: 'EXPIRED', currentPeriodEnd: new Date('2026-10-01T00:00:00Z'), provider: 'STRIPE' },
  ];
  async findCourse(idOrSlug: string) {
    return this.courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async lessonsOfModules(ids: string[]) {
    return this.rows.filter((l) => ids.includes(l.moduleId));
  }
  async find(id: string) {
    return this.rows.find((l) => l.id === id) ?? null;
  }
  async courseOfLesson(id: string) {
    const l = this.rows.find((r) => r.id === id);
    return l ? (l.moduleId === 'm1' ? 'rc' : 'live') : null;
  }
  async recordedSubscription(_c: string, userId: string) {
    return this.subs.find((s) => s.userId === userId && s.status !== 'EXPIRED') ?? null;
  }
  async hadSubscription(_c: string, userId: string) {
    return this.subs.some((s) => s.userId === userId);
  }
  async teachesCourse() {
    return false;
  }
  async isActiveStudent(_c: string, userId: string) {
    return userId === 'sam';
  }
}

class InMemoryQa implements LessonQaRepository {
  questions: Array<QuestionRecord & { deletedAt: Date | null }> = [];
  answers: AnswerRecord[] = [];
  private n = 0;
  private visible = (v: Visibility) => (p: { hiddenAt: Date | null; authorId: string }) => v.all || !p.hiddenAt || p.authorId === v.viewerId;
  private live = () => this.questions.filter((q) => !q.deletedAt);
  private newest = <T extends { createdAt: Date; id: string }>(a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
  async listQuestions(lessonId: string, v: Visibility, skip: number, take: number) {
    const all = this.live().filter((q) => q.lessonId === lessonId).filter(this.visible(v)).sort(this.newest);
    return { items: all.slice(skip, skip + take), total: all.length };
  }
  async listCourseQuestions(f: CourseQuestionFilter, skip: number, take: number) {
    const all = this.live()
      .filter((q) => f.lessonIds.includes(q.lessonId) && (!f.unanswered || !this.answers.some((a) => a.questionId === q.id)))
      .sort(this.newest);
    return { items: all.slice(skip, skip + take), total: all.length };
  }
  async answersOf(ids: string[], v: Visibility) {
    return this.answers.filter((a) => ids.includes(a.questionId)).filter(this.visible(v)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  }
  async findQuestion(id: string) {
    const q = this.live().find((x) => x.id === id);
    return q ? { ...q, answerCount: this.answers.filter((a) => a.questionId === id).length } : null;
  }
  async findAnswer(id: string) {
    return this.answers.find((a) => a.id === id) ?? null;
  }
  async createQuestion(d: { lessonId: string; authorId: string; body: string }, at: Date) {
    const q = { id: `q${++this.n}`, ...d, hiddenAt: null, deletedAt: null, createdAt: at, author: people[d.authorId]! };
    this.questions.push(q);
    return q;
  }
  async createAnswer(d: { questionId: string; authorId: string; body: string }, at: Date) {
    const a = { id: `a${++this.n}`, ...d, acceptedAt: null, hiddenAt: null, createdAt: at, author: people[d.authorId]! };
    this.answers.push(a);
    return a;
  }
  async deleteQuestion(id: string, at: Date) {
    this.questions.find((q) => q.id === id)!.deletedAt = at;
  }
  async setQuestionHidden(id: string, by: string | null, at: Date) {
    this.questions.find((q) => q.id === id)!.hiddenAt = by ? at : null;
  }
  async setAnswerHidden(id: string, by: string | null, at: Date) {
    this.answers.find((a) => a.id === id)!.hiddenAt = by ? at : null;
  }
  async setAccepted(questionId: string, answerId: string | null, at: Date) {
    for (const a of this.answers) if (a.questionId === questionId) a.acceptedAt = a.id === answerId ? at : null;
  }
  async countQuestionsSince(authorId: string, since: Date) {
    return this.questions.filter((q) => q.authorId === authorId && q.createdAt >= since).length;
  }
}

const setup = () => {
  now = new Date('2026-11-20T10:00:00Z');
  const lessonsRepo = new Lessons();
  const repo = new InMemoryQa();
  const notifier = new RecordingNotifier();
  const lessons = new LessonService(lessonsRepo as unknown as LessonRepository, clock);
  const service = new LessonQaService(repo, lessons, notifier, clock, 'https://azza.academy/');
  const page = { page: 1, pageSize: 20 };
  return { lessonsRepo, repo, notifier, service, page };
};

describe('qa-policy', () => {
  const course = { createdById: 'lina' };
  test('instructors are the course author and admins', () => {
    expect(isInstructor(lina, course)).toBe(true);
    expect(isInstructor(admin, course)).toBe(true);
    expect(isInstructor(omar, course)).toBe(false);
    expect(isInstructor(sam, course)).toBe(false);
    expect(isInstructor(lina, { createdById: null })).toBe(false);
  });
  test('learners ask; instructors do not', () => {
    expect(canAsk(sam, course)).toBe(true);
    expect(canAsk(lina, course)).toBe(false);
    expect(canAsk(admin, course)).toBe(false);
  });
  test('the asker deletes only while unanswered, and only their own', () => {
    expect(canDeleteQuestion(sam, { authorId: 'sam', answerCount: 0 })).toBe(true);
    expect(canDeleteQuestion(sam, { authorId: 'sam', answerCount: 1 })).toBe(false);
    expect(canDeleteQuestion(dana, { authorId: 'sam', answerCount: 0 })).toBe(false);
  });
  test('only the asker accepts', () => {
    expect(canAccept(sam, { authorId: 'sam' })).toBe(true);
    expect(canAccept(lina, { authorId: 'sam' })).toBe(false);
  });
  test('hidden posts: instructors and the writer still see them', () => {
    const hidden = { authorId: 'sam', hiddenAt: now };
    expect(canSee(dana, course, hidden)).toBe(false);
    expect(canSee(sam, course, hidden)).toBe(true);
    expect(canSee(lina, course, hidden)).toBe(true);
    expect(canSee(dana, course, { authorId: 'sam', hiddenAt: null })).toBe(true);
  });
  test('daily allowance and previews', () => {
    expect(questionsLeft(0)).toBe(LESSON_QUESTIONS_PER_DAY);
    expect(questionsLeft(LESSON_QUESTIONS_PER_DAY + 3)).toBe(0);
    expect(preview('a\n\n b')).toBe('a b');
    expect(preview('x'.repeat(200))).toHaveLength(140);
  });
  test('length caps', () => {
    expect(lessonQuestionInput.safeParse({ body: 'ok?' }).success).toBe(true);
    expect(lessonQuestionInput.safeParse({ body: '  a ' }).success).toBe(false);
    expect(lessonQuestionInput.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
    expect(lessonAnswerInput.safeParse({ body: 'x'.repeat(4001) }).success).toBe(false);
  });
});

describe('who can ask and see', () => {
  test('a subscriber asks; the author is notified in-app and by email, in their language', async () => {
    const { service, notifier } = setup();
    const q = await service.ask('l1', { body: 'Which font is this?' }, sam);
    expect(q).toMatchObject({ body: 'Which font is this?', mine: true, canDelete: true, answers: [], author: { name: 'Sam' } });
    expect(JSON.stringify(q)).not.toContain('@');
    expect(notifier.sent).toHaveLength(1);
    const { userIds, notice } = notifier.sent[0]!;
    expect(userIds).toEqual(['lina']);
    expect(notice.type).toBe('LESSON_QUESTION');
    expect(notice.ar?.title).toContain('درس l1');
    expect(notice.data).toMatchObject({ questionId: q.id, lessonId: 'l1', courseId: 'rc' });
    const ar = notice.email!({ id: 'lina', name: 'Lina', email: 'l@x', locale: 'ar', timezone: 'Asia/Dubai' })!;
    expect(ar.subject).toContain('سؤال جديد');
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toContain('https://azza.academy/studio/courses/rc/questions?lesson=l1');
    const en = notice.email!({ id: 'lina', name: 'Lina', email: 'l@x', locale: 'en', timezone: 'Asia/Dubai' })!;
    expect(en.subject).toBe('New question · Lesson l1');
  });

  test('a CANCELLING plan still asks; expired and never-subscribed learners cannot ask or read', async () => {
    const { service, page } = setup();
    await service.ask('l1', { body: 'Still here?' }, dana);
    expect(await codeOf(service.ask('l1', { body: 'Hello?' }, eva))).toBe('PLAN_REQUIRED');
    expect(await codeOf(service.ask('l1', { body: 'Hello?' }, zed))).toBe('PLAN_REQUIRED');
    expect(await codeOf(service.list('l1', page, zed))).toBe('PLAN_REQUIRED');
    expect(await codeOf(service.list('l1', page, omar))).toBe('PLAN_REQUIRED');
  });

  test('instructors read but do not ask', async () => {
    const { service, page } = setup();
    expect(await codeOf(service.ask('l1', { body: 'From me' }, lina))).toBe('FORBIDDEN');
    expect(await codeOf(service.ask('l1', { body: 'From me' }, admin))).toBe('FORBIDDEN');
    const out = await service.list('l1', page, lina);
    expect(out).toMatchObject({ canAsk: false, canAnswer: true, questionsLeftToday: 0 });
  });

  test('live courses have no Q&A', async () => {
    const { service, page } = setup();
    expect(await codeOf(service.list('lv', page, sam))).toBe('QA_RECORDED_ONLY');
  });

  test('every reader sees the thread: questions newest first, answers oldest first, with the instructor badge', async () => {
    const { service, page } = setup();
    const first = await service.ask('l1', { body: 'First question' }, sam);
    now = new Date(now.getTime() + 60_000);
    const second = await service.ask('l1', { body: 'Second question' }, dana);
    now = new Date(now.getTime() + 60_000);
    await service.answer(first.id, { body: 'Answer one' }, lina);
    now = new Date(now.getTime() + 60_000);
    await service.answer(first.id, { body: 'Answer two' }, admin);

    const out = await service.list('l1', page, dana);
    expect(out.items.map((q) => q.id)).toEqual([second.id, first.id]);
    expect(out.items[1]!.answers.map((a) => [a.body, a.instructor])).toEqual([['Answer one', true], ['Answer two', true]]);
    expect(out.items[1]).toMatchObject({ mine: false, canDelete: false });
    expect(out).toMatchObject({ canAsk: true, canAnswer: false, questionsLeftToday: LESSON_QUESTIONS_PER_DAY - 1 });
    expect(await service.list('l2', page, dana)).toMatchObject({ items: [], total: 0 });
  });
});

describe('answering, accepting, deleting and hiding', () => {
  test('only the author and admins answer; the asker is notified (bilingual), not the answerer', async () => {
    const { service, notifier } = setup();
    const q = await service.ask('l1', { body: 'How do I export?' }, sam);
    expect(await codeOf(service.answer(q.id, { body: 'Like this' }, dana))).toBe('FORBIDDEN');
    expect(await codeOf(service.answer(q.id, { body: 'Like this' }, omar))).toBe('PLAN_REQUIRED');
    notifier.sent.length = 0;
    const a = await service.answer(q.id, { body: 'File, then Export' }, lina);
    expect(a).toMatchObject({ instructor: true, accepted: false, author: { name: 'Lina' } });
    expect(notifier.sent).toHaveLength(1);
    const { userIds, notice } = notifier.sent[0]!;
    expect(userIds).toEqual(['sam']);
    expect(notice.type).toBe('LESSON_ANSWER');
    expect(notice.ar?.title).toBe('أجاب Lina عن سؤالك');
    const email = notice.email!({ id: 'sam', name: 'Sam', email: 's@x', locale: 'en', timezone: 'Asia/Dubai' })!;
    expect(email.html).toContain('https://azza.academy/learn/courses/logo-design?lesson=l1#qa');
  });

  test('a course without an author sends new questions to admins', async () => {
    const { service, notifier, lessonsRepo } = setup();
    lessonsRepo.courses[0]!.createdById = null;
    await service.ask('l1', { body: 'Anyone?' }, sam);
    expect(notifier.sent[0]!.userIds).toEqual(['role:ADMIN']);
  });

  test('the asker marks one answer that helped; others cannot', async () => {
    const { service, page } = setup();
    const q = await service.ask('l1', { body: 'Which brush?' }, sam);
    const a1 = await service.answer(q.id, { body: 'The round one' }, lina);
    const a2 = await service.answer(q.id, { body: 'Or the flat one' }, admin);
    expect(await codeOf(service.setAccepted(a1.id, true, dana))).toBe('FORBIDDEN');
    expect(await codeOf(service.setAccepted(a1.id, true, lina))).toBe('FORBIDDEN');
    await service.setAccepted(a1.id, true, sam);
    await service.setAccepted(a2.id, true, sam);
    let answers = (await service.list('l1', page, sam)).items[0]!.answers;
    expect(answers.map((a) => a.accepted)).toEqual([false, true]);
    await service.setAccepted(a2.id, false, sam);
    answers = (await service.list('l1', page, sam)).items[0]!.answers;
    expect(answers.map((a) => a.accepted)).toEqual([false, false]);
  });

  test('the asker deletes their own question only while it has no answers', async () => {
    const { service, page } = setup();
    const q1 = await service.ask('l1', { body: 'Delete me' }, sam);
    expect(await codeOf(service.deleteQuestion(q1.id, dana))).toBe('FORBIDDEN');
    expect(await codeOf(service.deleteQuestion(q1.id, lina))).toBe('FORBIDDEN');
    await service.deleteQuestion(q1.id, sam);
    expect((await service.list('l1', page, sam)).total).toBe(0);
    const q2 = await service.ask('l1', { body: 'Keep me' }, sam);
    await service.answer(q2.id, { body: 'Answered' }, lina);
    expect(await codeOf(service.deleteQuestion(q2.id, sam))).toBe('QA_HAS_ANSWERS');
  });

  test('the author and admins hide posts: other learners stop seeing them, the writer and staff still do', async () => {
    const { service, page } = setup();
    const q = await service.ask('l1', { body: 'Something rude' }, sam);
    const a = await service.answer(q.id, { body: 'Answer' }, lina);
    expect(await codeOf(service.setQuestionHidden(q.id, true, dana))).toBe('FORBIDDEN');
    expect(await codeOf(service.setQuestionHidden(q.id, true, sam))).toBe('FORBIDDEN');
    await service.setQuestionHidden(q.id, true, lina);
    expect((await service.list('l1', page, dana)).items).toHaveLength(0);
    expect((await service.list('l1', page, sam)).items[0]).toMatchObject({ hidden: true });
    expect((await service.list('l1', page, admin)).items[0]).toMatchObject({ hidden: true });
    // A learner who can't see the question can't touch it.
    expect(await codeOf(service.setAccepted(a.id, true, dana))).toBe('NOT_FOUND');
    await service.setQuestionHidden(q.id, false, admin);
    expect((await service.list('l1', page, dana)).items).toHaveLength(1);

    await service.setAnswerHidden(a.id, true, admin);
    expect((await service.list('l1', page, dana)).items[0]!.answers).toHaveLength(0);
    expect((await service.list('l1', page, lina)).items[0]!.answers[0]).toMatchObject({ hidden: true });
    expect(await codeOf(service.setAccepted(a.id, true, sam))).toBe('NOT_FOUND');
  });

  test('a lapsed plan loses the thread', async () => {
    const { service, lessonsRepo, page } = setup();
    const q = await service.ask('l1', { body: 'Before it ends' }, dana);
    now = new Date('2026-12-02T00:00:00Z'); // CANCELLING plan ended
    expect(await codeOf(service.list('l1', page, dana))).toBe('PLAN_REQUIRED');
    expect(await codeOf(service.deleteQuestion(q.id, dana))).toBe('PLAN_REQUIRED');
    expect(lessonsRepo.subs.length).toBe(3);
  });
});

describe('daily limit', () => {
  test(`at most ${LESSON_QUESTIONS_PER_DAY} questions in 24 hours, deleted ones included; the window rolls`, async () => {
    const { service } = setup();
    for (let i = 0; i < LESSON_QUESTIONS_PER_DAY; i++) {
      const q = await service.ask(i % 2 ? 'l1' : 'l2', { body: `Question ${i}` }, sam);
      if (i === 0) await service.deleteQuestion(q.id, sam);
      now = new Date(now.getTime() + 60_000);
    }
    expect(await codeOf(service.ask('l1', { body: 'One more' }, sam))).toBe('QA_DAILY_LIMIT');
    // Another learner is unaffected.
    await service.ask('l1', { body: 'Mine' }, dana);
    // A day after the first question, one slot frees up.
    now = new Date('2026-11-21T10:00:30Z');
    await service.ask('l1', { body: 'Next day' }, sam);
    expect(await codeOf(service.ask('l1', { body: 'Again' }, sam))).toBe('QA_DAILY_LIMIT');
  });
});

describe('author inbox', () => {
  test('the author and admins list questions across lessons, unanswered only on request; others are refused', async () => {
    const { service, page } = setup();
    const q1 = await service.ask('l1', { body: 'On lesson one' }, sam);
    now = new Date(now.getTime() + 60_000);
    await service.ask('l2', { body: 'On lesson two' }, dana);
    await service.answer(q1.id, { body: 'Done' }, lina);
    const all = await service.courseInbox('rc', page, lina);
    expect(all.items.map((q) => q.lesson?.id)).toEqual(['l2', 'l1']);
    const open = await service.courseInbox('logo-design', { ...page, unanswered: true }, admin);
    expect(open.items.map((q) => q.body)).toEqual(['On lesson two']);
    expect(await codeOf(service.courseInbox('rc', page, omar))).toBe('FORBIDDEN');
    expect(await codeOf(service.courseInbox('rc', page, sam))).toBe('FORBIDDEN');
    expect(await codeOf(service.courseInbox('nope', page, admin))).toBe('NOT_FOUND');
  });
});
