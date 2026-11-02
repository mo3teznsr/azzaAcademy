import type { CreateCourseInput, CourseLevel, CourseStatus, UpdateCourseInput } from '@azza/shared';
import { http } from './client';
import type { Course, LiveNow, Paged } from './types';

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
};
