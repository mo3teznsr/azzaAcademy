import type { BatchStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { SEAT_HOLDING } from '../payments/enrollment-state';

/** Batches that can hold seats: anything published and not cancelled. */
const LIVE_BATCH_STATUSES: BatchStatus[] = ['ENROLLING', 'FULL', 'RUNNING', 'COMPLETED'];

const batchSelect = {
  id: true,
  code: true,
  capacity: true,
  status: true,
  course: { select: { id: true, titleEn: true } },
  teacher: { select: { id: true, name: true } },
} as const;

export class PrismaReportRepository {
  constructor(private readonly db: Db) {}

  /** PAID orders (and REFUNDED ones — they were paid too) by `paidAt` in [from, to). */
  paidOrders(from: Date, to: Date) {
    return this.db.order.findMany({
      where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { gte: from, lt: to } },
      select: { totalFils: true, enrollment: { select: { batch: { select: { course: { select: { id: true, titleEn: true } } } } } } },
    });
  }

  /** Money returned on orders refunded (fully → REFUNDED, partially → still PAID) in [from, to); the last update dates the refund. */
  async refundedFils(from: Date, to: Date) {
    const r = await this.db.order.aggregate({
      where: { status: { in: ['PAID', 'REFUNDED'] }, refundedFils: { gt: 0 }, updatedAt: { gte: from, lt: to } },
      _sum: { refundedFils: true },
    });
    return r._sum.refundedFils ?? 0;
  }

  /** Batches open or running at some point in [from, to): created (or started) before `to`, not finished before `from`. */
  batchesActiveIn(from: Date, to: Date) {
    return this.db.batch.findMany({
      where: { status: { in: LIVE_BATCH_STATUSES }, OR: [{ createdAt: { lt: to } }, { startsOn: { lt: to } }], endsOn: { gte: from } },
      orderBy: [{ startsOn: 'asc' }, { code: 'asc' }],
      select: batchSelect,
    });
  }

  runningBatches() {
    return this.db.batch.findMany({ where: { status: 'RUNNING' }, select: batchSelect });
  }

  /** Current held seats (SEAT_HOLDING) and waitlist length per batch. */
  async seatCounts(batchIds: string[]) {
    const rows = batchIds.length
      ? await this.db.enrollment.groupBy({ by: ['batchId', 'status'], where: { batchId: { in: batchIds } }, _count: true })
      : [];
    const out = new Map<string, { seatsHeld: number; waitlistCount: number }>();
    for (const id of batchIds) out.set(id, { seatsHeld: 0, waitlistCount: 0 });
    for (const r of rows) {
      const c = out.get(r.batchId)!;
      if (SEAT_HOLDING.includes(r.status)) c.seatsHeld += r._count;
      else if (r.status === 'WAITLISTED') c.waitlistCount += r._count;
    }
    return out;
  }

  /** ENDED sessions that were scheduled in [from, to) (optionally of one batch), with who taught them. */
  endedSessions(from: Date | null, to: Date | null, batchId?: string) {
    return this.db.liveSession.findMany({
      where: { status: 'ENDED', ...(from && to && { startsAt: { gte: from, lt: to } }), ...(batchId && { batchId }) },
      orderBy: [{ startsAt: 'asc' }, { number: 'asc' }],
      select: {
        id: true,
        batchId: true,
        number: true,
        startsAt: true,
        startedAt: true,
        host: { select: { id: true, name: true } },
        batch: { select: { teacher: { select: { id: true, name: true } } } },
      },
    });
  }

  /** Batches whose last session falls in [from, to) and that are over — for the completion rate. */
  finishedBatches(from: Date, to: Date) {
    return this.db.batch.findMany({
      where: { status: { in: LIVE_BATCH_STATUSES }, endsOn: { gte: from, lt: to } },
      select: { id: true, status: true, sessions: { select: { id: true, status: true } } },
    });
  }

  /** ACTIVE student ids per batch. */
  async activeStudents(batchIds: string[]) {
    const rows = batchIds.length
      ? await this.db.enrollment.findMany({ where: { batchId: { in: batchIds }, status: 'ACTIVE' }, select: { userId: true, batchId: true } })
      : [];
    const out = new Map<string, string[]>();
    for (const r of rows) out.set(r.batchId, [...(out.get(r.batchId) ?? []), r.userId]);
    return out;
  }

  /** Join log (one row per student × session) and corrections over `sessionIds`. */
  async attendance(sessionIds: string[]) {
    if (!sessionIds.length) return { joins: [], marks: [] };
    const [joins, marks] = await Promise.all([
      this.db.attendance.groupBy({ by: ['userId', 'sessionId'], where: { sessionId: { in: sessionIds } } }),
      this.db.attendanceMark.findMany({ where: { sessionId: { in: sessionIds } }, select: { userId: true, sessionId: true, mark: true } }),
    ]);
    return { joins, marks };
  }
}

export type ReportRepository = PrismaReportRepository;
