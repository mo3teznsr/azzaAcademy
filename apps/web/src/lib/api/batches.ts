import type { AddSessionInput, BatchStatus, CreateBatchInput, PreviewScheduleInput, ReviewDecisionInput, SessionLanguage, UpdateAssignmentInput, UpdateBatchInput } from '@azza/shared';
import { http, items, uploadWithProgress, type UploadOptions } from './client';
import type {
  Assignment,
  BatchDetail,
  BatchEnrollment,
  BatchSummary,
  EnrollmentRecord,
  Items,
  LiveSession,
  Material,
  Paged,
  Roster,
  SchedulePreview,
  Submission,
  UploadedFile,
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
  /** TEACHER: send their own DRAFT batch to the admins → PENDING_REVIEW. */
  submit: (id: string) => http.post<BatchDetail>(`/api/v1/batches/${id}/submit`),
  /** ADMIN: approve (→ ENROLLING) or send back with a note (→ DRAFT). */
  review: (id: string, input: ReviewDecisionInput) => http.post<BatchDetail>(`/api/v1/batches/${id}/review`, input),
  roster: (id: string) => http.get<Roster>(`/api/v1/batches/${id}/roster`),
  /** ADMIN or the batch's teacher: one extra session outside the weekly rule → 201 session. */
  addSession: (id: string, input: AddSessionInput) => http.post<LiveSession>(`/api/v1/batches/${id}/sessions`, input),
  shift: (id: string, input: { fromSessionNumber: number; days: number }) => http.post<BatchDetail>(`/api/v1/batches/${id}/shift`, input),
  enrollments: (id: string) => items(http.get<Items<BatchEnrollment>>(`/api/v1/batches/${id}/enrollments`)),
  /** Join the waitlist of a FULL batch → 201 `{ enrollment }` (WAITLISTED). */
  joinWaitlist: (id: string) => http.post<{ enrollment: EnrollmentRecord }>(`/api/v1/batches/${id}/waitlist`),
  leaveWaitlist: (id: string) => http.del<{ enrollment: EnrollmentRecord }>(`/api/v1/batches/${id}/waitlist`),
  materials: (id: string) => items(http.get<Items<Material>>(`/api/v1/batches/${id}/materials`)),
  addMaterial: (id: string, input: { sessionId?: string; title: string; url: string; kind: Material['kind'] }) =>
    http.post<Material>(`/api/v1/batches/${id}/materials`, input),
  /** The batch teacher or ADMIN: one class file (≤ 50 MB) → its `materials/` URL, then `addMaterial` with kind FILE. */
  uploadMaterialFile: (id: string, file: File, opts?: UploadOptions) => {
    const form = new FormData();
    form.append('file', file);
    return uploadWithProgress<UploadedFile>(`/api/v1/batches/${id}/materials/file`, form, opts);
  },
  assignments: (id: string) => items(http.get<Items<Assignment>>(`/api/v1/batches/${id}/assignments`)),
  addAssignment: (id: string, input: { sessionId?: string; title: string; description: string; dueAt: string; maxScore: number }) =>
    http.post<Assignment>(`/api/v1/batches/${id}/assignments`, input),
  /** 422 `SCORE_TOO_HIGH` when `maxScore` drops below a grade already given; `sessionId: null` detaches. */
  updateAssignment: (assignmentId: string, input: UpdateAssignmentInput) => http.patch<Assignment>(`/api/v1/assignments/${assignmentId}`, input),
  /** 409 `ASSIGNMENT_HAS_SUBMISSIONS` once anyone has submitted. */
  deleteAssignment: (assignmentId: string) => http.del<{ ok: true }>(`/api/v1/assignments/${assignmentId}`),
  submissions: (assignmentId: string) => items(http.get<Items<Submission>>(`/api/v1/assignments/${assignmentId}/submissions`)),
};
