import type { AdminReferralRow, MyReferrals, ReferralProgramSettings, ReferralRewardType, ReferralStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { DEFAULT_REFERRAL_PROGRAM, type CouponDraft, type PaymentRef } from './referral-policy';

export interface ReferralUser {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  banned: boolean;
  referralCode: string | null;
}

export interface QualifiedReferral {
  id: string;
  referrer: { id: string; role: string };
  referredId: string;
  payment: PaymentRef;
}

export interface RewardWrite {
  referralId: string;
  at: Date;
  referredCoupon: CouponDraft;
  referrerCoupon: CouponDraft | null;
  referrerBonus: { teacherId: string; amountFils: number; availableAt: Date } | null;
}

export interface ReferralStats {
  joined: number;
  paid: number;
  rewarded: number;
  bonusFils: number;
}

/** Persistence port for the referral program (faked in unit tests). */
export interface ReferralRepository {
  /** The rules (defaults when the row does not exist yet). */
  program(): Promise<ReferralProgramSettings>;
  saveProgram(p: ReferralProgramSettings): Promise<ReferralProgramSettings>;

  findUser(id: string): Promise<ReferralUser | null>;
  findUserByCode(code: string): Promise<ReferralUser | null>;
  /** Sets the code only if the user has none; false when the code is taken by someone else (or they already have one). */
  setReferralCode(userId: string, code: string): Promise<boolean>;
  /** One referrer per user: false when the user is already linked. */
  createReferral(input: { referrerId: string; referredId: string; code: string }): Promise<boolean>;

  pendingReferrals(limit: number): Promise<Array<{ id: string; referredId: string }>>;
  /** The user's paid seat orders and plan payments with money in them (status PAID or REFUNDED, total > 0). */
  paymentsOf(userId: string): Promise<PaymentRef[]>;
  /** PENDING → QUALIFIED with the first payment; false when it was no longer PENDING. */
  markQualified(id: string, payment: PaymentRef, at: Date): Promise<boolean>;
  /** QUALIFIED referrals with their first payment's current refund state. */
  qualifiedReferrals(limit: number): Promise<QualifiedReferral[]>;
  /** QUALIFIED → VOID; false when it was no longer QUALIFIED. */
  markVoid(id: string, at: Date): Promise<boolean>;
  /**
   * QUALIFIED → REWARDED and the rewards created, in one transaction. false (and nothing written) when another run
   * already claimed it, so replays and parallel instances never reward twice.
   */
  reward(input: RewardWrite): Promise<boolean>;

  stats(referrerId: string): Promise<ReferralStats>;
  couponsOf(userId: string): Promise<MyReferrals['coupons']>;
  adminList(input: { page: number; pageSize: number; status?: ReferralStatus }): Promise<{ items: AdminReferralRow[]; total: number }>;
  adminCounts(): Promise<Record<ReferralStatus, number>>;
}

const userSelect = { id: true, name: true, role: true, phone: true, banned: true, referralCode: true } as const;

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

export class PrismaReferralRepository implements ReferralRepository {
  constructor(private readonly db: Db) {}

  async program(): Promise<ReferralProgramSettings> {
    const row = await this.db.referralProgram.findUnique({ where: { id: 1 } });
    if (!row) return { ...DEFAULT_REFERRAL_PROGRAM };
    return {
      enabled: row.enabled,
      rewardType: row.rewardType as ReferralRewardType,
      rewardValue: row.rewardValue,
      couponValidDays: row.couponValidDays,
      teacherBonusFils: row.teacherBonusFils,
    };
  }

  async saveProgram(p: ReferralProgramSettings) {
    await this.db.referralProgram.upsert({ where: { id: 1 }, create: { id: 1, ...p }, update: p });
    return this.program();
  }

  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, select: userSelect });
  }

  findUserByCode(code: string) {
    return this.db.user.findUnique({ where: { referralCode: code }, select: userSelect });
  }

  async setReferralCode(userId: string, code: string) {
    try {
      const r = await this.db.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } });
      return r.count > 0;
    } catch (e) {
      if (isUniqueViolation(e)) return false;
      throw e;
    }
  }

  async createReferral(input: { referrerId: string; referredId: string; code: string }) {
    const r = await this.db.referral.createMany({ data: [input], skipDuplicates: true });
    return r.count > 0;
  }

  pendingReferrals(limit: number) {
    return this.db.referral.findMany({ where: { status: 'PENDING' }, select: { id: true, referredId: true }, orderBy: { createdAt: 'asc' }, take: limit });
  }

  async paymentsOf(userId: string): Promise<PaymentRef[]> {
    const where = { userId, status: { in: ['PAID' as const, 'REFUNDED' as const] }, totalFils: { gt: 0 }, paidAt: { not: null } };
    const [orders, plans] = await Promise.all([
      this.db.order.findMany({ where, select: { id: true, paidAt: true, status: true, refundedFils: true } }),
      this.db.subscriptionPayment.findMany({ where, select: { id: true, paidAt: true, status: true, refundedFils: true } }),
    ]);
    return [
      ...orders.map((o) => ({ kind: 'ORDER' as const, id: o.id, paidAt: o.paidAt!, refunded: o.status === 'REFUNDED' || o.refundedFils > 0 })),
      ...plans.map((p) => ({ kind: 'PLAN' as const, id: p.id, paidAt: p.paidAt!, refunded: p.status === 'REFUNDED' || p.refundedFils > 0 })),
    ];
  }

  async markQualified(id: string, payment: PaymentRef, at: Date) {
    const r = await this.db.referral.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'QUALIFIED', firstPaymentKind: payment.kind, firstPaymentId: payment.id, firstPaidAt: payment.paidAt, qualifiedAt: at },
    });
    return r.count > 0;
  }

  async qualifiedReferrals(limit: number): Promise<QualifiedReferral[]> {
    const rows = await this.db.referral.findMany({
      where: { status: 'QUALIFIED' },
      select: { id: true, referredId: true, firstPaymentKind: true, firstPaymentId: true, firstPaidAt: true, referrer: { select: { id: true, role: true } } },
      orderBy: { qualifiedAt: 'asc' },
      take: limit,
    });
    const out: QualifiedReferral[] = [];
    for (const r of rows) {
      if (!r.firstPaymentId || !r.firstPaidAt) continue;
      const kind = r.firstPaymentKind === 'PLAN' ? 'PLAN' : 'ORDER';
      const state =
        kind === 'ORDER'
          ? await this.db.order.findUnique({ where: { id: r.firstPaymentId }, select: { status: true, refundedFils: true } })
          : await this.db.subscriptionPayment.findUnique({ where: { id: r.firstPaymentId }, select: { status: true, refundedFils: true } });
      out.push({
        id: r.id,
        referredId: r.referredId,
        referrer: r.referrer,
        // A payment that vanished is treated like a refund: no reward.
        payment: { kind, id: r.firstPaymentId, paidAt: r.firstPaidAt, refunded: !state || state.status === 'REFUNDED' || state.refundedFils > 0 },
      });
    }
    return out;
  }

  async markVoid(id: string, at: Date) {
    const r = await this.db.referral.updateMany({ where: { id, status: 'QUALIFIED' }, data: { status: 'VOID', voidedAt: at } });
    return r.count > 0;
  }

  async reward(input: RewardWrite) {
    try {
      return await this.db.$transaction(async (tx) => {
        const claimed = await tx.referral.updateMany({ where: { id: input.referralId, status: 'QUALIFIED' }, data: { status: 'REWARDED', rewardedAt: input.at } });
        if (claimed.count === 0) return false;
        const coupon = (d: CouponDraft) =>
          tx.coupon.create({
            data: { code: d.code, percentOff: d.percentOff, amountOffFils: d.amountOffFils, expiresOn: d.expiresOn, ownerId: d.ownerId, maxRedemptions: 1, perUserLimit: 1 },
            select: { id: true },
          });
        const referred = await coupon(input.referredCoupon);
        const referrer = input.referrerCoupon ? await coupon(input.referrerCoupon) : null;
        const bonus = input.referrerBonus
          ? await tx.earning.create({
              data: {
                teacherId: input.referrerBonus.teacherId,
                kind: 'BONUS',
                amountFils: input.referrerBonus.amountFils,
                status: 'PENDING',
                availableAt: input.referrerBonus.availableAt,
                note: 'Referral bonus',
              },
              select: { id: true },
            })
          : null;
        await tx.referral.update({
          where: { id: input.referralId },
          data: { referredCouponId: referred.id, referrerCouponId: referrer?.id ?? null, referrerEarningId: bonus?.id ?? null },
        });
        return true;
      });
    } catch (e) {
      // A coupon code collision rolls everything back; the next run retries with new codes.
      if (isUniqueViolation(e)) return false;
      throw e;
    }
  }

  async stats(referrerId: string): Promise<ReferralStats> {
    const [groups, bonus] = await Promise.all([
      this.db.referral.groupBy({ by: ['status'], where: { referrerId }, _count: { _all: true } }),
      this.db.earning.aggregate({ where: { teacherId: referrerId, referral: { isNot: null } }, _sum: { amountFils: true } }),
    ]);
    const count = (s: ReferralStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
    return {
      joined: groups.reduce((sum, g) => sum + g._count._all, 0),
      paid: count('QUALIFIED') + count('REWARDED'),
      rewarded: count('REWARDED'),
      bonusFils: bonus._sum.amountFils ?? 0,
    };
  }

  async couponsOf(userId: string) {
    const rows = await this.db.coupon.findMany({
      where: { ownerId: userId },
      select: { code: true, percentOff: true, amountOffFils: true, expiresOn: true, redemptions: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((c) => ({ code: c.code, percentOff: c.percentOff, amountOffFils: c.amountOffFils, expiresOn: c.expiresOn?.toISOString() ?? null, used: c.redemptions > 0 }));
  }

  async adminList(input: { page: number; pageSize: number; status?: ReferralStatus }) {
    const where = input.status ? { status: input.status } : {};
    const [rows, total] = await Promise.all([
      this.db.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          status: true,
          code: true,
          createdAt: true,
          firstPaidAt: true,
          rewardedAt: true,
          voidedAt: true,
          referrer: { select: { id: true, name: true, email: true, role: true } },
          referred: { select: { id: true, name: true, email: true } },
        },
      }),
      this.db.referral.count({ where }),
    ]);
    return {
      total,
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        firstPaidAt: r.firstPaidAt?.toISOString() ?? null,
        rewardedAt: r.rewardedAt?.toISOString() ?? null,
        voidedAt: r.voidedAt?.toISOString() ?? null,
      })),
    };
  }

  async adminCounts() {
    const groups = await this.db.referral.groupBy({ by: ['status'], _count: { _all: true } });
    const out: Record<ReferralStatus, number> = { PENDING: 0, QUALIFIED: 0, REWARDED: 0, VOID: 0 };
    for (const g of groups) out[g.status] = g._count._all;
    return out;
  }
}
