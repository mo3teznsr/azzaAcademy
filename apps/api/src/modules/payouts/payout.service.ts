import { aedToFils, formatMoney, type TeacherBankDetailsInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, isoDay, zonedToUtc } from '../../core/time';
import { appEmails } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { EarningsAccrual } from '../sessions/session.service';
import type { EarningsCalculator } from './earnings-calculator';
import type { PayoutRepository } from './payout.repository';

export interface PayoutRules {
  earningHoldDays: number;
  minPayoutFils: number;
}

/** Implemented here, consumed by payments when money goes back to a student (DIP). */
export interface RefundEarningsReverser {
  reverseForRefund(args: { batchId: string; refundFils: number; totalFils: number; vatFils: number; reference: string }): Promise<unknown>;
}

const DAY_MS = 86_400_000;
const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

function monthStart(now: Date, tz: string, offsetMonths = 0) {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' })
    .format(now)
    .split('-')
    .map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + offsetMonths, 1));
  return zonedToUtc(isoDay(d), '00:00', tz);
}

export class PayoutService implements EarningsAccrual, RefundEarningsReverser {
  constructor(
    private readonly repo: PayoutRepository,
    private readonly calculator: EarningsCalculator,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly rules: PayoutRules,
  ) {}

  // ───────── accrual ─────────

  /** Idempotent thanks to the unique (sessionId, teacherId, kind) key. */
  async accrueForSession(sessionId: string) {
    const s = await this.repo.sessionForAccrual(sessionId);
    if (!s || s.status !== 'ENDED') return null;
    const sessionCount = s.batch.schedule?.sessionCount ?? s.batch._count.sessions;
    const net = this.calculator.batchNet(await this.repo.batchOrders(s.batchId));
    const amountFils = this.calculator.sessionShare(net, sessionCount);
    const endedAt = s.endedAt ?? s.endsAt;
    return this.repo.upsertSessionEarning({
      teacherId: s.hostId ?? s.batch.teacherId,
      batchId: s.batchId,
      sessionId: s.id,
      amountFils,
      availableAt: new Date(endedAt.getTime() + this.rules.earningHoldDays * DAY_MS),
    });
  }

  async reverseForRefund(args: { batchId: string; refundFils: number; totalFils: number; vatFils: number; reference: string }) {
    const batch = await this.repo.batchForRefund(args.batchId);
    if (!batch) return null;
    const refundNet = this.calculator.orderNet({ totalFils: args.totalFils, vatFils: args.vatFils, refundedFils: args.totalFils - args.refundFils, feeFils: 0 });
    const amount = this.calculator.refundReversal(refundNet, batch._count.sessions, batch.schedule?.sessionCount ?? 0);
    if (amount === 0) return null;
    return this.repo.createEarning({
      teacherId: batch.teacherId,
      batchId: batch.id,
      kind: 'REFUND_ADJUSTMENT',
      amountFils: amount,
      status: 'AVAILABLE',
      availableAt: this.clock.now(),
      note: `Refund ${args.reference}`,
    });
  }

  /** Job: PENDING → AVAILABLE once the hold period passed. */
  releaseMatured() {
    return this.repo.releaseMatured(this.clock.now());
  }

  // ───────── teacher ─────────

  async teacherEarnings(teacherId: string) {
    const now = this.clock.now();
    const tz = (await this.repo.teacherTimezone(teacherId))?.timezone ?? 'Asia/Dubai';
    const thisMonth = monthStart(now, tz);
    const nextMonth = monthStart(now, tz, 1);

    const [earnedThisMonthFils, availableFils, pendingFils, lifetimePaidFils, maturingFils, batches, earnedByBatch, upcoming, ledger] =
      await Promise.all([
        this.repo.sumEarnings({ teacherId, createdAt: { gte: thisMonth, lt: nextMonth }, status: { not: 'REVERSED' } }),
        this.repo.sumEarnings({ teacherId, status: 'AVAILABLE' }),
        this.repo.sumEarnings({ teacherId, status: 'PENDING' }),
        this.repo.sumEarnings({ teacherId, status: 'PAID' }),
        this.repo.sumEarnings({ teacherId, status: 'PENDING', availableAt: { lt: nextMonth } }),
        this.repo.teacherBatches(teacherId),
        this.repo.earnedByBatch(teacherId),
        this.repo.scheduledSessions(teacherId, now, nextMonth),
        this.repo.ledger(teacherId, 100),
      ]);

    const perSession = new Map<string, number>();
    const batchRows = await Promise.all(
      batches.map(async (b) => {
        const sessionCount = b.schedule?.sessionCount ?? 0;
        const money = this.calculator.batchBreakdown(await this.repo.batchOrders(b.id));
        const netRevenueFils = money.netFils;
        const perSessionFils = this.calculator.sessionShare(netRevenueFils, sessionCount);
        perSession.set(b.id, perSessionFils);
        return {
          batchId: b.id,
          code: b.code,
          status: b.status,
          course: b.course,
          startsOn: b.startsOn,
          endsOn: b.endsOn,
          activeStudents: b._count.enrollments,
          sessionCount,
          sessionsDelivered: b._count.sessions,
          grossFils: money.grossFils,
          refundsFils: money.refundsFils,
          vatFils: money.vatFils,
          feesFils: money.feesFils,
          netRevenueFils,
          perSessionFils,
          earnedFils: earnedByBatch.get(b.id) ?? 0,
          projectedTotalFils: perSessionFils * sessionCount,
        };
      }),
    );
    const scheduledRestOfMonthFils = upcoming.reduce((sum, s) => sum + (perSession.get(s.batchId) ?? 0), 0);
    const expectedOn = `${new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(nextMonth).slice(0, 8)}05`;

    return {
      summary: {
        earnedThisMonthFils,
        scheduledRestOfMonthFils,
        availableFils,
        pendingFils,
        lifetimePaidFils,
        nextPayout: { expectedOn, estimatedFils: availableFils + maturingFils },
      },
      batches: batchRows,
      ledger,
    };
  }

