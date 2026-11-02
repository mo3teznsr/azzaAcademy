import type { BatchStatus, CreateBatchInput, PreviewScheduleInput, SessionLanguage, UpdateBatchInput } from '@azza/shared';
import { http, items } from './client';
import type {
  Assignment,
  BatchDetail,
  BatchEnrollment,
  BatchSummary,
  EnrollmentRecord,
  Items,
  Material,
  Paged,
  Roster,
  SchedulePreview,
  Submission,
} from './types';

export interface BatchListParams {
  page?: number;
  pageSize?: number;
  courseId?: string;
  teacherId?: string;
  status?: BatchStatus;
  language?: SessionLanguage;
}

export const batchesApi = {
  list: (p: BatchListParams = {}) => http.get<Paged<BatchSummary>>('/api/v1/batches', { ...p }),
  get: (id: string) => http.get<BatchDetail>(`/api/v1/batches/${id}`),
  preview: (input: PreviewScheduleInput) => http.post<SchedulePreview>('/api/v1/batches/schedule/preview', input),
  create: (input: CreateBatchInput) => http.post<BatchDetail>('/api/v1/batches', input),
  update: (id: string, input: UpdateBatchInput) => http.patch<BatchDetail>(`/api/v1/batches/${id}`, input),
  roster: (id: string) => http.get<Roster>(`/api/v1/batches/${id}/roster`),
  shift: (id: string, input: { fromSessionNumber: number; days: number }) => http.post<BatchDetail>(`/api/v1/batches/${id}/shift`, input),
  enrollments: (id: string) => items(http.get<Items<BatchEnrollment>>(`/api/v1/batches/${id}/enrollments`)),
  /** Join the waitlist of a FULL batch → 201 `{ enrollment }` (WAITLISTED). */
  joinWaitlist: (id: string) => http.post<{ enrollment: EnrollmentRecord }>(`/api/v1/batches/${id}/waitlist`),
  leaveWaitlist: (id: string) => http.del<{ enrollment: EnrollmentRecord }>(`/api/v1/batches/${id}/waitlist`),
  materials: (id: string) => items(http.get<Items<Material>>(`/api/v1/batches/${id}/materials`)),
  addMaterial: (id: string, input: { sessionId?: string; title: string; url: string; kind: Material['kind'] }) =>
    http.post<Material>(`/api/v1/batches/${id}/materials`, input),
  assignments: (id: string) => items(http.get<Items<Assignment>>(`/api/v1/batches/${id}/assignments`)),
  addAssignment: (id: string, input: { sessionId?: string; title: string; description: string; dueAt: string; maxScore: number }) =>
    http.post<Assignment>(`/api/v1/batches/${id}/assignments`, input),
  submissions: (assignmentId: string) => items(http.get<Items<Submission>>(`/api/v1/assignments/${assignmentId}/submissions`)),
};
