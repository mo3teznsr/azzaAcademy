import type { Role } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

/** Public profile of a poster: no email, ever (learners and teachers read these threads). */
export interface QaPerson {
  id: string;
  name: string;
  image: string | null;
  role: Role;
}

export interface QuestionRecord {
  id: string;
  lessonId: string;
  authorId: string;
  body: string;
  hiddenAt: Date | null;
  createdAt: Date;
  author: QaPerson;
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  authorId: string;
  body: string;
  acceptedAt: Date | null;
  hiddenAt: Date | null;
  createdAt: Date;
  author: QaPerson;
}

/**
 * Which posts a list returns: `all` (instructors), or the visible ones plus the viewer's own hidden posts.
 */
export type Visibility = { all: true } | { all: false; viewerId: string };

export interface CourseQuestionFilter {
  lessonIds: string[];
  /** Only questions without any answer yet. */
  unanswered: boolean;
}

/** Persistence port for lesson Q&A — the service never sees Prisma. */
export interface LessonQaRepository {
  /** A lesson's questions, newest first. */
  listQuestions(lessonId: string, visibility: Visibility, skip: number, take: number): Promise<{ items: QuestionRecord[]; total: number }>;
  /** Questions across several lessons (the author's inbox), newest first; hidden ones included. */
  listCourseQuestions(filter: CourseQuestionFilter, skip: number, take: number): Promise<{ items: QuestionRecord[]; total: number }>;
  /** Answers of these questions, oldest first. */
  answersOf(questionIds: string[], visibility: Visibility): Promise<AnswerRecord[]>;
  findQuestion(id: string): Promise<(QuestionRecord & { answerCount: number }) | null>;
  findAnswer(id: string): Promise<AnswerRecord | null>;
  createQuestion(data: { lessonId: string; authorId: string; body: string }, at: Date): Promise<QuestionRecord>;
  createAnswer(data: { questionId: string; authorId: string; body: string }, at: Date): Promise<AnswerRecord>;
  /** Soft delete: the row stays so it still counts toward the daily limit. */
  deleteQuestion(id: string, at: Date): Promise<void>;
  /** `by` null unhides. */
  setQuestionHidden(id: string, by: string | null, at: Date): Promise<void>;
  setAnswerHidden(id: string, by: string | null, at: Date): Promise<void>;
  /** Marks one answer of the question as the one that helped (clearing any other), or clears it with null. */
  setAccepted(questionId: string, answerId: string | null, at: Date): Promise<void>;
  /** Questions the user posted since `since` (any lesson, deleted ones included). */
  countQuestionsSince(authorId: string, since: Date): Promise<number>;
}

const person = { select: { id: true, name: true, image: true, role: true } } as const;
const visibleWhere = (v: Visibility) => (v.all ? {} : { OR: [{ hiddenAt: null }, { authorId: v.viewerId }] });

export class PrismaLessonQaRepository implements LessonQaRepository {
  constructor(private readonly db: Db) {}

  async listQuestions(lessonId: string, visibility: Visibility, skip: number, take: number) {
    const where = { lessonId, deletedAt: null, ...visibleWhere(visibility) };
    const [items, total] = await this.db.$transaction([
      this.db.lessonQuestion.findMany({ where, include: { author: person }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take }),
      this.db.lessonQuestion.count({ where }),
    ]);
    return { items, total };
  }

  async listCourseQuestions(filter: CourseQuestionFilter, skip: number, take: number) {
    const where = { lessonId: { in: filter.lessonIds }, deletedAt: null, ...(filter.unanswered && { answers: { none: {} } }) };
    const [items, total] = await this.db.$transaction([
      this.db.lessonQuestion.findMany({ where, include: { author: person }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take }),
      this.db.lessonQuestion.count({ where }),
    ]);
    return { items, total };
  }

  answersOf(questionIds: string[], visibility: Visibility) {
    if (!questionIds.length) return Promise.resolve([]);
    return this.db.lessonAnswer.findMany({
      where: { questionId: { in: questionIds }, ...visibleWhere(visibility) },
      include: { author: person },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async findQuestion(id: string) {
    const row = await this.db.lessonQuestion.findFirst({ where: { id, deletedAt: null }, include: { author: person, _count: { select: { answers: true } } } });
    if (!row) return null;
    const { _count, ...q } = row;
    return { ...q, answerCount: _count.answers };
  }

  findAnswer(id: string) {
    return this.db.lessonAnswer.findUnique({ where: { id }, include: { author: person } });
  }

  createQuestion(data: { lessonId: string; authorId: string; body: string }, at: Date) {
    return this.db.lessonQuestion.create({ data: { ...data, createdAt: at }, include: { author: person } });
  }

  createAnswer(data: { questionId: string; authorId: string; body: string }, at: Date) {
    return this.db.lessonAnswer.create({ data: { ...data, createdAt: at }, include: { author: person } });
  }

  async deleteQuestion(id: string, at: Date) {
    await this.db.lessonQuestion.update({ where: { id }, data: { deletedAt: at } });
  }

  async setQuestionHidden(id: string, by: string | null, at: Date) {
    await this.db.lessonQuestion.update({ where: { id }, data: by ? { hiddenAt: at, hiddenById: by } : { hiddenAt: null, hiddenById: null } });
  }

  async setAnswerHidden(id: string, by: string | null, at: Date) {
    await this.db.lessonAnswer.update({ where: { id }, data: by ? { hiddenAt: at, hiddenById: by } : { hiddenAt: null, hiddenById: null } });
  }

  async setAccepted(questionId: string, answerId: string | null, at: Date) {
    await this.db.$transaction([
      this.db.lessonAnswer.updateMany({ where: { questionId, acceptedAt: { not: null } }, data: { acceptedAt: null } }),
      ...(answerId ? [this.db.lessonAnswer.update({ where: { id: answerId }, data: { acceptedAt: at } })] : []),
    ]);
  }

  countQuestionsSince(authorId: string, since: Date) {
    return this.db.lessonQuestion.count({ where: { authorId, createdAt: { gte: since } } });
  }
}
