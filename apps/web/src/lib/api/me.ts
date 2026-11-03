import type { UpdateProfileInput } from '@azza/shared';
import { http, items } from './client';
import type { CalendarFeed, Enrollment, Items, Me, MyCertificates, MyWaitlist, NotificationPage, Order, Paged, Recording, ScheduleItem, ScheduleResponse, Submission } from './types';

export const meApi = {
  get: () => http.get<Me>('/api/v1/me'),
  update: (input: UpdateProfileInput) => http.patch<Me>('/api/v1/me', input),
  /** Sessions in [from, to) — the `{ from, to, items }` envelope is unwrapped to the list. */
  schedule: (from: string, to: string) => items(http.get<ScheduleResponse>('/api/v1/me/schedule', { from, to })) as Promise<ScheduleItem[]>,
  enrollments: () => items(http.get<Items<Enrollment>>('/api/v1/me/enrollments')),
  recordings: () => items(http.get<Items<Recording>>('/api/v1/me/recordings')),
  orders: () => items(http.get<Items<Order>>('/api/v1/me/orders')),
  notifications: (p: { page?: number; pageSize?: number; unread?: boolean } = {}) =>
    http.get<NotificationPage>('/api/v1/me/notifications', { ...p }),
  readNotification: (id: string) => http.post<unknown>(`/api/v1/me/notifications/${id}/read`),
  readAllNotifications: () => http.post<{ updated: number }>('/api/v1/me/notifications/read-all'),
  calendar: () => http.get<CalendarFeed>('/api/v1/me/calendar'),
  /** Issues newly earned certificates (idempotent) and lists the batches still in progress. */
  certificates: () => http.get<MyCertificates>('/api/v1/me/certificates'),
  /** My WAITLISTED batches with place in line, plus seats offered to me from a waitlist. */
  waitlist: () => http.get<MyWaitlist>('/api/v1/me/waitlist'),
  submit: (assignmentId: string, input: { url?: string; text?: string }) =>
    http.post<Submission>(`/api/v1/assignments/${assignmentId}/submissions`, input),
};

/** Normalise an array or a paged envelope to an array. */
export function itemsOf<T>(data: T[] | Paged<T> | { items: T[] } | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items;
}
