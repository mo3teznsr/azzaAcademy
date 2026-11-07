import {
  SOCKET_EVENTS,
  type BatchStatus,
  type ConversationMessageDeletedEvent,
  type ConversationMessageDto,
  type ConversationMessageEvent,
  type ConversationType,
  type EnrollmentStatus,
  type Role,
} from '@azza/shared';
import { AppError, BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock, RealtimeBroadcaster } from '../../core/ports';
import type { Notifier } from '../notifications/notification.types';
import { Collapser, SlidingWindowLimiter } from './throttles';

type Actor = { id: string; role: Role };

export interface ConversationBatch {
  id: string;
  code: string;
  status: BatchStatus;
  teacherId: string;
  courseTitle: string;
  courseTitleAr: string | null;
}

export interface ConversationRecord {
  id: string;
  type: ConversationType;
  batchId: string;
  studentId: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
}

export interface UserRef {
  id: string;
  name: string;
  image: string | null;
  role: Role;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
  sender: UserRef;
}

export interface LastMessage {
  body: string;
  senderName: string;
  createdAt: Date;
}

export interface ConversationRepository {
  batch(batchId: string): Promise<ConversationBatch | null>;
  batches(ids: string[]): Promise<ConversationBatch[]>;
  enrollmentStatus(userId: string, batchId: string): Promise<EnrollmentStatus | null>;
  activeStudentIds(batchId: string): Promise<string[]>;
  /** Batches the user is an ACTIVE student of. */
  studentBatchIds(userId: string): Promise<string[]>;
  /** Batches the user teaches (proposals still in DRAFT / PENDING_REVIEW excluded). */
  teacherBatchIds(userId: string): Promise<string[]>;
  /** The batch's CLASS conversation, created if missing (one per batch, race-safe). */
  ensureClassConversation(batchId: string): Promise<ConversationRecord>;
  /** Existing CLASS conversations of these batches. */
  classConversations(batchIds: string[]): Promise<ConversationRecord[]>;
  ensureDirectConversation(batchId: string, studentId: string): Promise<ConversationRecord>;
  /** DIRECT conversations of these batches, optionally only one student's. */
  directConversations(batchIds: string[], studentId?: string): Promise<ConversationRecord[]>;
  findConversation(id: string): Promise<ConversationRecord | null>;
  users(ids: string[]): Promise<UserRef[]>;
  /** Latest non-deleted message per conversation. */
  lastMessages(conversationIds: string[]): Promise<Map<string, LastMessage>>;
  /** Non-deleted messages from others newer than the user's `lastReadAt` (all of them when never read). */
  unreadCounts(userId: string, conversationIds: string[]): Promise<Map<string, number>>;
  /** Newest first; `before` exclusive. */
  messages(conversationId: string, before: Date | null, take: number): Promise<MessageRecord[]>;
  /** Also bumps the conversation's `lastMessageAt`. */
  createMessage(conversationId: string, senderId: string, body: string, at: Date): Promise<MessageRecord>;
  findMessage(id: string): Promise<MessageRecord | null>;
  softDeleteMessage(id: string, byId: string, at: Date): Promise<void>;
  markRead(conversationId: string, userId: string, at: Date): Promise<void>;
}

export const RATE_LIMIT = { max: 20, windowMs: 60_000 };
export const NOTIFY_COLLAPSE_MS = 10 * 60_000;
const CLOSED: BatchStatus[] = ['COMPLETED', 'CANCELLED'];

export const notClassMember = () => new AppError('You are not a member of this class', 403, 'NOT_CLASS_MEMBER');
const dmNotAllowed = (message = 'Private messages are only between a student and their teacher') => new AppError(message, 403, 'DM_NOT_ALLOWED');
const chatClosed = () => new BusinessRuleError('This class has ended, so its chat is read-only', 'CHAT_CLOSED');

type Access = { as: 'admin' | 'teacher' | 'student'; canPost: boolean };

/**
 * Class group chats and private student ↔ teacher chats (docs/COMMUNICATIONS.md).
 * - Members: the batch teacher and ACTIVE students. Admins read everything, post in CLASS chats, and delete messages.
 * - A DIRECT chat is between one ACTIVE student and the batch teacher; there are no student-to-student chats.
 * - COMPLETED / CANCELLED batches make their chats read-only (CHAT_CLOSED).
 * - New messages go to members over the socket; CHAT_MESSAGE notifications are collapsed (one per conversation
 *   per recipient per 10 minutes) and only sent for DIRECT chats or when the teacher posts in the CLASS chat.
 */
export class ConversationService {
  private readonly limiter = new SlidingWindowLimiter(RATE_LIMIT.max, RATE_LIMIT.windowMs);
  private readonly collapser = new Collapser(NOTIFY_COLLAPSE_MS);

