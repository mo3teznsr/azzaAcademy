import type { InstructorApplicationInput, SessionLanguage } from '@azza/shared';
import { http, items } from './client';
import type { Items } from './types';

export type InstructorApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** An application to teach on Azza (`/instructor-applications`). `user` is included on admin lists. */
export interface InstructorApplication {
  id: string;
  status: InstructorApplicationStatus;
  reviewNote: string | null;
  headline: string;
  bio: string;
  categories: string[];
  languages: SessionLanguage[];
  experience: string;
  sampleUrl: string | null;
  phone: string | null;
  createdAt: string;
  decidedAt: string | null;
  user?: { id: string; name: string; email: string; image: string | null };
}

/** `GET /teachers` item: the public instructors directory. `categories` are slugs. */
export interface DirectoryTeacher {
  id: string;
  name: string;
  image: string | null;
  headline: string | null;
  languages: SessionLanguage[];
  categories: string[];
  courses: Array<{ id: string; slug: string; titleEn: string; titleAr: string | null }>;
  openBatches: number;
}

export const instructorsApi = {
  /** Public directory, teachers with open batches first. */
  directory: () => items(http.get<Items<DirectoryTeacher>>('/api/v1/teachers')),
  /** The signed-in user's latest application, or null. */
  mine: () => http.get<{ application: InstructorApplication | null }>('/api/v1/instructor-applications/mine').then((r) => r.application),
  /** STUDENT only. 422 ALREADY_INSTRUCTOR, 409 CONFLICT while one is pending. */
  apply: (input: InstructorApplicationInput) => http.post<InstructorApplication>('/api/v1/instructor-applications', input),
  /** ADMIN queue. */
  list: (status?: InstructorApplicationStatus) => items(http.get<Items<InstructorApplication>>('/api/v1/instructor-applications', { status })),
  /** ADMIN. Declining needs a note (≥ 3 chars). 422 APPLICATION_DECIDED. */
  review: (id: string, input: { approve: boolean; note?: string }) =>
    http.post<InstructorApplication>(`/api/v1/instructor-applications/${encodeURIComponent(id)}/review`, input),
};
