import type { OrderStatus, PaymentMethod, Role } from '@azza/shared';
import { NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';

const listInclude = {
  user: { select: { id: true, name: true, email: true } },
  bankAccount: { select: { id: true, bankName: true, iban: true } },
  verifiedBy: { select: { id: true, name: true } },
  enrollment: {
    select: {
      id: true,
      status: true,
      batch: { select: { id: true, code: true, course: { select: { id: true, titleEn: true, titleAr: true } } } },
    },
  },
} as const;

const serialize = <T extends { fxRate: { toNumber(): number } }>(o: T) => ({ ...o, fxRate: o.fxRate.toNumber() });

/** Read model for order screens (lists + detail). Writes go through the services. */
export class OrderQueries {
  constructor(private readonly db: Db) {}

  async get(id: string, viewer: { id: string; role: Role }) {
    const o = await this.db.order.findUnique({ where: { id }, include: { ...listInclude, bankAccount: true } });
    if (!o || (viewer.role !== 'ADMIN' && o.userId !== viewer.id)) throw new NotFoundError('Order', id);
    return serialize(o);
  }

  /** The Stripe Checkout return page knows only the order reference. */
  async byReference(reference: string, viewer: { id: string; role: Role }) {
    const o = await this.db.order.findUnique({ where: { reference }, select: { id: true, userId: true } });
    if (!o || (viewer.role !== 'ADMIN' && o.userId !== viewer.id)) throw new NotFoundError('Order', reference);
    return this.get(o.id, viewer);
  }

  async mine(userId: string) {
    const rows = await this.db.order.findMany({ where: { userId }, include: listInclude, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  async list(f: { statuses?: OrderStatus[]; method?: PaymentMethod; q?: string; skip: number; take: number }) {
    const where = {
      ...(f.statuses && { status: { in: f.statuses } }),
      ...(f.method && { method: f.method }),
      ...(f.q && {
        OR: [
          { reference: { contains: f.q, mode: 'insensitive' as const } },
          { user: { name: { contains: f.q, mode: 'insensitive' as const } } },
          { user: { email: { contains: f.q, mode: 'insensitive' as const } } },
        ],
      }),
    };
    const [items, total] = await this.db.$transaction([
      this.db.order.findMany({ where, include: listInclude, orderBy: [{ receiptUploadedAt: 'asc' }, { createdAt: 'desc' }], skip: f.skip, take: f.take }),
      this.db.order.count({ where }),
    ]);
    return { items: items.map(serialize), total };
  }
}
