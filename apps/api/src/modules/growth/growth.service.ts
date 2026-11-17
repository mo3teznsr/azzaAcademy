import type { Clock } from '../../core/ports';
import type { Db } from '../../infrastructure/db';
import { cohorts, livePlanCount, mrrFils, planChurn, repeatPurchase, signupSources, teacherShares, type PlanRow, type Purchase } from './growth-math';

const DAY = 86_400_000;

export interface GrowthRepository {
  plans(): Promise<PlanRow[]>;
  /** Paid seat orders and paid plan payments: who bought, and when. */
  purchases(): Promise<Purchase[]>;
  teacherEarnings(from: Date, to: Date): Promise<Array<{ teacherId: string; name: string; amountFils: number }>>;
  signups(from: Date, to: Date): Promise<Array<string | null>>;
}

/** `GET /admin/growth`: the numbers a growth review (or an investor) asks for, over the last `days` days. */
export class GrowthService {
  constructor(
    private readonly repo: GrowthRepository,
    private readonly clock: Clock,
  ) {}

  async growth(days = 30) {
    const now = this.clock.now();
    const from = new Date(now.getTime() - days * DAY);
    const [plans, purchases, earnings, signups] = await Promise.all([
      this.repo.plans(),
      this.repo.purchases(),
      this.repo.teacherEarnings(from, now),
      this.repo.signups(from, now),
    ]);
    const mrr = mrrFils(plans);
    return {
      range: { from, to: now, days },
      plans: { mrrFils: mrr, arrFils: mrr * 12, live: livePlanCount(plans), churn: planChurn(plans, from, now) },
      customers: { total: new Set(purchases.map((p) => p.userId)).size, repeat90: repeatPurchase(purchases, now, 90), cohorts: cohorts(purchases, now, 6) },
      teachers: teacherShares(earnings),
      signups: { total: signups.length, sources: signupSources(signups) },
    };
  }
}

export class PrismaGrowthRepository implements GrowthRepository {
  constructor(private readonly db: Db) {}

  plans() {
    return this.db.subscription.findMany({
      where: { status: { not: 'INCOMPLETE' } },
      select: { plan: true, priceFils: true, status: true, createdAt: true, currentPeriodEnd: true },
    });
  }

  async purchases() {
    const [orders, payments] = await Promise.all([
      this.db.order.findMany({ where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { not: null } }, select: { userId: true, paidAt: true } }),
      this.db.subscriptionPayment.findMany({ where: { status: { in: ['PAID', 'REFUNDED'] }, totalFils: { gt: 0 }, paidAt: { not: null } }, select: { userId: true, paidAt: true } }),
    ]);
    return [...orders, ...payments].map((p) => ({ userId: p.userId, at: p.paidAt! }));
  }

  async teacherEarnings(from: Date, to: Date) {
    const rows = await this.db.earning.groupBy({ by: ['teacherId'], where: { createdAt: { gte: from, lt: to } }, _sum: { amountFils: true } });
    const names = await this.db.user.findMany({ where: { id: { in: rows.map((r) => r.teacherId) } }, select: { id: true, name: true } });
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    return rows.map((r) => ({ teacherId: r.teacherId, name: nameOf.get(r.teacherId) ?? '—', amountFils: r._sum.amountFils ?? 0 }));
  }

  async signups(from: Date, to: Date) {
    const users = await this.db.user.findMany({ where: { role: 'STUDENT', createdAt: { gte: from, lt: to } }, select: { acquisition: true } });
    return users.map((u) => u.acquisition);
  }
}
