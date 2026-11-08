import type { LessonInput, QuizInput, QuizQuestionType, QuizStatus, SubscriptionStatus, UpdateLessonInput, UpdateQuizInput } from '@azza/shared';
import { API_URL, http } from './client';
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
  /** For the caller; present on `GET /courses/:id/lessons`, absent on editor writes. */
  completed?: boolean;
  /** RECORDED course, no plan: the title shows but the lesson doesn't open (the preview lesson is never locked). */
  locked?: boolean;
  /** Where the caller stopped watching (seconds); on `GET /lessons/:id`. */
  videoPositionSec?: number | null;
}

/** A module's lesson titles on the public course page (the syllabus preview). */
export interface LessonTitle {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
}

/** The first lesson the caller hasn't completed (module order, then lesson order). */
export interface NextLesson {
  id: string;
  titleEn: string;
  titleAr: string | null;
  moduleId: string;
  moduleTitleEn: string;
  moduleTitleAr: string | null;
}

export interface LessonProgress {
  completed: number;
  total: number;
  nextLesson: NextLesson | null;
}

/** One course with an ACTIVE enrollment on `GET /me/learning-progress` ("Continue learning"). */
export interface CourseLearningProgress extends LessonProgress {
  /** Absent until the API sends it; treat missing as LIVE. */
  type?: 'LIVE' | 'RECORDED';
  /** Recorded courses: the plan behind the course; null when there is none. Absent until the API sends it. */
  subscription?: { status: SubscriptionStatus; currentPeriodEnd: ISODate | null; cancelAtPeriodEnd: boolean; hasAccess: boolean } | null;
  courseId: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
}

export interface LessonCompletion {
  lessonId: string;
  completed: boolean;
}

/** `GET /lessons/:id/preview`: the lesson plus enough of its course to link back. */
export interface PreviewLesson extends Lesson {
  course?: { id: string; slug: string; titleEn: string; titleAr: string | null };
}

export interface CourseLessons {
  course: { id: string; slug: string; titleEn: string; titleAr: string | null; status: string; type?: 'LIVE' | 'RECORDED'; previewLessonId?: string | null };
  modules: Array<{
    id: string;
    order: number;
    titleEn: string;
    titleAr: string | null;
    descriptionEn: string | null;
    descriptionAr: string | null;
    lessons: Lesson[];
  }>;
  progress: LessonProgress;
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
  /** Batch quizzes; null on a recorded course's quizzes. */
  batchId: string | null;
  /** Recorded course quizzes only. */
  courseId?: string | null;
  /** Percent of the points needed to pass (0–100, default 70). */
  passPercent?: number;
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
/** A quiz belongs to a batch (live) or straight to a course (recorded: unlimited attempts, no due date). */
export type QuizScope = { batchId: string } | { courseId: string };
export const quizScopeKey = (s: QuizScope) => ('batchId' in s ? s.batchId : `course:${s.courseId}`);
const quizPath = (s: QuizScope, quizId?: string) => `/api/v1/${'batchId' in s ? `batches/${s.batchId}` : `courses/${s.courseId}`}/quizzes${quizId ? `/${quizId}` : ''}`;

export const learningApi = {
  /** Public: the course's preview lesson (404 for any other lesson). */
  previewLesson: (lessonId: string) => http.get<PreviewLesson>(`/api/v1/lessons/${lessonId}/preview`),
  /** One lesson with the caller's saved video position. */
  lesson: (lessonId: string) => http.get<Lesson>(`/api/v1/lessons/${lessonId}`),
  saveVideoPosition: (lessonId: string, positionSec: number) => http.put<unknown>(`/api/v1/lessons/${lessonId}/video-position`, { positionSec: Math.max(0, Math.floor(positionSec)) }),
  /** Same save for `pagehide`: `keepalive` lets it finish after the page is gone. Failures are ignored. */
  saveVideoPositionOnExit: (lessonId: string, positionSec: number) => {
    try {
      void fetch(`${API_URL}/api/v1/lessons/${lessonId}/video-position`, {
        method: 'PUT',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionSec: Math.max(0, Math.floor(positionSec)) }),
      }).catch(() => undefined);
    } catch {
      /* best effort */
    }
  },
  lessons: (courseIdOrSlug: string) => http.get<CourseLessons>(`/api/v1/courses/${courseIdOrSlug}/lessons`),
  createLesson: (courseId: string, moduleId: string, input: LessonInput) => http.post<Lesson>(lessonPath(courseId, moduleId), input),
  updateLesson: (courseId: string, moduleId: string, lessonId: string, input: UpdateLessonInput) =>
    http.patch<Lesson>(`${lessonPath(courseId, moduleId)}/${lessonId}`, input),
  deleteLesson: (courseId: string, moduleId: string, lessonId: string) => http.del<{ ok: true }>(`${lessonPath(courseId, moduleId)}/${lessonId}`),
  reorderLessons: (courseId: string, moduleId: string, ids: string[]) => http.put<{ items: Lesson[] }>(`${lessonPath(courseId, moduleId)}/order`, { ids }),
  /** Idempotent: PUT marks the lesson done for the caller, DELETE clears it. */
  setLessonComplete: (lessonId: string, completed: boolean) =>
    completed ? http.put<LessonCompletion>(`/api/v1/lessons/${lessonId}/complete`, {}) : http.del<LessonCompletion>(`/api/v1/lessons/${lessonId}/complete`),
  myLearningProgress: () => http.get<{ items: CourseLearningProgress[] }>('/api/v1/me/learning-progress').then((r) => r.items),

  scopeQuizzes: (scope: QuizScope) => http.get<{ items: QuizSummary[] }>(quizPath(scope)).then((r) => r.items),
  createQuiz: (scope: QuizScope, input: QuizInput) => http.post<StaffQuiz>(quizPath(scope), input),
  updateQuiz: (scope: QuizScope, quizId: string, input: UpdateQuizInput) => http.patch<StaffQuiz>(quizPath(scope, quizId), input),
  deleteQuiz: (scope: QuizScope, quizId: string) => http.del<{ ok: true }>(quizPath(scope, quizId)),
  publishQuiz: (scope: QuizScope, quizId: string) => http.post<StaffQuiz>(`${quizPath(scope, quizId)}/publish`),
  unpublishQuiz: (scope: QuizScope, quizId: string) => http.post<StaffQuiz>(`${quizPath(scope, quizId)}/unpublish`),
  staffQuiz: (quizId: string) => http.get<StaffQuiz>(`/api/v1/quizzes/${quizId}`),
  quizResults: (quizId: string) => http.get<QuizResults>(`/api/v1/quizzes/${quizId}/results`),

  studentQuiz: (quizId: string) => http.get<StudentQuizView>(`/api/v1/quizzes/${quizId}`),
  startQuiz: (quizId: string) => http.post<StudentQuizView>(`/api/v1/quizzes/${quizId}/start`),
  submitQuiz: (quizId: string, answers: Record<string, string[]>) => http.post<StudentQuizView>(`/api/v1/quizzes/${quizId}/attempts`, { answers }),
  myQuizzes: () => http.get<{ items: MyQuiz[] }>('/api/v1/me/quizzes').then((r) => r.items),
};
