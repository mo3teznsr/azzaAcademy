import type { CourseType, QuizStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { AccessSubscription } from '../subscriptions/access-policy';
import { everSubscribed, newestLiveSubscription } from '../subscriptions/recorded-subscription';
import type { Answers, QuestionResult, StoredQuestion } from './quiz-grader';

/** A quiz belongs to a batch (LIVE course) or to a course (RECORDED): exactly one of `batchId` and `courseId` is set. */
export interface QuizRecord {
  id: string;
  batchId: string | null;
  courseId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  questions: StoredQuestion[];
  status: QuizStatus;
  dueAt: Date | null;
  timeLimitMin: number | null;
  /** Ignored for course quizzes: they allow unlimited attempts. */
  maxAttempts: number;
  /** Percent of the points needed to pass. */
  passPercent: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttemptRecord {
  id: string;
  quizId: string;
  userId: string;
  number: number;
  startedAt: Date;
  submittedAt: Date | null;
  answers: Answers;
  results: QuestionResult[];
  score: number | null;
  maxScore: number;
  timedOut: boolean;
}

export interface QuizBatch {
  id: string;
  code: string;
  courseId: string;
  course: { id: string; slug: string; titleEn: string; titleAr: string | null };
}

export interface CourseRef {
  id: string;
  slug: string;
  type: CourseType;
  status: string;
  createdById: string | null;
}

export interface QuizWriteData {
  moduleId?: string | null;
  title?: string;
  description?: string;
  questions?: StoredQuestion[];
  status?: QuizStatus;
  dueAt?: Date | null;
  timeLimitMin?: number | null;
  maxAttempts?: number;
  passPercent?: number;
  publishedAt?: Date | null;
}

export interface StudentRef {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** Persistence port for quizzes — services never see Prisma. */
export interface QuizRepository {
  batch(batchId: string): Promise<QuizBatch | null>;
  /** By id or slug. */
  course(idOrSlug: string): Promise<CourseRef | null>;
  /** The user's newest subscription to a recorded course that has not EXPIRED. */
  recordedSubscription(courseId: string, userId: string): Promise<AccessSubscription | null>;
  /** The user once had a paid period on the course (even one that has expired); an abandoned checkout does not count. */
  hadSubscription(courseId: string, userId: string): Promise<boolean>;
  moduleInCourse(moduleId: string, courseId: string): Promise<boolean>;
  listByBatch(batchId: string, publishedOnly: boolean): Promise<QuizRecord[]>;
  listByCourse(courseId: string, publishedOnly: boolean): Promise<QuizRecord[]>;
  /** A batch quiz or a course quiz. */
  find(id: string): Promise<QuizRecord | null>;
  create(batchId: string, data: QuizWriteData & { title: string; questions: StoredQuestion[] }): Promise<QuizRecord>;
  createForCourse(courseId: string, data: QuizWriteData & { title: string; questions: StoredQuestion[] }): Promise<QuizRecord>;
  update(id: string, data: QuizWriteData): Promise<QuizRecord>;
  delete(id: string): Promise<void>;
  /** Every attempt of the quiz (one student when `userId` is given), oldest first. */
  attempts(quizId: string, userId?: string): Promise<AttemptRecord[]>;
  /** A student's attempts across quizzes. */
  attemptsOf(userId: string, quizIds: string[]): Promise<AttemptRecord[]>;
  createAttempt(data: { quizId: string; userId: string; number: number; startedAt: Date }): Promise<AttemptRecord>;
  finishAttempt(id: string, data: Pick<AttemptRecord, 'submittedAt' | 'answers' | 'results' | 'score' | 'maxScore' | 'timedOut'>): Promise<AttemptRecord>;
  /** Everyone who has an attempt at the quiz, by name (the roster of a course quiz). */
  attemptUsers(quizId: string): Promise<StudentRef[]>;
  /** Students with an ACTIVE enrollment in the batch. */
  activeStudents(batchId: string): Promise<StudentRef[]>;
  /** PUBLISHED quizzes of the batches where the user is ACTIVE, with their batch. */
  publishedForStudent(userId: string): Promise<Array<QuizRecord & { batch: QuizBatch }>>;
}

type QuizRow = Omit<QuizRecord, 'questions'> & { questions: unknown };
type AttemptRow = Omit<AttemptRecord, 'answers' | 'results'> & { answers: unknown; results: unknown };
const toQuiz = <T extends QuizRow>(row: T) => ({ ...row, questions: (row.questions ?? []) as StoredQuestion[] });
const toAttempt = (row: AttemptRow): AttemptRecord => ({ ...row, answers: (row.answers ?? {}) as Answers, results: (row.results ?? []) as QuestionResult[] });
const batchSelect = { id: true, code: true, courseId: true, course: { select: { id: true, slug: true, titleEn: true, titleAr: true } } } as const;

export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly db: Db) {}

  batch(batchId: string) {
    return this.db.batch.findUnique({ where: { id: batchId }, select: batchSelect });
  }

  course(idOrSlug: string) {
    return this.db.course.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: { id: true, slug: true, type: true, status: true, createdById: true } });
  }

  recordedSubscription(courseId: string, userId: string) {
    return newestLiveSubscription(this.db, courseId, userId);
  }

  hadSubscription(courseId: string, userId: string) {
    return everSubscribed(this.db, courseId, userId);
  }

  async moduleInCourse(moduleId: string, courseId: string) {
    return (await this.db.courseModule.count({ where: { id: moduleId, courseId } })) > 0;
  }

  async listByBatch(batchId: string, publishedOnly: boolean) {
    const rows = await this.db.quiz.findMany({
      where: { batchId, ...(publishedOnly && { status: 'PUBLISHED' as const }) },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    return rows.map(toQuiz);
  }

  async listByCourse(courseId: string, publishedOnly: boolean) {
    const rows = await this.db.quiz.findMany({
      where: { courseId, ...(publishedOnly && { status: 'PUBLISHED' as const }) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toQuiz);
  }

  async find(id: string) {
    const row = await this.db.quiz.findUnique({ where: { id } });
    return row && toQuiz(row);
  }

  async create(batchId: string, { questions, ...data }: QuizWriteData & { title: string; questions: StoredQuestion[] }) {
    return toQuiz(await this.db.quiz.create({ data: { ...data, batchId, questions: questions as never } }));
  }

  async createForCourse(courseId: string, { questions, ...data }: QuizWriteData & { title: string; questions: StoredQuestion[] }) {
    return toQuiz(await this.db.quiz.create({ data: { ...data, courseId, questions: questions as never } }));
  }

  async update(id: string, { questions, ...data }: QuizWriteData) {
    return toQuiz(await this.db.quiz.update({ where: { id }, data: { ...data, ...(questions && { questions: questions as never }) } }));
  }

  async delete(id: string) {
    await this.db.quiz.delete({ where: { id } });
  }

  async attempts(quizId: string, userId?: string) {
    const rows = await this.db.quizAttempt.findMany({ where: { quizId, ...(userId && { userId }) }, orderBy: [{ userId: 'asc' }, { number: 'asc' }] });
    return rows.map(toAttempt);
  }

  async attemptsOf(userId: string, quizIds: string[]) {
    const rows = await this.db.quizAttempt.findMany({ where: { userId, quizId: { in: quizIds } }, orderBy: { number: 'asc' } });
    return rows.map(toAttempt);
  }

  async createAttempt(data: { quizId: string; userId: string; number: number; startedAt: Date }) {
    return toAttempt(await this.db.quizAttempt.create({ data }));
  }

  async finishAttempt(id: string, data: Pick<AttemptRecord, 'submittedAt' | 'answers' | 'results' | 'score' | 'maxScore' | 'timedOut'>) {
    return toAttempt(await this.db.quizAttempt.update({ where: { id }, data: { ...data, answers: data.answers as never, results: data.results as never } }));
  }

  async attemptUsers(quizId: string) {
    const rows = await this.db.quizAttempt.findMany({
      where: { quizId },
      distinct: ['userId'],
      orderBy: { user: { name: 'asc' } },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return rows.map((r) => r.user);
  }

  async activeStudents(batchId: string) {
    const rows = await this.db.enrollment.findMany({
      where: { batchId, status: 'ACTIVE' },
      orderBy: { user: { name: 'asc' } },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return rows.map((r) => r.user);
  }

  async publishedForStudent(userId: string) {
    const rows = await this.db.quiz.findMany({
      where: { status: 'PUBLISHED', batch: { enrollments: { some: { userId, status: 'ACTIVE' } } } },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { publishedAt: 'desc' }],
      include: { batch: { select: batchSelect } },
    });
    return rows.flatMap((row) => (row.batch ? [{ ...toQuiz(row), batch: row.batch }] : []));
  }
}
