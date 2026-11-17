import { http } from './client';
import type { ISODate } from './types';

// ───────── Lesson questions and answers (recorded courses) ─────────

export interface QaAuthor {
  id: string;
  name: string;
  image: string | null;
}

export interface LessonAnswer {
  id: string;
  questionId: string;
  body: string;
  createdAt: ISODate;
  /** Hidden by the course author or an admin; only they (and the writer) still get it. */
  hidden: boolean;
  /** The asker marked it as the one that helped. */
  accepted: boolean;
  /** Written by the course author or an admin. */
  instructor: boolean;
  author: QaAuthor;
}

export interface LessonQuestion {
  id: string;
  lessonId: string;
  body: string;
  createdAt: ISODate;
  hidden: boolean;
  author: QaAuthor;
  mine: boolean;
  canDelete: boolean;
  /** Oldest first. */
  answers: LessonAnswer[];
}

export interface LessonQuestions {
  /** Newest first. */
  items: LessonQuestion[];
  total: number;
  page: number;
  pageSize: number;
  canAsk: boolean;
  canAnswer: boolean;
  questionsLeftToday: number;
}

export interface CourseQuestionInbox {
  course: { id: string; slug: string; titleEn: string; titleAr: string | null };
  items: Array<LessonQuestion & { lesson: { id: string; titleEn: string; titleAr: string | null } | null }>;
  total: number;
  page: number;
  pageSize: number;
}

// ───────── Teacher analytics per recorded course ─────────

export interface LessonFunnelRow {
  lessonId: string;
  titleEn: string;
  titleAr: string | null;
  started: number;
  completed: number;
  /** 0–1, null when no player reported the video length. */
  avgWatchedShare: number | null;
  /** 0–1 share of starters who did not start the next lesson; null on the last lesson or without starters. */
  dropOff: number | null;
}

export interface CourseAnalytics {
  course: { id: string; slug: string; titleEn: string; titleAr: string | null };
  generatedAt: ISODate;
  liveLearners: number;
  learnersStarted: number;
  inactiveAfterDays: number;
  lessons: LessonFunnelRow[];
  /** Names only: teachers never see learners' emails. */
  inactive: Array<{ id: string; name: string; lastActiveAt: ISODate | null }>;
}

export const lessonQaApi = {
  questions: (lessonId: string, page = 1) => http.get<LessonQuestions>(`/api/v1/lessons/${lessonId}/questions`, { page, pageSize: 20 }),
  ask: (lessonId: string, body: string) => http.post<LessonQuestion>(`/api/v1/lessons/${lessonId}/questions`, { body }),
  answer: (questionId: string, body: string) => http.post<LessonAnswer>(`/api/v1/lesson-questions/${questionId}/answers`, { body }),
  deleteQuestion: (questionId: string) => http.del<{ ok: true }>(`/api/v1/lesson-questions/${questionId}`),
  hideQuestion: (questionId: string, hidden: boolean) => http.put<{ id: string; hidden: boolean }>(`/api/v1/lesson-questions/${questionId}/hidden`, { hidden }),
  hideAnswer: (answerId: string, hidden: boolean) => http.put<{ id: string; hidden: boolean }>(`/api/v1/lesson-answers/${answerId}/hidden`, { hidden }),
  accept: (answerId: string, accepted: boolean) =>
    accepted ? http.put<{ id: string; accepted: boolean }>(`/api/v1/lesson-answers/${answerId}/accepted`, {}) : http.del<{ id: string; accepted: boolean }>(`/api/v1/lesson-answers/${answerId}/accepted`),
  courseInbox: (courseId: string, unanswered: boolean, page = 1) =>
    http.get<CourseQuestionInbox>(`/api/v1/courses/${courseId}/questions`, { unanswered: unanswered ? 'true' : undefined, page, pageSize: 20 }),
  courseAnalytics: (courseId: string) => http.get<CourseAnalytics>(`/api/v1/teacher/courses/${courseId}/analytics`),
};

/** Query keys for lesson Q&A and course analytics (kept beside their API). */
export const qaKeys = {
  /** Every Q&A list: invalidate after any write. */
  all: ['lesson-qa'] as const,
  lesson: (lessonId: string, page: number) => ['lesson-qa', 'lesson', lessonId, page] as const,
  inbox: (courseId: string, unanswered: boolean, page: number) => ['lesson-qa', 'inbox', courseId, unanswered, page] as const,
  analytics: (courseId: string) => ['teacher', 'course-analytics', courseId] as const,
};
