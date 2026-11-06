import type { LessonInput, QuizInput, QuizQuestionType, QuizStatus, UpdateLessonInput, UpdateQuizInput } from '@azza/shared';
import { http } from './client';
import type { ISODate } from './types';

// ───────── Lessons ─────────

export interface LessonAttachment {
  title: string;
  url: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
  /** Markdown. */
  bodyEn: string;
  bodyAr: string | null;
  videoUrl: string | null;
  attachments: LessonAttachment[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** A module's lesson titles on the public course page (the syllabus preview). */
export interface LessonTitle {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
}

export interface CourseLessons {
  course: { id: string; slug: string; titleEn: string; titleAr: string | null; status: string };
  modules: Array<{
    id: string;
    order: number;
    titleEn: string;
    titleAr: string | null;
    descriptionEn: string | null;
    descriptionAr: string | null;
    lessons: Lesson[];
  }>;
}

// ───────── Quizzes ─────────

export interface QuizOption {
  id: string;
  textEn: string;
  textAr: string | null;
  /** Staff only. */
  correct?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  promptEn: string;
  promptAr: string | null;
  points: number;
  options: QuizOption[];
}

interface QuizBase {
  id: string;
  batchId: string;
  moduleId: string | null;
  title: string;
  description: string;
  status: QuizStatus;
  dueAt: ISODate | null;
  timeLimitMin: number | null;
  maxAttempts: number;
  publishedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type StudentQuizStatus = 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'MISSED';

export interface QuizProgress {
  status: StudentQuizStatus;
  attemptsUsed: number;
  attemptsLeft: number;
  canStart: boolean;
  bestScore: number | null;
  bestPercent: number | null;
  maxScore: number;
}

export interface QuizSummary extends QuizBase {
  questionCount: number;
  totalPoints: number;
  /** Staff list. */
  attemptCount?: number;
  studentsAttempted?: number;
  /** Student list. */
  mine?: QuizProgress;
}

export interface MyQuiz extends QuizSummary {
  batch: { id: string; code: string; course: { id: string; slug: string; titleEn: string; titleAr: string | null } };
  mine: QuizProgress;
}

/** GET /quizzes/:id as the batch teacher / admin (answers included). */
export interface StaffQuiz extends QuizBase {
  questions: QuizQuestion[];
  totalPoints: number;
  attemptCount: number;
  hasAttempts: boolean;
}

export interface AttemptQuestionResult {
  questionId: string;
  selected: string[];
  correct: boolean;
  earned: number;
  points: number;
  correctOptionIds: string[];
}

export interface QuizAttempt {
  id: string;
  number: number;
  startedAt: ISODate;
  submittedAt: ISODate;
  score: number | null;
  maxScore: number;
  percent: number;
  timedOut: boolean;
  /** Only once answers are revealed. */
  questions?: AttemptQuestionResult[];
}

/** GET /quizzes/:id, POST /start, POST /attempts as a student. Never carries `correct` flags before `reveal`. */
export interface StudentQuizView {
  quiz: QuizBase & { questions: QuizQuestion[]; questionCount: number; totalPoints: number };
  progress: QuizProgress;
  reveal: boolean;
  openAttempt: { id: string; number: number; startedAt: ISODate; deadline: ISODate | null } | null;
  attempts: QuizAttempt[];
  answerKey?: Record<string, string[]>;
  /** POST /attempts only: the attempt just graded. */
  result?: QuizAttempt;
}

export interface QuizResults {
  quiz: QuizSummary;
  summary: { students: number; submitted: number; averagePercent: number | null };
  students: Array<{
    user: { id: string; name: string; email: string; image: string | null };
    attempts: number;
    bestScore: number | null;
    bestPercent: number | null;
    lastSubmittedAt: ISODate | null;
  }>;
  questions: Array<{ questionId: string; type: QuizQuestionType; promptEn: string; promptAr: string | null; points: number; answered: number; correct: number; rate: number | null }>;
}

const lessonPath = (courseId: string, moduleId: string) => `/api/v1/courses/${courseId}/modules/${moduleId}/lessons`;
const quizPath = (batchId: string, quizId?: string) => `/api/v1/batches/${batchId}/quizzes${quizId ? `/${quizId}` : ''}`;

export const learningApi = {
  lessons: (courseIdOrSlug: string) => http.get<CourseLessons>(`/api/v1/courses/${courseIdOrSlug}/lessons`),
  createLesson: (courseId: string, moduleId: string, input: LessonInput) => http.post<Lesson>(lessonPath(courseId, moduleId), input),
  updateLesson: (courseId: string, moduleId: string, lessonId: string, input: UpdateLessonInput) =>
    http.patch<Lesson>(`${lessonPath(courseId, moduleId)}/${lessonId}`, input),
  deleteLesson: (courseId: string, moduleId: string, lessonId: string) => http.del<{ ok: true }>(`${lessonPath(courseId, moduleId)}/${lessonId}`),
  reorderLessons: (courseId: string, moduleId: string, ids: string[]) => http.put<{ items: Lesson[] }>(`${lessonPath(courseId, moduleId)}/order`, { ids }),

  batchQuizzes: (batchId: string) => http.get<{ items: QuizSummary[] }>(quizPath(batchId)).then((r) => r.items),
  createQuiz: (batchId: string, input: QuizInput) => http.post<StaffQuiz>(quizPath(batchId), input),
  updateQuiz: (batchId: string, quizId: string, input: UpdateQuizInput) => http.patch<StaffQuiz>(quizPath(batchId, quizId), input),
  deleteQuiz: (batchId: string, quizId: string) => http.del<{ ok: true }>(quizPath(batchId, quizId)),
  publishQuiz: (batchId: string, quizId: string) => http.post<StaffQuiz>(`${quizPath(batchId, quizId)}/publish`),
  unpublishQuiz: (batchId: string, quizId: string) => http.post<StaffQuiz>(`${quizPath(batchId, quizId)}/unpublish`),
  staffQuiz: (quizId: string) => http.get<StaffQuiz>(`/api/v1/quizzes/${quizId}`),
  quizResults: (quizId: string) => http.get<QuizResults>(`/api/v1/quizzes/${quizId}/results`),

  studentQuiz: (quizId: string) => http.get<StudentQuizView>(`/api/v1/quizzes/${quizId}`),
  startQuiz: (quizId: string) => http.post<StudentQuizView>(`/api/v1/quizzes/${quizId}/start`),
  submitQuiz: (quizId: string, answers: Record<string, string[]>) => http.post<StudentQuizView>(`/api/v1/quizzes/${quizId}/attempts`, { answers }),
  myQuizzes: () => http.get<{ items: MyQuiz[] }>('/api/v1/me/quizzes').then((r) => r.items),
};
