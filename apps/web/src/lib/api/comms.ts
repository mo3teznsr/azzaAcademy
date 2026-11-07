import type {
  AnnouncementAudience,
  AnnouncementScope,
  BatchAnnouncementInput,
  ConversationMessageDto,
  ConversationType,
  OrderStatus,
  PlatformAnnouncementInput,
  Role,
  SupportCategory,
  SupportStatus,
  SupportTicketInput,
  UpdateAnnouncementInput,
  UpdateSupportTicketInput,
} from '@azza/shared';
import { http } from './client';
import type { ISODate } from './types';

/** Communications (docs/COMMUNICATIONS.md): announcements, class / private chat and support tickets. */

export interface CommsBatchRef {
  id: string;
  code: string;
  courseTitle: string;
  courseTitleAr: string | null;
}

// ───────── announcements ─────────

export interface Announcement {
  id: string;
  scope: AnnouncementScope;
  audience: AnnouncementAudience;
  batch: CommsBatchRef | null;
  title: string;
  /** Markdown. */
  body: string;
  pinned: boolean;
  author: { id: string; name: string; image: string | null };
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AnnouncementPage {
  items: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

/** Form payloads before zod defaults are applied. */
export type BatchAnnouncementPayload = Partial<BatchAnnouncementInput> & Pick<BatchAnnouncementInput, 'title' | 'body'>;
export type PlatformAnnouncementPayload = Partial<PlatformAnnouncementInput> & Pick<PlatformAnnouncementInput, 'title' | 'body'>;

export const announcementsApi = {
  /** Platform announcements for my role plus my classes', pinned first, then newest. */
  mine: (p: { page?: number; pageSize?: number } = {}) => http.get<AnnouncementPage>('/api/v1/me/announcements', { ...p }),
  forBatch: (batchId: string, p: { page?: number; pageSize?: number } = {}) => http.get<AnnouncementPage>(`/api/v1/batches/${batchId}/announcements`, { ...p }),
  postToBatch: (batchId: string, input: BatchAnnouncementPayload) => http.post<Announcement>(`/api/v1/batches/${batchId}/announcements`, input),
  postToPlatform: (input: PlatformAnnouncementPayload) => http.post<Announcement>('/api/v1/announcements', input),
  update: (id: string, input: UpdateAnnouncementInput) => http.patch<Announcement>(`/api/v1/announcements/${id}`, input),
  remove: (id: string) => http.del<{ ok: true }>(`/api/v1/announcements/${id}`),
};

// ───────── chat ─────────

export type ConversationMessage = ConversationMessageDto;

export interface Conversation {
  id: string;
  type: ConversationType;
  batch: CommsBatchRef;
  /** The other person of a private chat; null for a class chat. */
  counterpart: { id: string; name: string; image: string | null; role: Role } | null;
  lastMessage: { body: string; senderName: string; createdAt: ISODate } | null;
  lastMessageAt: ISODate | null;
  createdAt: ISODate;
  unread: number;
  /** The class has ended or was cancelled: read-only. */
  closed: boolean;
}

export interface ConversationList {
  items: Conversation[];
  unreadTotal: number;
}

export interface MessagePage {
  items: ConversationMessage[];
  hasMore: boolean;
}

export const conversationsApi = {
  mine: () => http.get<ConversationList>('/api/v1/me/conversations'),
  /** The class chat of a batch (created if missing). */
  forBatch: (batchId: string) => http.get<Conversation>(`/api/v1/batches/${batchId}/conversation`),
  /** A student's private chat with the batch teacher (created if missing). */
  openDirect: (batchId: string) => http.post<Conversation>(`/api/v1/batches/${batchId}/dm`),
  messages: (id: string, p: { before?: string; limit?: number } = {}, signal?: AbortSignal) =>
    http.get<MessagePage>(`/api/v1/conversations/${id}/messages`, { ...p }, signal),
  send: (id: string, body: string) => http.post<ConversationMessage>(`/api/v1/conversations/${id}/messages`, { body }),
  read: (id: string) => http.post<{ ok: true }>(`/api/v1/conversations/${id}/read`),
  deleteMessage: (messageId: string) => http.del<{ ok: true }>(`/api/v1/messages/${messageId}`),
};

// ───────── support ─────────

export interface SupportTicketItem {
  id: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  user: { id: string; name: string; email: string };
  assigneeId: string | null;
  createdAt: ISODate;
  lastMessageAt: ISODate;
  /** The other side wrote last. */
  unreadForMe: boolean;
}

export interface SupportTicketPage {
  items: SupportTicketItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupportMessage {
  id: string;
  authorId: string;
  author: { id: string; name: string; image: string | null } | null;
  body: string;
  fromStaff: boolean;
  createdAt: ISODate;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  orderId: string | null;
  batchId: string | null;
  assigneeId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  lastMessageAt: ISODate;
  user?: { id: string; name: string; email: string };
  messages: SupportMessage[];
  order: { id: string; reference: string; status: OrderStatus; totalFils: number; createdAt: ISODate } | null;
  batch: CommsBatchRef | null;
}

export type SupportTicketsParams = { status?: SupportStatus; category?: SupportCategory; page?: number; pageSize?: number };

export const supportApi = {
  open: (input: SupportTicketInput) => http.post<SupportTicket>('/api/v1/support/tickets', input),
  list: (p: SupportTicketsParams = {}) => http.get<SupportTicketPage>('/api/v1/support/tickets', { ...p }),
  get: (id: string) => http.get<SupportTicket>(`/api/v1/support/tickets/${id}`),
  reply: (id: string, body: string) => http.post<SupportTicket>(`/api/v1/support/tickets/${id}/messages`, { body }),
  update: (id: string, input: UpdateSupportTicketInput) => http.patch<SupportTicket>(`/api/v1/support/tickets/${id}`, input),
};
