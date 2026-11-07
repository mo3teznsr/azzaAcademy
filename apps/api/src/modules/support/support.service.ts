import type { Role, SupportCategory, SupportStatus, SupportTicketInput, SupportTicketsQuery, UpdateSupportTicketInput } from '@azza/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { communicationEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';

type Actor = { id: string; role: Role; name?: string };

export interface TicketRecord {
  id: string;
  userId: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  orderId: string | null;
  batchId: string | null;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  user: { id: string; name: string; email: string };
}

export interface SupportMessageRecord {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
}

export interface TicketListFilter {
  userId?: string;
  status?: SupportStatus;
  category?: SupportCategory;
}

export interface OrderSummary {
  id: string;
  reference: string;
  status: string;
  totalFils: number;
  createdAt: Date;
}
export interface BatchSummary {
  id: string;
  code: string;
  courseTitle: string;
  courseTitleAr: string | null;
}

export interface SupportRepository {
  /** The order's owner, or null when it doesn't exist. */
  orderOwner(orderId: string): Promise<string | null>;
  batchExists(batchId: string): Promise<boolean>;
  isAdmin(userId: string): Promise<boolean>;
  create(
    data: { userId: string; subject: string; category: SupportCategory; orderId: string | null; batchId: string | null },
    body: string,
    at: Date,
  ): Promise<TicketRecord>;
  find(id: string): Promise<TicketRecord | null>;
  /** Newest activity first; `lastFromStaff` = whether the latest message came from staff. */
  list(filter: TicketListFilter, skip: number, take: number): Promise<{ items: Array<TicketRecord & { lastFromStaff: boolean | null }>; total: number }>;
  /** Oldest first. */
  messages(ticketId: string): Promise<SupportMessageRecord[]>;
  /** Adds the message and sets the ticket's status and `lastMessageAt`. */
  addMessage(ticketId: string, msg: { authorId: string; body: string; fromStaff: boolean }, status: SupportStatus, at: Date): Promise<SupportMessageRecord>;
  update(id: string, data: { status?: SupportStatus; assigneeId?: string | null }): Promise<TicketRecord>;
  orderSummary(orderId: string): Promise<OrderSummary | null>;
  batchSummary(batchId: string): Promise<BatchSummary | null>;
}

/**
 * In-app help tickets answered by admins (docs/COMMUNICATIONS.md).
 * Status: a staff reply → AWAITING_USER; an owner reply → OPEN (also reopens RESOLVED); the owner may only mark RESOLVED.
 */
export class SupportService {
  constructor(
    private readonly repo: SupportRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly webUrl: string,
  ) {}

  async open(input: SupportTicketInput, user: Actor) {
    if (input.orderId && (await this.repo.orderOwner(input.orderId)) !== user.id) throw new NotFoundError('Order', input.orderId);
    if (input.batchId && !(await this.repo.batchExists(input.batchId))) throw new NotFoundError('Batch', input.batchId);
    const ticket = await this.repo.create(
      { userId: user.id, subject: input.subject, category: input.category, orderId: input.orderId ?? null, batchId: input.batchId ?? null },
      input.body,
      this.clock.now(),
    );
    const url = this.url(`/admin/support/${ticket.id}`);
    await this.notifier.notifyRole(
      'ADMIN',
      {
        type: 'SUPPORT_TICKET',
        title: 'New support ticket',
        body: `${ticket.user.name}: ${ticket.subject}`,
        data: { ticketId: ticket.id },
        email: () => communicationEmails.supportTicket(ticket.user.name, ticket.subject, input.body, url),
      },
      { channels: ['in-app', 'realtime', 'email'] },
    );
    return this.detail(ticket);
  }

  async list(query: SupportTicketsQuery, user: Actor) {
    const admin = user.role === 'ADMIN';
    const filter: TicketListFilter = { status: query.status, category: query.category, ...(!admin && { userId: user.id }) };
    const { items, total } = await this.repo.list(filter, (query.page - 1) * query.pageSize, query.pageSize);
    return {
      items: items.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        status: t.status,
        user: t.user,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        // The other side spoke last: staff for the owner, the owner for admins (until resolved).
        unreadForMe: admin ? t.lastFromStaff === false && t.status !== 'RESOLVED' : t.lastFromStaff === true,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string, user: Actor) {
    return this.detail(await this.readable(id, user));
  }

  async reply(id: string, body: string, user: Actor) {
    const ticket = await this.readable(id, user);
    const fromStaff = user.role === 'ADMIN' && ticket.userId !== user.id;
    const status: SupportStatus = fromStaff ? 'AWAITING_USER' : 'OPEN';
    await this.repo.addMessage(ticket.id, { authorId: user.id, body, fromStaff }, status, this.clock.now());
    const preview = body.length > 140 ? `${body.slice(0, 139)}…` : body;

    if (fromStaff) {
      const url = this.url(`/support/${ticket.id}`);
      await this.notifier.notify([ticket.userId], {
        type: 'SUPPORT_REPLY',
        title: 'The Azza team replied',
        body: preview,
        data: { ticketId: ticket.id },
        email: (r) => communicationEmails.supportReply(r.name, ticket.subject, body, url),
      });
    } else {
      const url = this.url(`/admin/support/${ticket.id}`);
      await this.notifier.notifyRole(
        'ADMIN',
        {
          type: 'SUPPORT_REPLY',
          title: `New reply · ${ticket.subject}`,
          body: `${ticket.user.name}: ${preview}`,
          data: { ticketId: ticket.id },
          email: () => communicationEmails.supportUserReply(ticket.user.name, ticket.subject, body, url),
        },
        { channels: ['in-app', 'realtime', 'email'] },
      );
    }
    return this.detail((await this.repo.find(ticket.id))!);
  }

  /** Admin: any status and the assignee (an admin, or null). The owner: only `{ status: 'RESOLVED' }`. */
  async update(id: string, input: UpdateSupportTicketInput, user: Actor) {
    const ticket = await this.readable(id, user);
    if (user.role !== 'ADMIN') {
      if (input.assigneeId !== undefined || input.status !== 'RESOLVED') throw new ForbiddenError('You can only mark your ticket as resolved');
      return this.detail(await this.repo.update(ticket.id, { status: 'RESOLVED' }));
    }
    if (input.assigneeId && !(await this.repo.isAdmin(input.assigneeId))) {
      throw new BusinessRuleError('Tickets can only be assigned to an admin', 'INVALID_ASSIGNEE');
    }
    return this.detail(await this.repo.update(ticket.id, { status: input.status, assigneeId: input.assigneeId }));
  }

  /** The ticket owner or an admin. */
  private async readable(id: string, user: Actor) {
    const ticket = await this.repo.find(id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) throw new ForbiddenError();
    return ticket;
  }

  private async detail(ticket: TicketRecord) {
    const [messages, order, batch] = await Promise.all([
      this.repo.messages(ticket.id),
      ticket.orderId ? this.repo.orderSummary(ticket.orderId) : null,
      ticket.batchId ? this.repo.batchSummary(ticket.batchId) : null,
    ]);
    return { ...ticket, messages, order, batch };
  }

  private url(path: string) {
    return `${this.webUrl.replace(/\/$/, '')}${path}`;
  }
}
