import type { CreateCourseInput, CourseLevel, CourseStatus, UpdateCourseInput } from '@azza/shared';
import { http } from './client';
import type { CertificateVerification, Course, LiveNow, Paged, TeacherProfile } from './types';

export interface CourseListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  level?: CourseLevel;
  status?: CourseStatus;
}

export const coursesApi = {
  list: (p: CourseListParams = {}) => http.get<Paged<Course>>('/api/v1/courses', { ...p }),
  get: (idOrSlug: string) => http.get<Course>(`/api/v1/courses/${encodeURIComponent(idOrSlug)}`),
  create: (input: CreateCourseInput) => http.post<Course>('/api/v1/courses', input),
  update: (id: string, input: UpdateCourseInput) => http.patch<Course>(`/api/v1/courses/${id}`, input),
  /** Public "live now" counter for the marketing pages. */
  liveNow: () => http.get<LiveNow>('/api/v1/stats/live'),
  /** Public teacher profile (404 unless the user is an active teacher). */
  teacher: (id: string) => http.get<TeacherProfile>(`/api/v1/teachers/${encodeURIComponent(id)}`),
  /** Public certificate check (code is case-insensitive; 404 when unknown). */
  verifyCertificate: (code: string) => http.get<CertificateVerification>(`/api/v1/certificates/${encodeURIComponent(code)}`),
};