  constructor(
    private readonly repo: ConversationRepository,
    private readonly realtime: RealtimeBroadcaster,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  // ───────── conversations ─────────

  async mine(user: Actor) {
    if (user.role === 'ADMIN') return { items: [], unreadTotal: 0 };
    const asTeacher = user.role === 'TEACHER';
    const batchIds = asTeacher ? await this.repo.teacherBatchIds(user.id) : await this.repo.studentBatchIds(user.id);
    if (!batchIds.length) return { items: [], unreadTotal: 0 };

    const existing = await this.repo.classConversations(batchIds);
    const missing = batchIds.filter((id) => !existing.some((c) => c.batchId === id));
    const created = await Promise.all(missing.map((id) => this.repo.ensureClassConversation(id)));
    const direct = await this.repo.directConversations(batchIds, asTeacher ? undefined : user.id);
    const conversations = [...existing, ...created, ...direct];

    const items = await this.describe(conversations, user);
    items.sort((a, b) => sortKey(b) - sortKey(a));
    return { items, unreadTotal: items.reduce((n, i) => n + i.unread, 0) };
  }

  async classConversation(batchId: string, user: Actor) {
    const batch = await this.batchOr404(batchId);
    if (user.role !== 'ADMIN' && batch.teacherId !== user.id && (await this.repo.enrollmentStatus(user.id, batchId)) !== 'ACTIVE') {
      throw notClassMember();
    }
    const conv = await this.repo.ensureClassConversation(batchId);
    return (await this.describe([conv], user, [batch]))[0]!;
  }

  /** A student opens (or reopens) their private chat with the batch teacher. */
  async openDirect(batchId: string, user: Actor) {
    const batch = await this.batchOr404(batchId);
    if (user.role !== 'STUDENT') throw dmNotAllowed('Only a student can start a private chat with their teacher');
    if ((await this.repo.enrollmentStatus(user.id, batchId)) !== 'ACTIVE') throw notClassMember();
    const conv = await this.repo.ensureDirectConversation(batchId, user.id);
    return (await this.describe([conv], user, [batch]))[0]!;
  }

  // ───────── messages ─────────

  async messages(conversationId: string, user: Actor, before: Date | null, limit: number) {
    const { conv, batch } = await this.load(conversationId);
    await this.access(conv, batch, user);
    const rows = await this.repo.messages(conv.id, before, limit + 1);
    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit).reverse().map(toMessage), hasMore };
  }

  async send(conversationId: string, body: string, user: Actor) {
    const { conv, batch } = await this.load(conversationId);
    const access = await this.access(conv, batch, user);
    if (!access.canPost) throw dmNotAllowed('Admins can read private chats but not post in them');
    if (CLOSED.includes(batch.status)) throw chatClosed();
    const now = this.clock.now();
    if (!this.limiter.tryHit(`${user.id}:${conv.id}`, now.getTime())) {
      throw new AppError('You are sending messages too fast. Wait a moment and try again.', 429, 'RATE_LIMITED');
    }

    const message = await this.repo.createMessage(conv.id, user.id, body, now);
    await this.repo.markRead(conv.id, user.id, now);
    const dto = toMessage(message);
    const recipients = (await this.members(conv, batch)).filter((id) => id !== user.id);
    const event: ConversationMessageEvent = { conversationId: conv.id, message: dto };
    for (const id of recipients) this.realtime.toUser(id, SOCKET_EVENTS.CONVERSATION_MESSAGE, event);

    const notifies = conv.type === 'DIRECT' || user.id === batch.teacherId;
    if (notifies) {
      const due = recipients.filter((id) => this.collapser.shouldFire(`${conv.id}:${id}`, now.getTime()));
      if (due.length) {
        await this.notifier.notify(
          due,
          {
            type: 'CHAT_MESSAGE',
            title: conv.type === 'DIRECT' ? message.sender.name : `${message.sender.name} · ${batch.courseTitle}`,
            body: body.length > 140 ? `${body.slice(0, 139)}…` : body,
            data: { conversationId: conv.id },
          },
          { channels: ['in-app', 'realtime', 'push'] },
        );
      }
    }
    return dto;
  }

  async markRead(conversationId: string, user: Actor) {
    const { conv, batch } = await this.load(conversationId);
    await this.access(conv, batch, user);
    await this.repo.markRead(conv.id, user.id, this.clock.now());
    return { ok: true };
  }

  /** CLASS: the sender, the batch teacher or an admin. DIRECT: the sender or an admin. Closed chats: admins only. */
  async deleteMessage(messageId: string, user: Actor) {
    const message = await this.repo.findMessage(messageId);
    if (!message) throw new NotFoundError('Message', messageId);
    const { conv, batch } = await this.load(message.conversationId);
    const access = await this.access(conv, batch, user);
    const allowed = access.as === 'admin' || message.senderId === user.id || (conv.type === 'CLASS' && access.as === 'teacher');
    if (!allowed) throw new ForbiddenError('You can only delete your own messages');
    if (message.deletedAt) return { ok: true };
    if (access.as !== 'admin' && CLOSED.includes(batch.status)) throw chatClosed();

    await this.repo.softDeleteMessage(message.id, user.id, this.clock.now());
    const event: ConversationMessageDeletedEvent = { conversationId: conv.id, messageId: message.id };
    for (const id of await this.members(conv, batch)) {
      if (id !== user.id) this.realtime.toUser(id, SOCKET_EVENTS.CONVERSATION_MESSAGE_DELETED, event);
    }
    return { ok: true };
  }

  // ───────── helpers ─────────

  private async batchOr404(batchId: string) {
    const batch = await this.repo.batch(batchId);
    if (!batch) throw new NotFoundError('Batch', batchId);
    return batch;
  }

  private async load(conversationId: string) {
    const conv = await this.repo.findConversation(conversationId);
    if (!conv) throw new NotFoundError('Conversation', conversationId);
    return { conv, batch: await this.batchOr404(conv.batchId) };
  }

  /** Throws unless the user may read the conversation; says whether they may post. */
  private async access(conv: ConversationRecord, batch: ConversationBatch, user: Actor): Promise<Access> {
    if (user.role === 'ADMIN') return { as: 'admin', canPost: conv.type === 'CLASS' };
    if (batch.teacherId === user.id) return { as: 'teacher', canPost: true };
    const active = (await this.repo.enrollmentStatus(user.id, batch.id)) === 'ACTIVE';
    if (!active) throw notClassMember();
    if (conv.type === 'DIRECT' && conv.studentId !== user.id) throw dmNotAllowed();
    return { as: 'student', canPost: true };
  }

  /** Who receives socket events and notifications: the teacher and the ACTIVE students who can see the chat. */
  private async members(conv: ConversationRecord, batch: ConversationBatch) {
    const active = await this.repo.activeStudentIds(batch.id);
    const students = conv.type === 'CLASS' ? active : active.filter((id) => id === conv.studentId);
    return [...new Set([batch.teacherId, ...students])];
  }

  private async describe(conversations: ConversationRecord[], user: Actor, knownBatches: ConversationBatch[] = []) {
    const ids = conversations.map((c) => c.id);
    const batchIds = [...new Set(conversations.map((c) => c.batchId))].filter((id) => !knownBatches.some((b) => b.id === id));
    const batches = [...knownBatches, ...(batchIds.length ? await this.repo.batches(batchIds) : [])];
    const counterpartIds = new Set<string>();
    for (const c of conversations) {
      if (c.type !== 'DIRECT') continue;
      const batch = batches.find((b) => b.id === c.batchId);
      const other = c.studentId === user.id ? batch?.teacherId : c.studentId;
      if (other) counterpartIds.add(other);
    }
    const [users, last, unread] = await Promise.all([
      counterpartIds.size ? this.repo.users([...counterpartIds]) : Promise.resolve([]),
      this.repo.lastMessages(ids),
      this.repo.unreadCounts(user.id, ids),
    ]);
    return conversations.flatMap((c) => {
      const batch = batches.find((b) => b.id === c.batchId);
      if (!batch) return [];
      const otherId = c.type === 'DIRECT' ? (c.studentId === user.id ? batch.teacherId : c.studentId) : null;
      const counterpart = otherId ? (users.find((u) => u.id === otherId) ?? null) : null;
      return [
        {
          id: c.id,
          type: c.type,
          batch: { id: batch.id, code: batch.code, courseTitle: batch.courseTitle, courseTitleAr: batch.courseTitleAr },
          counterpart,
          lastMessage: last.get(c.id) ?? null,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt,
          unread: unread.get(c.id) ?? 0,
          closed: CLOSED.includes(batch.status),
        },
      ];
    });
  }
}

const sortKey = (i: { lastMessageAt: Date | null; createdAt: Date }) => (i.lastMessageAt ?? i.createdAt).getTime();

export function toMessage(m: MessageRecord): ConversationMessageDto {
  const deleted = m.deletedAt !== null;
  return {
    id: m.id,
    sender: { id: m.sender.id, name: m.sender.name, image: m.sender.image, role: m.sender.role },
    body: deleted ? '' : m.body,
    createdAt: m.createdAt.toISOString(),
    deleted,
  };
}
