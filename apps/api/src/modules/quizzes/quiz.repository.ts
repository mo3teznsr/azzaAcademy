import type { QuizStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { Answers, QuestionResult, StoredQuestion } from './quiz-grader';

export interface QuizRecord {
  id: string;
  batchId: string;
  moduleId: string | null;
  title: string;
  description: string;
  questions: StoredQuestion[];
  status: QuizStatus;
  dueAt: Date | null;
  timeLimitMin: number | null;
  maxAttempts: number;
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

export interface QuizWriteData {
  moduleId?: string | null;
  title?: string;
  description?: string;
  questions?: StoredQuestion[];
  status?: QuizStatus;
  dueAt?: Date | null;
  timeLimitMin?: number | null;
  maxAttempts?: number;
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
  moduleInCourse(moduleId: string, courseId: string): Promise<boolean>;
  listByBatch(batchId: string, publishedOnly: boolean): Promise<QuizRecord[]>;
  find(id: string): Promise<QuizRecord | null>;
  create(batchId: string, data: QuizWriteData & { title: string; questions: StoredQuestion[] }): Promise<QuizRecord>;
  update(id: string, data: QuizWriteData): Promise<QuizRecord>;
  delete(id: string): Promise<void>;
  /** Every attempt of the quiz (one student when `userId` is given), oldest first. */
  attempts(quizId: string, userId?: string): Promise<AttemptRecord[]>;
  /** A student's attempts across quizzes. */
  attemptsOf(userId: string, quizIds: string[]): Promise<AttemptRecord[]>;
  createAttempt(data: { quizId: string; userId: string; number: number; startedAt: Date }): Promise<AttemptRecord>;
  finishAttempt(id: string, data: Pick<AttemptRecord, 'submittedAt' | 'answers' | 'results' | 'score' | 'maxScore' | 'timedOut'>): Promise<AttemptRecord>;
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

  async find(id: string) {
    const row = await this.db.quiz.findUnique({ where: { id } });
    return row && toQuiz(row);
  }

  async create(batchId: string, { questions, ...data }: QuizWriteData & { title: string; questions: StoredQuestion[] }) {
    return toQuiz(await this.db.quiz.create({ data: { ...data, batchId, questions: questions as never } }));
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
    return rows.map(toQuiz);
  }
}
