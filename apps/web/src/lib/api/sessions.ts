import type { CancelSessionInput, RescheduleSessionInput } from '@azza/shared';
import { http, items } from './client';
import type { AgendaItem, AttendanceReport, ChatMessage, HandQueue, Items, JoinTicket, LiveSession, SessionDetail } from './types';

export const sessionsApi = {
  get: (id: string) => http.get<SessionDetail>(`/api/v1/sessions/${id}`),
  updateAgenda: (id: string, input: { title?: string; agenda?: AgendaItem[]; notes?: string }) =>
    http.patch<LiveSession>(`/api/v1/sessions/${id}/agenda`, input),
  /** Admin → `{ requested: false, session }`; host → 202 `{ requested: true }` (admins review the request). */
  reschedule: (id: string, input: RescheduleSessionInput) =>
    http.post<{ requested: boolean; session?: LiveSession }>(`/api/v1/sessions/${id}/reschedule`, input),
  cancel: (id: string, input: Partial<CancelSessionInput> = {}) => http.post<LiveSession>(`/api/v1/sessions/${id}/cancel`, { notifyStudents: true, ...input }),
  join: (id: string) => http.post<JoinTicket>(`/api/v1/sessions/${id}/join`),
  start: (id: string) => http.post<LiveSession>(`/api/v1/sessions/${id}/start`),
  end: (id: string) => http.post<LiveSession>(`/api/v1/sessions/${id}/end`),
  mute: (id: string, userId: string) => http.post<unknown>(`/api/v1/sessions/${id}/participants/${userId}/mute`),
  remove: (id: string, userId: string) => http.post<unknown>(`/api/v1/sessions/${id}/participants/${userId}/remove`),
  allowSpeak: (id: string, userId: string) => http.post<unknown>(`/api/v1/sessions/${id}/participants/${userId}/allow-speak`),
  hands: (id: string) => http.get<HandQueue>(`/api/v1/sessions/${id}/hands`),
  messages: (id: string) => items(http.get<Items<ChatMessage>>(`/api/v1/sessions/${id}/messages`)),
  attendance: (id: string) => http.get<AttendanceReport>(`/api/v1/sessions/${id}/attendance`),
  feedback: (id: string, input: { rating: number; tags: string[]; comment?: string }) => http.post<unknown>(`/api/v1/sessions/${id}/feedback`, input),
};
