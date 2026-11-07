import type { SupportCategory, SupportStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { SupportMessageRecord, SupportRepository, TicketListFilter, TicketRecord } from './support.service';

const include = { user: { select: { id: true, name: true, email: true } } };
const authorInclude = { author: { select: { id: true, name: true, image: true } } };

export class PrismaSupportRepository implements SupportRepository {
  constructor(private readonly db: Db) {}

  async orderOwner(orderId: string) {
    return (await this.db.order.findUnique({ where: { id: orderId }, select: { userId: true } }))?.userId ?? null;
  }

  async batchExists(batchId: string) {
    return (await this.db.batch.count({ where: { id: batchId } })) > 0;
  }

  async isAdmin(userId: string) {
    return (await this.db.user.count({ where: { id: userId, role: 'ADMIN', banned: false } })) > 0;
  }

  create(data: { userId: string; subject: string; category: SupportCategory; orderId: string | null; batchId: string | null }, body: string, at: Date) {
    return this.db.supportTicket.create({
      data: { ...data, lastMessageAt: at, messages: { create: { authorId: data.userId, body, fromStaff: false, createdAt: at } } },
      include,
    }) as Promise<TicketRecord>;
  }

  find(id: string) {
    return this.db.supportTicket.findUnique({ where: { id }, include }) as Promise<TicketRecord | null>;
  }

  async list(filter: TicketListFilter, skip: number, take: number) {
    const where = { ...(filter.userId && { userId: filter.userId }), ...(filter.status && { status: filter.status }), ...(filter.category && { category: filter.category }) };
    const [rows, total] = await this.db.$transaction([
      this.db.supportTicket.findMany({
        where,
        include: { ...include, messages: { select: { fromStaff: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take,
      }),
      this.db.supportTicket.count({ where }),
    ]);
    const items = rows.map(({ messages, ...t }) => ({ ...(t as TicketRecord), lastFromStaff: messages[0]?.fromStaff ?? null }));
    return { items, total };
  }

  messages(ticketId: string) {
    return this.db.supportMessage.findMany({ where: { ticketId }, include: authorInclude, orderBy: { createdAt: 'asc' } }) as Promise<SupportMessageRecord[]>;
  }

  async addMessage(ticketId: string, msg: { authorId: string; body: string; fromStaff: boolean }, status: SupportStatus, at: Date) {
    const [message] = await this.db.$transaction([
      this.db.supportMessage.create({ data: { ticketId, ...msg, createdAt: at }, include: authorInclude }),
      this.db.supportTicket.update({ where: { id: ticketId }, data: { status, lastMessageAt: at } }),
    ]);
    return message as SupportMessageRecord;
  }

  update(id: string, data: { status?: SupportStatus; assigneeId?: string | null }) {
    return this.db.supportTicket.update({ where: { id }, data, include }) as Promise<TicketRecord>;
  }

  orderSummary(orderId: string) {
    return this.db.order.findUnique({ where: { id: orderId }, select: { id: true, reference: true, status: true, totalFils: true, createdAt: true } });
  }

  async batchSummary(batchId: string) {
    const b = await this.db.batch.findUnique({ where: { id: batchId }, select: { id: true, code: true, course: { select: { titleEn: true, titleAr: true } } } });
    return b ? { id: b.id, code: b.code, courseTitle: b.course.titleEn, courseTitleAr: b.course.titleAr } : null;
  }
}
