import { LESSON_QUESTIONS_PER_DAY, type CourseType, type LessonAnswerInput, type LessonQuestionInput, type LessonQuestionsQuery, type Role } from '@azza/shared';
import { AppError, BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { lessonQaEmails } from '../notifications/email-templates';
import type { Notifier, Recipient } from '../notifications/notification.types';
import { canAccept, canAsk, canDeleteQuestion, canSee, isInstructor, limitWindowStart, preview, questionsLeft, type QaActor } from './qa-policy';
import type { AnswerRecord, LessonQaRepository, QuestionRecord, Visibility } from './qa.repository';

type Actor = QaActor & { name?: string };

/** The lesson and course as the Q&A needs them. */
export interface QaLesson {
  lesson: { id: string; moduleId: string; titleEn: string; titleAr: string | null };
  course: { id: string; slug: string; titleEn: string; titleAr: string | null; type: CourseType; createdById: string | null; modules: Array<{ id: string; order: number }> };
}

/** Port onto the lesson read rule (LessonService): resolves when the viewer may read the lesson, throws otherwise. */
export interface LessonAccess {
  readable(lessonId: string, viewer: { id: string; role: Role }): Promise<QaLesson>;
  /** The course and its lessons in curriculum order, without an access check (the author's inbox checks it). */
  courseLessons(courseIdOrSlug: string): Promise<{ course: QaLesson['course']; lessons: Array<QaLesson['lesson']> } | null>;
}

/**
 * Questions and answers under lessons of recorded courses.
 * - Anyone who can read the lesson sees its thread: questions newest first, each with its answers oldest first.
 * - Learners who can read it ask (at most `LESSON_QUESTIONS_PER_DAY` per rolling 24 hours, deleted ones included);
 *   the course author and admins answer, and their answers carry `instructor: true`.
 * - The asker marks the answer that helped, and may delete their question while it has no answers.
 * - The course author and admins hide (and unhide) abusive posts; a hidden post stays visible to them and its writer.
 * - The author hears of new questions (admins when the course has no author), the asker of answers, in-app and by email.
 */
export class LessonQaService {
  constructor(
    private readonly repo: LessonQaRepository,
    private readonly lessons: LessonAccess,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  /** `GET /lessons/:lessonId/questions` */
  async list(lessonId: string, query: LessonQuestionsQuery, viewer: Actor) {
    const { course } = await this.readable(lessonId, viewer);
    const instructor = isInstructor(viewer, course);
    const visibility: Visibility = instructor ? { all: true } : { all: false, viewerId: viewer.id };
    const { items, total } = await this.repo.listQuestions(lessonId, visibility, (query.page - 1) * query.pageSize, query.pageSize);
    const answers = await this.repo.answersOf(items.map((q) => q.id), visibility);
    const posted = canAsk(viewer, course) ? await this.repo.countQuestionsSince(viewer.id, limitWindowStart(this.clock.now())) : 0;
    return {
      items: items.map((q) => this.present(q, answers.filter((a) => a.questionId === q.id), course, viewer)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      canAsk: canAsk(viewer, course),
      canAnswer: instructor,
      questionsLeftToday: canAsk(viewer, course) ? questionsLeft(posted) : 0,
    };
  }

  /**
   * `GET /courses/:courseId/questions` — the author's (or an admin's) inbox across the course's lessons, newest first;
   * `unanswered` keeps the ones still waiting.
   */
  async courseInbox(courseIdOrSlug: string, query: LessonQuestionsQuery & { unanswered?: boolean }, viewer: Actor) {
    const found = await this.lessons.courseLessons(courseIdOrSlug);
    if (!found) throw new NotFoundError('Course', courseIdOrSlug);
    const { course, lessons } = found;
    if (!isInstructor(viewer, course)) throw new ForbiddenError('Only the course author can see its questions');
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Questions are only on recorded courses', 'QA_RECORDED_ONLY');
    const { items, total } = await this.repo.listCourseQuestions(
      { lessonIds: lessons.map((l) => l.id), unanswered: !!query.unanswered },
      (query.page - 1) * query.pageSize,
      query.pageSize,
    );
    const answers = await this.repo.answersOf(items.map((q) => q.id), { all: true });
    const byId = new Map(lessons.map((l) => [l.id, l]));
    return {
      course: { id: course.id, slug: course.slug, titleEn: course.titleEn, titleAr: course.titleAr },
      items: items.map((q) => {
        const l = byId.get(q.lessonId);
        return { ...this.present(q, answers.filter((a) => a.questionId === q.id), course, viewer), lesson: l ? { id: l.id, titleEn: l.titleEn, titleAr: l.titleAr } : null };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** `POST /lessons/:lessonId/questions` */
  async ask(lessonId: string, input: LessonQuestionInput, viewer: Actor) {
    const { lesson, course } = await this.readable(lessonId, viewer);
    if (!canAsk(viewer, course)) throw new ForbiddenError('The course author and admins answer questions; they do not ask them');
    const now = this.clock.now();
    const posted = await this.repo.countQuestionsSince(viewer.id, limitWindowStart(now));
    if (questionsLeft(posted) === 0) {
      throw new AppError(`You can ask up to ${LESSON_QUESTIONS_PER_DAY} questions a day. Try again tomorrow.`, 429, 'QA_DAILY_LIMIT', { max: LESSON_QUESTIONS_PER_DAY });
    }
    const question = await this.repo.createQuestion({ lessonId, authorId: viewer.id, body: input.body }, now);

    const url = this.url(`/studio/courses/${course.id}/questions?lesson=${lesson.id}`);
    const asker = question.author.name;
    const notice = {
      type: 'LESSON_QUESTION',
      title: `New question · ${lesson.titleEn}`,
      body: `${asker}: ${preview(input.body)}`,
      ar: { title: `سؤال جديد · ${lesson.titleAr ?? lesson.titleEn}`, body: `${asker}: ${preview(input.body)}` },
      data: { questionId: question.id, lessonId: lesson.id, courseId: course.id, courseSlug: course.slug },
      email: (r: Recipient) => lessonQaEmails.newQuestion(asker, titleFor(lesson, r), input.body, url, r.locale),
    };
    if (course.createdById) await this.notifier.notify([course.createdById], notice);
    else await this.notifier.notifyRole('ADMIN', notice, { channels: ['in-app', 'realtime', 'email'] });
    return this.present(question, [], course, viewer);
  }

  /** `POST /lesson-questions/:id/answers` — the course author or an admin. */
  async answer(questionId: string, input: LessonAnswerInput, viewer: Actor) {
    const { question, lesson, course } = await this.question(questionId, viewer);
    if (!isInstructor(viewer, course)) throw new ForbiddenError('Only the course author or an admin can answer');
    const answer = await this.repo.createAnswer({ questionId: question.id, authorId: viewer.id, body: input.body }, this.clock.now());

    if (question.authorId !== viewer.id) {
      const url = this.url(`/learn/courses/${course.slug}?lesson=${lesson.id}#qa`);
      const answerer = answer.author.name;
      await this.notifier.notify([question.authorId], {
        type: 'LESSON_ANSWER',
        title: `${answerer} answered your question`,
        body: preview(input.body),
        ar: { title: `أجاب ${answerer} عن سؤالك`, body: preview(input.body) },
        data: { questionId: question.id, lessonId: lesson.id, courseId: course.id, courseSlug: course.slug },
        email: (r) => lessonQaEmails.newAnswer(r.name, answerer, titleFor(lesson, r), input.body, url, r.locale),
      });
    }
    return this.presentAnswer(answer, course);
  }

  /** `DELETE /lesson-questions/:id` — the asker, while the question has no answers. */
  async deleteQuestion(questionId: string, viewer: Actor) {
    const { question } = await this.question(questionId, viewer);
    if (question.authorId !== viewer.id) throw new ForbiddenError('Only the asker can delete a question');
    if (!canDeleteQuestion(viewer, question)) throw new BusinessRuleError('A question with answers can no longer be deleted', 'QA_HAS_ANSWERS');
    await this.repo.deleteQuestion(question.id, this.clock.now());
    return { ok: true };
  }

  /** `PUT /lesson-questions/:id/hidden` — the course author or an admin. */
  async setQuestionHidden(questionId: string, hidden: boolean, viewer: Actor) {
    const { question, course } = await this.question(questionId, viewer);
    if (!isInstructor(viewer, course)) throw new ForbiddenError('Only the course author or an admin can hide posts');
    await this.repo.setQuestionHidden(question.id, hidden ? viewer.id : null, this.clock.now());
    return { id: question.id, hidden };
  }

  /** `PUT /lesson-answers/:id/hidden` — the course author or an admin. */
  async setAnswerHidden(answerId: string, hidden: boolean, viewer: Actor) {
    const { answer, course } = await this.answerOf(answerId, viewer);
    if (!isInstructor(viewer, course)) throw new ForbiddenError('Only the course author or an admin can hide posts');
    await this.repo.setAnswerHidden(answer.id, hidden ? viewer.id : null, this.clock.now());
    return { id: answer.id, hidden };
  }

  /** `PUT|DELETE /lesson-answers/:id/accepted` — the asker marks (or unmarks) the answer that helped. */
  async setAccepted(answerId: string, accepted: boolean, viewer: Actor) {
    const { answer, question } = await this.answerOf(answerId, viewer);
    if (!canAccept(viewer, question)) throw new ForbiddenError('Only the asker can mark the answer that helped');
    if (accepted && answer.hiddenAt) throw new BusinessRuleError('A hidden answer cannot be marked as helpful', 'QA_ANSWER_HIDDEN');
    if (accepted) await this.repo.setAccepted(question.id, answer.id, this.clock.now());
    else if (answer.acceptedAt) await this.repo.setAccepted(question.id, null, this.clock.now());
    return { id: answer.id, accepted };
  }

  // ───────── helpers ─────────

  private async readable(lessonId: string, viewer: Actor) {
    const found = await this.lessons.readable(lessonId, viewer);
    if (found.course.type !== 'RECORDED') throw new BusinessRuleError('Questions are only on recorded courses', 'QA_RECORDED_ONLY');
    return found;
  }

  /** The question, when the viewer may read its lesson and see it. */
  private async question(questionId: string, viewer: Actor) {
    const question = await this.repo.findQuestion(questionId);
    if (!question) throw new NotFoundError('Question', questionId);
    const { lesson, course } = await this.readable(question.lessonId, viewer);
    if (!canSee(viewer, course, question)) throw new NotFoundError('Question', questionId);
    return { question, lesson, course };
  }

  private async answerOf(answerId: string, viewer: Actor) {
    const answer = await this.repo.findAnswer(answerId);
    if (!answer) throw new NotFoundError('Answer', answerId);
    const { question, lesson, course } = await this.question(answer.questionId, viewer).catch((e) => {
      throw e instanceof NotFoundError ? new NotFoundError('Answer', answerId) : e;
    });
    if (!canSee(viewer, course, answer)) throw new NotFoundError('Answer', answerId);
    return { answer, question, lesson, course };
  }

  private present(q: QuestionRecord, answers: AnswerRecord[], course: QaLesson['course'], viewer: Actor) {
    return {
      id: q.id,
      lessonId: q.lessonId,
      body: q.body,
      createdAt: q.createdAt,
      hidden: !!q.hiddenAt,
      author: { id: q.author.id, name: q.author.name, image: q.author.image },
      mine: q.authorId === viewer.id,
      canDelete: canDeleteQuestion(viewer, { authorId: q.authorId, answerCount: answers.length }),
      answers: answers.map((a) => this.presentAnswer(a, course)),
    };
  }

  private presentAnswer(a: AnswerRecord, course: QaLesson['course']) {
    return {
      id: a.id,
      questionId: a.questionId,
      body: a.body,
      createdAt: a.createdAt,
      hidden: !!a.hiddenAt,
      accepted: !!a.acceptedAt,
      instructor: isInstructor({ id: a.authorId, role: a.author.role }, course),
      author: { id: a.author.id, name: a.author.name, image: a.author.image },
    };
  }

  private url(path: string) {
    return `${this.webUrl.replace(/\/$/, '')}${path}`;
  }
}

/** The lesson title in the recipient's language. */
const titleFor = (lesson: QaLesson['lesson'], r: Pick<Recipient, 'locale'>) => (r.locale.startsWith('ar') && lesson.titleAr ? lesson.titleAr : lesson.titleEn);
