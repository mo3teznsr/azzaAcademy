import type { CourseType, EarningStatus, SubscriptionPaymentStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { EMPTY_ALL_ACCESS_PLAN, type AllAccessPlanRecord } from './all-access-course';

/** The plan's settings row and what the plan opens. */
export interface AllAccessPlanRepository {
  get(): Promise<AllAccessPlanRecord>;
  save(patch: Partial<AllAccessPlanRecord>): Promise<AllAccessPlanRecord>;
  /** Published recorded courses (what the plan opens today). */
  publishedRecordedCount(): Promise<number>;
}

/** One paid all-access period, with what the accrual needs. */
export interface AllAccessPeriod {
  id: string;
  userId: string;
  status: SubscriptionPaymentStatus;
  reviewNote: string | null;
  totalFils: number;
  vatFils: number;
  feeFils: number;
  refundedFils: number;
  paidAt: Date | null;
  periodStart: Date;
  periodEnd: Date;
  allAccessAccruedAt: Date | null;
  /** The payment belongs to an all-access plan (its subscription has no course). */
  allAccess: boolean;
}

/** Seconds the subscriber watched a course on days `from <= day < to`, with the course's author and cut override. */
export interface WatchedCourseRow {
  courseId: string;
  seconds: number;
  createdById: string | null;
  type: CourseType;
  teacherCutPercent: number | null;
}

export interface NewAllAccessShare {
  courseId: string;
  teacherId: string;
  watchedSec: number;
  amountFils: number;
  availableAt: Date;
}

/** A recorded share and the earning it made. */
export interface AllAccessShareRow {
  id: string;
  courseId: string;
  teacherId: string;
  amountFils: number;
  reversedFils: number;
  earning: { id: string; status: EarningStatus; payoutId: string | null; availableAt: Date };
}

/** What a refund does to one share (applied together with moving `reversedFils`, all or nothing). */
export type ShareReversal =
  | { kind: 'VOID'; earningId: string }
  | { kind: 'ADJUST'; teacherId: string; courseId: string; amountFils: number; status: EarningStatus; availableAt: Date; note: string };

export interface AllAccessEarningsRepository {
  /** Ids of PAID all-access payments whose period ended by `now` and has no shares worked out yet (oldest first). */
  pendingPeriods(now: Date, take: number): Promise<string[]>;
  period(paymentId: string): Promise<AllAccessPeriod | null>;
  /** Seconds per course the user watched on days `from <= day < to` (recorded courses only). */
  watchedByCourse(userId: string, from: Date, to: Date): Promise<WatchedCourseRow[]>;
  /**
   * Atomically claims the period (sets `allAccessAccruedAt` while it is still null) and writes one ALL_ACCESS earning and
   * one share per entry. False, writing nothing, when the period was already claimed: reruns are no-ops.
   */
  recordShares(paymentId: string, shares: NewAllAccessShare[], at: Date): Promise<boolean>;
  sharesFor(paymentId: string): Promise<AllAccessShareRow[]>;
  /**
   * Moves the share's `reversedFils` from `from` to `to` and applies `change`, in one transaction. False, changing
   * nothing, when `reversedFils` no longer equals `from` (another delivery of the same refund got there first).
   */
  reverseShare(shareId: string, from: number, to: number, change: ShareReversal): Promise<boolean>;
}

export const ALL_ACCESS_EARNING_KIND = 'ALL_ACCESS';

export class PrismaAllAccessRepository implements AllAccessPlanRepository, AllAccessEarningsRepository {
  constructor(private readonly db: Db) {}

  async get(): Promise<AllAccessPlanRecord> {
    const row = await this.db.allAccessPlan.findUnique({ where: { id: 'default' } });
    return row ?? EMPTY_ALL_ACCESS_PLAN;
  }

  save(patch: Partial<AllAccessPlanRecord>) {
    return this.db.allAccessPlan.upsert({ where: { id: 'default' }, create: { ...EMPTY_ALL_ACCESS_PLAN, ...patch, id: 'default' }, update: patch });
  }

  publishedRecordedCount() {
    return this.db.course.count({ where: { type: 'RECORDED', status: 'PUBLISHED' } });
  }

  async pendingPeriods(now: Date, take: number) {
    const rows = await this.db.subscriptionPayment.findMany({
      where: { status: 'PAID', allAccessAccruedAt: null, periodEnd: { lte: now }, subscription: { courseId: null } },
      orderBy: { periodEnd: 'asc' },
      take,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async period(paymentId: string): Promise<AllAccessPeriod | null> {
    const p = await this.db.subscriptionPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true, userId: true, status: true, reviewNote: true, totalFils: true, vatFils: true, feeFils: true, refundedFils: true,
        paidAt: true, periodStart: true, periodEnd: true, allAccessAccruedAt: true, subscription: { select: { courseId: true } },
      },
    });
    if (!p) return null;
    const { subscription, ...rest } = p;
    return { ...rest, allAccess: subscription.courseId === null };
  }

  async watchedByCourse(userId: string, from: Date, to: Date) {
    const groups = await this.db.lessonWatchTime.groupBy({ by: ['courseId'], where: { userId, day: { gte: from, lt: to } }, _sum: { seconds: true } });
    if (!groups.length) return [];
    const courses = await this.db.course.findMany({
      where: { id: { in: groups.map((g) => g.courseId) }, type: 'RECORDED' },
      select: { id: true, createdById: true, type: true, teacherCutPercent: true },
    });
    const byId = new Map(courses.map((c) => [c.id, c]));
    return groups.flatMap((g) => {
      const c = byId.get(g.courseId);
      return c ? [{ courseId: c.id, seconds: g._sum.seconds ?? 0, createdById: c.createdById, type: c.type, teacherCutPercent: c.teacherCutPercent }] : [];
    });
  }

  recordShares(paymentId: string, shares: NewAllAccessShare[], at: Date) {
    return this.db.$transaction(async (tx) => {
      const claimed = await tx.subscriptionPayment.updateMany({ where: { id: paymentId, allAccessAccruedAt: null }, data: { allAccessAccruedAt: at } });
      if (claimed.count !== 1) return false;
      for (const s of shares) {
        const earning = await tx.earning.create({
          data: { teacherId: s.teacherId, courseId: s.courseId, kind: ALL_ACCESS_EARNING_KIND, amountFils: s.amountFils, status: 'PENDING', availableAt: s.availableAt, note: `All-access ${paymentId}` },
          select: { id: true },
        });
        await tx.allAccessShare.create({
          data: { subscriptionPaymentId: paymentId, courseId: s.courseId, teacherId: s.teacherId, watchedSec: s.watchedSec, amountFils: s.amountFils, earningId: earning.id },
        });
      }
      return true;
    });
  }

  sharesFor(paymentId: string) {
    return this.db.allAccessShare.findMany({
      where: { subscriptionPaymentId: paymentId },
      orderBy: { courseId: 'asc' },
      select: { id: true, courseId: true, teacherId: true, amountFils: true, reversedFils: true, earning: { select: { id: true, status: true, payoutId: true, availableAt: true } } },
    });
  }

  reverseShare(shareId: string, from: number, to: number, change: ShareReversal) {
    return this.db.$transaction(async (tx) => {
      const moved = await tx.allAccessShare.updateMany({ where: { id: shareId, reversedFils: from }, data: { reversedFils: to } });
      if (moved.count !== 1) return false;
      if (change.kind === 'VOID') {
        await tx.earning.update({ where: { id: change.earningId }, data: { status: 'REVERSED' } });
      } else {
        await tx.earning.create({
          data: { teacherId: change.teacherId, courseId: change.courseId, kind: 'REFUND_ADJUSTMENT', amountFils: change.amountFils, status: change.status, availableAt: change.availableAt, note: change.note },
        });
      }
      return true;
    });
  }
}