  async teacherPayouts(teacherId: string) {
    const rows = await this.repo.teacherPayouts(teacherId);
    return { items: rows.map((p) => ({ ...p, totalFils: p.amountFils + p.adjustmentsFils })) };
  }

  async getBankDetails(userId: string) {
    return (await this.repo.bankDetails(userId)) ?? null;
  }

  async putBankDetails(userId: string, input: TeacherBankDetailsInput) {
    const details = await this.repo.upsertBankDetails(userId, input);
    await this.notifier.notifyRole(
      'ADMIN',
      {
        type: 'TEACHER_BANK_DETAILS_CHANGED',
        title: 'Teacher bank details need verification',
        body: `${input.accountHolder} · ${input.bankName} ${maskIban(input.iban)}`,
        data: { teacherId: userId },
      },
      { channels: ['in-app', 'realtime'] },
    );
    return details;
  }

  async verifyBankDetails(teacherId: string) {
    if (!(await this.repo.bankDetails(teacherId))) throw new NotFoundError('Bank details for teacher', teacherId);
    const details = await this.repo.verifyBankDetails(teacherId, this.clock.now());
    // re-evaluate payouts held only because of the bank in draft runs
    for (const p of await this.repo.draftPayoutsOf(teacherId)) {
      const d = this.calculator.payoutDecision({
        amountFils: p.amountFils + p.adjustmentsFils,
        bankVerified: true,
        hasBankDetails: true,
        minPayoutFils: this.rules.minPayoutFils,
      });
      await this.repo.updatePayout(p.id, { status: d.status, holdReason: d.holdReason });
    }
    return details;
  }

  // ───────── admin payout runs ─────────

  async createRun(input: { periodStart: string; periodEnd: string }) {
    const periodStart = new Date(`${input.periodStart}T00:00:00.000Z`);
    const periodEnd = new Date(`${input.periodEnd}T00:00:00.000Z`);
    if (periodEnd < periodStart) throw new BusinessRuleError('periodEnd must be on or after periodStart', 'INVALID_PERIOD');
    if (await this.repo.findRunByPeriod(periodStart, periodEnd)) throw new ConflictError('A payout run already exists for this period');

    await this.releaseMatured();
    const eligible = await this.repo.eligibleEarnings(new Date(`${addDays(input.periodEnd, 1)}T00:00:00.000Z`));
    const byTeacher = new Map<string, { amountFils: number; earningIds: string[] }>();
    for (const e of eligible) {
      const agg = byTeacher.get(e.teacherId) ?? { amountFils: 0, earningIds: [] };
      agg.amountFils += e.amountFils;
      agg.earningIds.push(e.id);
      byTeacher.set(e.teacherId, agg);
    }
    const banks = new Map((await this.repo.teachersBank([...byTeacher.keys()])).map((b) => [b.userId, b]));
    const payouts = [...byTeacher.entries()].map(([teacherId, agg]) => {
      const bank = banks.get(teacherId);
      const decision = this.calculator.payoutDecision({
        amountFils: agg.amountFils,
        hasBankDetails: !!bank,
        bankVerified: bank?.verified ?? false,
        minPayoutFils: this.rules.minPayoutFils,
      });
      return { teacherId, ...agg, ...decision };
    });
    const run = await this.repo.createRun(periodStart, periodEnd, payouts);
    return this.getRun(run.id);
  }

