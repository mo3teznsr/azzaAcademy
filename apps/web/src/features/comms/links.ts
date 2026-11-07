import type { Role } from '@azza/shared';

/** The class page of a batch for this role: the student class page, or the studio / admin workspace. */
export function classHref(role: Role | null | undefined, batchId: string, tab?: 'announcements' | 'chat'): string {
  const q = tab ? `?tab=${tab}` : '';
  if (role === 'TEACHER') return `/studio/batches/${batchId}${q}`;
  if (role === 'ADMIN') return `/admin/batches/${batchId}`;
  return `/learn/classes/${batchId}${q}`;
}

/** A support ticket, in the admin inbox for admins. */
export function ticketHref(role: Role | null | undefined, ticketId: string): string {
  return role === 'ADMIN' ? `/admin/support/${ticketId}` : `/support/${ticketId}`;
}

export const messagesHref = (conversationId?: string) => (conversationId ? `/messages?c=${encodeURIComponent(conversationId)}` : '/messages');
