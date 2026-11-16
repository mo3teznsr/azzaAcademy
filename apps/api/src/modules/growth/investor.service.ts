import type { MarketingSpendInput } from '@azza/shared';
import type { Clock } from '../../core/ports';
import { NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';
import type { AuditLog } from '../audit/audit-log';
import { addMonths, investorCsv, investorMetrics, monthKey, type Payment, type SpendRow } from './investor-math';

export interface MarketingSpendRecord {
  id: string;
  month: string;
  channel: string;
  amountFils: number;
  note: string | null;
  updatedAt: Date;
}

export interface InvestorRepository {
  /** Paid (or later refunded) seat orders and plan payments, with their money. */
  payments(): Promise<Payment[]>;
  /** Teacher earnings summed by the month they were recorded (UTC), every kind, signed. */
  teacherByMonth(): Promise<Map<string, number>>;
  /** First-touch attribution of these customers: their sign-up acquisition, else their first order's attribution. */
  attribution(userIds: string[]): Promise<Map<string, unknown>>;
  spend(fromMonth?: string): Promise<MarketingSpendRecord[]>;
  saveSpend(input: MarketingSpendInput, actorId: string): Promise<MarketingSpendRecord>;
  deleteSpend(id: string): Promise<MarketingSpendRecord | null>;
}

/** `GET /admin/investors`: retention, margin and acquisition economics; plus the marketing spend admins record. */
export class InvestorService {
  constructor(
    private readonly repo: InvestorRepository,
    private readonly clock: Clock,
    private readonly audit: AuditLog,
  ) {}

  async metrics(months = 12) {
    const payments = await this.repo.payments();
    const [teacherByMonth, attribution, spend] = await Promise.all([
      this.repo.teacherByMonth(),
      this.repo.attribution([...new Set(payments.map((p) => p.userId))]),
      this.repo.spend(),
    ]);
    return investorMetrics({ payments, teacherByMonth, attribution, spend: spend as SpendRow[], now: this.clock.now(), months });
  }

  async csv(months = 12) {
    return investorCsv(await this.metrics(months));
  }

  /** Spend rows for the last `months` months (the current one included), newest first. */
  async spend(months = 12) {
    return { items: await this.repo.spend(addMonths(monthKey(this.clock.now()), -(months - 1))) };
  }

  async saveSpend(input: MarketingSpendInput, actorId: string) {
    const row = await this.repo.saveSpend(input, actorId);
    await this.audit.record({ actorId, action: 'MARKETING_SPEND_SAVED', entityType: 'MarketingSpend', entityId: row.id, data: { month: row.month, channel: row.channel, amountFils: row.amountFils } });
    return row;
  }

  async deleteSpend(id: string, actorId: string) {
    const row = await this.repo.deleteSpend(id);
    if (!row) throw new NotFoundError('Marketing spend', id);
    await this.audit.record({ actorId, action: 'MARKETING_SPEND_DELETED', entityType: 'MarketingSpend', entityId: id, data: { month: row.month, channel: row.channel, amountFils: row.amountFils } });
  }
}

const SPEND_SELECT = { id: true, month: true, channel: true, amountFils: true, note: true, updatedAt: true } as const;

export class PrismaInvestorRepository implements InvestorRepository {
  constructor(private readonly db: Db) {}

  async payments() {
    const select = { userId: true, paidAt: true, totalFils: true, vatFils: true, refundedFils: true, feeFils: true } as const;
    const [orders, plans] = await Promise.all([
      this.db.order.findMany({ where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { not: null } }, select }),
      this.db.subscriptionPayment.findMany({ where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { not: null } }, select }),
    ]);
    return [...orders, ...plans].map((p) => ({ userId: p.userId, at: p.paidAt!, totalFils: p.totalFils, vatFils: p.vatFils, refundedFils: p.refundedFils, feeFils: p.feeFils }));
  }

  async teacherByMonth() {
    const rows = await this.db.earning.findMany({ select: { createdAt: true, amountFils: true } });
    const out = new Map<string, number>();
    for (const r of rows) out.set(monthKey(r.createdAt), (out.get(monthKey(r.createdAt)) ?? 0) + r.amountFils);
    return out;
  }

  async attribution(userIds: string[]) {
    const out = new Map<string, unknown>();
    if (!userIds.length) return out;
    const users = await this.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, acquisition: true } });
    for (const u of users) if (u.acquisition) out.set(u.id, u.acquisition);
    const missing = userIds.filter((id) => !out.has(id));
    if (missing.length) {
      const orders = await this.db.order.findMany({
        where: { userId: { in: missing } },
        select: { userId: true, attribution: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      for (const o of orders) if (o.attribution && !out.has(o.userId)) out.set(o.userId, o.attribution);
    }
    return out;
  }

  spend(fromMonth?: string) {
    return this.db.marketingSpend.findMany({ where: fromMonth ? { month: { gte: fromMonth } } : {}, select: SPEND_SELECT, orderBy: [{ month: 'desc' }, { channel: 'asc' }] });
  }

  saveSpend(input: MarketingSpendInput, actorId: string) {
    const data = { amountFils: input.amountFils, note: input.note ?? null, updatedById: actorId };
    return this.db.marketingSpend.upsert({
      where: { month_channel: { month: input.month, channel: input.channel } },
      create: { month: input.month, channel: input.channel, ...data },
      update: data,
      select: SPEND_SELECT,
    });
  }

  async deleteSpend(id: string) {
    const row = await this.db.marketingSpend.findUnique({ where: { id }, select: SPEND_SELECT });
    if (!row) return null;
    await this.db.marketingSpend.delete({ where: { id } });
    return row;
  }
}
