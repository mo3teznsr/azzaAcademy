import type { EarningStatus, PayoutRunStatus, PayoutStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export class PrismaPayoutRepository {
  constructor(private readonly db: Db) {}

  sessionForAccrual(sessionId: string) {
    return this.db.liveSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        endedAt: true,
        endsAt: true,
        hostId: true,
        batchId: true,
        batch: { select: { teacherId: true, schedule: { select: { sessionCount: true } }, _count: { select: { sessions: true } } } },
      },
    });
  }

  batchOrders(batchId: string) {
    return this.db.order.findMany({
      where: { enrollment: { batchId }, status: { in: ['PAID', 'REFUNDED'] } },
      select: { totalFils: true, vatFils: true, refundedFils: true, feeFils: true },
    });
  }

  upsertSessionEarning(data: { teacherId: string; batchId: string; sessionId: string; amountFils: number; availableAt: Date; note?: string }) {
    return this.db.earning.upsert({
      where: { sessionId_teacherId_kind: { sessionId: data.sessionId, teacherId: data.teacherId, kind: 'SESSION' } },
      create: { ...data, kind: 'SESSION', status: 'PENDING' },
      update: {},
    });
  }

  createEarning(data: { teacherId: string; batchId: string; kind: string; amountFils: number; status: EarningStatus; availableAt: Date; note?: string; payoutId?: string }) {
    return this.db.earning.create({ data });
  }

  async releaseMatured(now: Date) {
    return (await this.db.earning.updateMany({ where: { status: 'PENDING', availableAt: { lte: now } }, data: { status: 'AVAILABLE' } })).count;
  }

  batchForRefund(batchId: string) {
    return this.db.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        teacherId: true,
        schedule: { select: { sessionCount: true } },
        _count: { select: { sessions: { where: { status: 'ENDED' } } } },
      },
    });
  }

  // ── teacher views ──
  teacherTimezone(teacherId: string) {
    return this.db.user.findUnique({ where: { id: teacherId }, select: { timezone: true } });
  }

  async sumEarnings(where: Parameters<Db['earning']['aggregate']>[0]['where']) {
    return (await this.db.earning.aggregate({ where, _sum: { amountFils: true } }))._sum.amountFils ?? 0;
  }

  teacherBatches(teacherId: string) {
    return this.db.batch.findMany({
      where: { teacherId, status: { not: 'DRAFT' } },
      orderBy: { startsOn: 'desc' },
      select: {
        id: true,
        code: true,
        status: true,
        startsOn: true,
        endsOn: true,
        course: { select: { id: true, titleEn: true, titleAr: true } },
        schedule: { select: { sessionCount: true } },
        _count: { select: { sessions: { where: { status: 'ENDED' } }, enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });
  }

  async earnedByBatch(teacherId: string) {
    const rows = await this.db.earning.groupBy({ by: ['batchId'], where: { teacherId, status: { not: 'REVERSED' } }, _sum: { amountFils: true } });
    return new Map(rows.map((r) => [r.batchId, r._sum.amountFils ?? 0]));
  }

  scheduledSessions(teacherId: string, from: Date, to: Date) {
    return this.db.liveSession.findMany({
      where: { status: 'SCHEDULED', startsAt: { gte: from, lt: to }, OR: [{ hostId: teacherId }, { hostId: null, batch: { teacherId } }] },
      select: { id: true, batchId: true },
    });
  }

  ledger(teacherId: string, take: number) {
    return this.db.earning.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        kind: true,
        amountFils: true,
        status: true,
        availableAt: true,
        createdAt: true,
        note: true,
        payoutId: true,
        batch: { select: { id: true, code: true, course: { select: { titleEn: true, titleAr: true } } } },
        session: { select: { id: true, number: true, title: true, endedAt: true } },
      },
    });
  }

  teacherPayouts(teacherId: string) {
    return this.db.payout.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { run: { select: { id: true, periodStart: true, periodEnd: true, status: true } } },
    });
  }

  bankDetails(userId: string) {
    return this.db.teacherBankDetails.findUnique({ where: { userId } });
  }

  upsertBankDetails(userId: string, data: { bankName: string; accountHolder: string; iban: string; swift: string }) {
    return this.db.teacherBankDetails.upsert({
      where: { userId },
      create: { userId, ...data, verified: false },
      update: { ...data, verified: false, verifiedAt: null },
    });
  }

  verifyBankDetails(userId: string, at: Date) {
    return this.db.teacherBankDetails.update({ where: { userId }, data: { verified: true, verifiedAt: at } });
  }

  // ── payout runs ──
  findRunByPeriod(periodStart: Date, periodEnd: Date) {
    return this.db.payoutRun.findUnique({ where: { periodStart_periodEnd: { periodStart, periodEnd } } });
  }

  eligibleEarnings(before: Date) {
    return this.db.earning.findMany({
      where: { status: 'AVAILABLE', payoutId: null, availableAt: { lt: before } },
      select: { id: true, teacherId: true, amountFils: true, batchId: true },
    });
  }

  teachersBank(teacherIds: string[]) {
    return this.db.teacherBankDetails.findMany({ where: { userId: { in: teacherIds } } });
  }

  async createRun(
    periodStart: Date,
    periodEnd: Date,
    payouts: Array<{ teacherId: string; amountFils: number; status: PayoutStatus; holdReason: string | null; earningIds: string[] }>,
  ) {
    return this.db.$transaction(async (tx) => {
      const run = await tx.payoutRun.create({ data: { periodStart, periodEnd } });
      for (const p of payouts) {
        const payout = await tx.payout.create({
          data: { runId: run.id, teacherId: p.teacherId, amountFils: p.amountFils, status: p.status, holdReason: p.holdReason },
        });
        await tx.earning.updateMany({ where: { id: { in: p.earningIds } }, data: { payoutId: payout.id } });
      }
      return run;
    });
  }

  listRuns(skip: number, take: number) {
    return this.db.$transaction([
      this.db.payoutRun.findMany({
        orderBy: { periodStart: 'desc' },
        skip,
        take,
        include: { _count: { select: { payouts: true } }, payouts: { select: { amountFils: true, adjustmentsFils: true, status: true } } },
      }),
      this.db.payoutRun.count(),
    ]);
  }

  findRun(id: string) {
    return this.db.payoutRun.findUnique({
      where: { id },
      include: {
        payouts: {
          orderBy: { createdAt: 'asc' },
          include: {
            teacher: { select: { id: true, name: true, email: true, bankDetails: true } },
            _count: { select: { earnings: true } },
          },
        },
      },
    });
  }

  updateRun(id: string, data: { status: PayoutRunStatus; approvedById?: string; approvedAt?: Date; paidAt?: Date }) {
    return this.db.payoutRun.update({ where: { id }, data });
  }

  findPayout(id: string) {
    return this.db.payout.findUnique({
      where: { id },
      include: { run: true, earnings: { select: { batchId: true }, take: 1 }, teacher: { select: { bankDetails: true } } },
    });
  }

  latestBatchOfTeacher(teacherId: string) {
    return this.db.batch.findFirst({ where: { teacherId }, orderBy: { startsOn: 'desc' }, select: { id: true } });
  }

  updatePayout(id: string, data: { adjustmentsFils?: number; status?: PayoutStatus; holdReason?: string | null; transferReference?: string; paidAt?: Date }) {
    return this.db.payout.update({ where: { id }, data });
  }

  async settleRun(runId: string, transferReference: string, at: Date) {
    return this.db.$transaction(async (tx) => {
      const payouts = await tx.payout.findMany({ where: { runId } });
      const ready = payouts.filter((p) => p.status === 'READY').map((p) => p.id);
      const notReady = payouts.filter((p) => p.status !== 'READY').map((p) => p.id);
      await tx.payout.updateMany({ where: { id: { in: ready } }, data: { status: 'PAID', transferReference, paidAt: at } });
      await tx.earning.updateMany({ where: { payoutId: { in: ready } }, data: { status: 'PAID' } });
      // held / carried-over money rolls into the next run
      await tx.earning.updateMany({ where: { payoutId: { in: notReady } }, data: { payoutId: null } });
      await tx.payoutRun.update({ where: { id: runId }, data: { status: 'PAID', paidAt: at } });
      return tx.payout.findMany({
        where: { id: { in: ready } },
        include: { teacher: { select: { id: true, name: true } } },
      });
    });
  }

  draftPayoutsOf(teacherId: string) {
    return this.db.payout.findMany({ where: { teacherId, status: 'HELD', run: { status: 'DRAFT' } } });
  }
}

export type PayoutRepository = PrismaPayoutRepository;
