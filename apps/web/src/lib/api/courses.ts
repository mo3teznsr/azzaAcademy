import type { CourseLevel, CourseType, CourseReviewInput, CourseSort, CourseStatus, CreateCourseInput, ReviewDecisionInput, SessionLanguage, UpdateCourseInput } from '@azza/shared';
import { http, items, uploadWithProgress } from './client';
import type { CertificateVerification, Course, CourseReview, CourseReviewPage, Items, LiveNow, Paged, SavedCourse, TeacherProfile } from './types';

export interface CourseListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  /** Asked of the API; callers also filter client-side. */
  type?: CourseType;
  /** TEACHER: only the courses they proposed, any status. */
  mine?: boolean;
  /** Has an ENROLLING batch taught in this language. */
  language?: SessionLanguage;
  minPriceAed?: number;
  maxPriceAed?: number;
  minRating?: number;
  /** Featured rail only, ordered by `featuredRank`. */
  featured?: boolean;
  sort?: CourseSort;
}

export type CourseMediaKind = 'course-cover' | 'course-video';
export type CourseMediaUploader = (kind: CourseMediaKind, file: File, opts?: { onProgress?: (fraction: number) => void; signal?: AbortSignal }) => Promise<{ url: string }>;

const mediaForm = (kind: CourseMediaKind, file: File) => {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', file);
  return form;
};

/** Course media through the shared `/courses/media` path (TEACHER + ADMIN). */
export const uploadCourseMediaAsTeacher: CourseMediaUploader = (kind, file, opts) => uploadWithProgress<{ url: string }>('/api/v1/courses/media', mediaForm(kind, file), opts);
/** Course media through the admin-only path. */
export const uploadCourseMediaAsAdmin: CourseMediaUploader = (kind, file, opts) => uploadWithProgress<{ url: string }>('/api/v1/admin/media', mediaForm(kind, file), opts);

export const coursesApi = {
  list: (p: CourseListParams = {}) => http.get<Paged<Course>>('/api/v1/courses', { ...p }),
  get: (idOrSlug: string) => http.get<Course>(`/api/v1/courses/${encodeURIComponent(idOrSlug)}`),
  create: (input: CreateCourseInput) => http.post<Course>('/api/v1/courses', input),
  update: (id: string, input: UpdateCourseInput) => http.patch<Course>(`/api/v1/courses/${id}`, input),
  /** TEACHER: send their own DRAFT to the admins → PENDING_REVIEW. */
  submit: (id: string) => http.post<Course>(`/api/v1/courses/${id}/submit`),
  /** Course editors: the one lesson anyone can watch without a plan; null clears it. */
  setPreviewLesson: (id: string, lessonId: string | null) => http.put<Course>(`/api/v1/courses/${id}/preview-lesson`, { lessonId }),
  /** ADMIN: approve (→ PUBLISHED) or send back with a note (→ DRAFT). */
  review: (id: string, input: ReviewDecisionInput) => http.post<Course>(`/api/v1/courses/${id}/review`, input),
  /** Cover photo / intro video upload that teachers may call too. */
  uploadMedia: uploadCourseMediaAsTeacher,
  /** ≤ 4 published courses: same category first, then same level. */
  related: (idOrSlug: string) => items(http.get<Items<Course>>(`/api/v1/courses/${encodeURIComponent(idOrSlug)}/related`)),

  /** Visible reviews (admins also get hidden ones) + rating summary + the viewer's own review. */
  reviews: (idOrSlug: string, p: { page?: number; pageSize?: number } = {}) =>
    http.get<CourseReviewPage>(`/api/v1/courses/${encodeURIComponent(idOrSlug)}/reviews`, { ...p }),
  /** STUDENT with an attended batch; else 422 `REVIEW_NOT_ELIGIBLE`. */
  saveMyReview: (courseId: string, input: CourseReviewInput) => http.put<CourseReview>(`/api/v1/courses/${courseId}/reviews/mine`, input),
  deleteMyReview: (courseId: string) => http.del<{ ok: true }>(`/api/v1/courses/${courseId}/reviews/mine`),
  /** A teacher of the course or an admin; replying again replaces the reply. */
  replyToReview: (reviewId: string, reply: string) => http.post<CourseReview>(`/api/v1/reviews/${reviewId}/reply`, { reply }),
  /** ADMIN: hidden reviews leave the public list and the average. */
  moderateReview: (reviewId: string, hidden: boolean) => http.patch<CourseReview>(`/api/v1/reviews/${reviewId}`, { hidden }),

  saved: () => items(http.get<Items<SavedCourse>>('/api/v1/me/saved-courses')),
  save: (courseId: string) => http.put<{ saved: boolean }>(`/api/v1/courses/${courseId}/save`, {}),
  unsave: (courseId: string) => http.del<{ saved: boolean }>(`/api/v1/courses/${courseId}/save`),
  /** Public "live now" counter for the marketing pages. */
  liveNow: () => http.get<LiveNow>('/api/v1/stats/live'),
  /** Public teacher profile (404 unless the user is an active teacher). */
  teacher: (id: string) => http.get<TeacherProfile>(`/api/v1/teachers/${encodeURIComponent(id)}`),
  /** Public certificate check (code is case-insensitive; 404 when unknown). */
  verifyCertificate: (code: string) => http.get<CertificateVerification>(`/api/v1/certificates/${encodeURIComponent(code)}`),
};