  async listRuns(page: number, pageSize: number) {
    const [rows, total] = await this.repo.listRuns((page - 1) * pageSize, pageSize);
    const items = rows.map(({ payouts, ...r }) => ({
      ...r,
      totalFils: payouts.reduce((s, p) => s + p.amountFils + p.adjustmentsFils, 0),
      readyFils: payouts.filter((p) => p.status === 'READY' || p.status === 'PAID').reduce((s, p) => s + p.amountFils + p.adjustmentsFils, 0),
      heldCount: payouts.filter((p) => p.status === 'HELD').length,
    }));
    return { items, total };
  }

  async getRun(id: string) {
    const run = await this.repo.findRun(id);
    if (!run) throw new NotFoundError('Payout run', id);
    const payouts = run.payouts.map((p) => ({ ...p, totalFils: p.amountFils + p.adjustmentsFils }));
    return {
      ...run,
      payouts,
      totals: {
        totalFils: payouts.reduce((s, p) => s + p.totalFils, 0),
        readyFils: payouts.filter((p) => p.status === 'READY' || p.status === 'PAID').reduce((s, p) => s + p.totalFils, 0),
        held: payouts.filter((p) => p.status === 'HELD').length,
        carriedOver: payouts.filter((p) => p.status === 'CARRIED_OVER').length,
      },
    };
  }

  async adjust(input: { payoutId: string; amountAed: number; reason: string }) {
    const payout = await this.repo.findPayout(input.payoutId);
    if (!payout) throw new NotFoundError('Payout', input.payoutId);
    if (payout.run.status !== 'DRAFT') throw new BusinessRuleError('Only draft runs can be adjusted', 'RUN_NOT_DRAFT');
    const amountFils = aedToFils(input.amountAed);
    if (amountFils === 0) throw new BusinessRuleError('Adjustment cannot be zero', 'ZERO_ADJUSTMENT');
    const batchId = payout.earnings[0]?.batchId ?? (await this.repo.latestBatchOfTeacher(payout.teacherId))?.id;
    if (!batchId) throw new BusinessRuleError('Teacher has no batch to attach the adjustment to', 'NO_BATCH');

    await this.repo.createEarning({
      teacherId: payout.teacherId,
      batchId,
      kind: amountFils > 0 ? 'BONUS' : 'DEDUCTION',
      amountFils,
      status: 'AVAILABLE',
      availableAt: this.clock.now(),
      note: input.reason,
      payoutId: payout.id,
    });
    const adjustmentsFils = payout.adjustmentsFils + amountFils;
    const bank = payout.teacher.bankDetails;
    const decision = this.calculator.payoutDecision({
      amountFils: payout.amountFils + adjustmentsFils,
      hasBankDetails: !!bank,
      bankVerified: bank?.verified ?? false,
      minPayoutFils: this.rules.minPayoutFils,
    });
    await this.repo.updatePayout(payout.id, { adjustmentsFils, status: decision.status, holdReason: decision.holdReason });
    return this.getRun(payout.runId);
  }

  async approve(id: string, adminId: string) {
    const run = await this.getRun(id);
    if (run.status !== 'DRAFT') throw new BusinessRuleError(`Run is ${run.status}`, 'RUN_NOT_DRAFT');
    await this.repo.updateRun(id, { status: 'APPROVED', approvedById: adminId, approvedAt: this.clock.now() });
    return this.getRun(id);
  }

  async exportCsv(id: string) {
    const run = await this.getRun(id);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['teacher_name', 'teacher_email', 'bank_name', 'account_holder', 'iban', 'swift', 'amount_aed', 'status', 'hold_reason'];
    const lines = run.payouts.map((p) =>
      [
        p.teacher.name,
        p.teacher.email,
        p.teacher.bankDetails?.bankName,
        p.teacher.bankDetails?.accountHolder,
        p.teacher.bankDetails?.iban,
        p.teacher.bankDetails?.swift,
        (p.totalFils / 100).toFixed(2),
        p.status,
        p.holdReason,
      ]
        .map(esc)
        .join(','),
    );
    return {
      filename: `payout-run-${isoDay(run.periodStart)}_${isoDay(run.periodEnd)}.csv`,
      csv: [header.join(','), ...lines].join('\n') + '\n',
    };
  }

  async markPaid(id: string, transferReference: string) {
    const run = await this.getRun(id);
    if (run.status !== 'APPROVED') throw new BusinessRuleError('Approve the run before marking it paid', 'RUN_NOT_APPROVED');
    const paid = await this.repo.settleRun(id, transferReference, this.clock.now());
    for (const p of paid) {
      const amount = formatMoney((p.amountFils + p.adjustmentsFils) / 100, 'AED');
      await this.notifier.notify([p.teacherId], {
        type: 'PAYOUT_PAID',
        title: `Payout sent · ${amount}`,
        body: `Transfer reference ${transferReference}`,
        data: { payoutId: p.id },
        email: (r) => appEmails.payoutPaid(r.name, amount, transferReference),
      });
    }
    return this.getRun(id);
  }
}
