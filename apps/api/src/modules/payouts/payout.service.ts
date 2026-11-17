import { aedToFils, formatMoney, type TeacherBankDetailsInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { addDays, isoDay, zonedToUtc } from '../../core/time';
import { emailsIn } from '../notifications/email-templates';
import type { Notifier } from '../notifications/notification.types';
import type { EarningsAccrual } from '../sessions/session.service';
import type { EarningsCalculator } from './earnings-calculator';
import { cutFor, type SettingsService } from '../settings/settings.service';
import type { PayoutRepository } from './payout.repository';
import { noAuditLog, type AuditLog } from '../audit/audit-log';
import { approvalBlocked } from './payout-approval';
import { addMonthsUtc, sliceClawback, sliceCountFor, splitIntoSlices } from './revenue-slices';

export interface PayoutRules {
  earningHoldDays: number;
  minPayoutFils: number;
}

/** Fixed rules (tests), or a loader awaited at every use (the admin-editable rules, 30 s cache). */
export type PayoutRulesSource = PayoutRules | (() => Promise<PayoutRules>);

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
    private readonly settings: Pick<SettingsService, 'cuts'>,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    private readonly rules: PayoutRulesSource,
    /** Who created, adjusted, approved, exported and paid each run (append-only). */
    private readonly audit: AuditLog = noAuditLog,
  ) {}

  private async currentRules(): Promise<PayoutRules> {
    return typeof this.rules === 'function' ? this.rules() : this.rules;
  }

  // ───────── accrual ─────────

  /**
   * The teacher's share of one paid subscription charge. Idempotent per payment (unique key).
   * Never accrues for unpaid payments, Apple tombstones (REFUNDED, no money), manual-refund cases or admin-authored courses.
   */
  async accrueForSubscriptionPayment(paymentId: string) {
    const rules = await this.currentRules();
    const p = await this.repo.subscriptionPaymentForAccrual(paymentId);
    if (!p || p.status !== 'PAID' || p.reviewNote === 'MANUAL_REFUND_NEEDED' || p.totalFils <= 0 || !p.paidAt) return null;
    const course = p.subscription.course;
    // All-access periods (no course) are split by minutes watched when the period closes (AllAccessEarningsService).
    if (!course?.createdById) return null;
    const net = this.calculator.orderNet({ totalFils: p.totalFils, vatFils: p.vatFils, refundedFils: 0, feeFils: p.feeFils });
    const amountFils = this.calculator.paymentShare(net, cutFor(course, await this.settings.cuts()));
    const hold = rules.earningHoldDays * DAY_MS;
    const slices = sliceCountFor(p.plan ?? 'MONTHLY');
    if (slices === 1) {
      return this.repo.upsertSubscriptionEarning({
        teacherId: course.createdById,
        courseId: course.id,
        subscriptionPaymentId: p.id,
        amountFils,
        status: 'PENDING',
        availableAt: new Date(p.paidAt.getTime() + hold),
      });
    }
    // Yearly: the share is earned month by month over the period the payment covers (deferred revenue), so a refund
    // later in the year only takes back slices that have not been paid out yet. Slice i matures i months after the
    // period starts, plus the usual hold. A payment accrued before slices existed keeps its single row (slice 0 exists).
    const parts = splitIntoSlices(amountFils, slices);
    const existing = await this.repo.subscriptionEarningsFor(p.id);
    // One row holding more than a slice is an earning accrued in full before slices existed: it is left untouched.
    if (existing.length === 1 && existing[0]!.amountFils > parts[0]!) return existing[0]!;
    const start = p.periodStart && p.periodStart > p.paidAt ? p.periodStart : p.paidAt;
    const rows = [];
    for (const [i, part] of parts.entries()) {
      rows.push(
        await this.repo.upsertSubscriptionEarning({
          teacherId: course.createdById,
          courseId: course.id,
          subscriptionPaymentId: p.id,
          sliceIndex: i,
          amountFils: part,
          status: 'PENDING',
          availableAt: new Date(addMonthsUtc(start, i).getTime() + hold),
        }),
      );
    }
    return rows[0]!;
  }

  /**
   * Takes back round(earning × refunded ÷ total) of a refunded charge, given the cumulative refunded amount.
   * Not yet in a payout: the earning is voided (full) or a pending negative row rides with it (partial).
   * Already in a payout: a new negative REFUND_ADJUSTMENT for the difference; the paid earning is untouched.
   * Idempotent: the same cumulative amount changes nothing.
   */
  async reverseSubscriptionPayment(paymentId: string, refundedFils: number) {
    const slices = await this.repo.subscriptionEarningsFor(paymentId);
    if (slices.length > 1) return this.reverseSlicedPayment(paymentId, refundedFils, slices);
    const earning = await this.repo.subscriptionEarningFor(paymentId);
    const p = earning ? await this.repo.subscriptionPaymentForAccrual(paymentId) : null;
    if (!earning || !p || earning.status === 'REVERSED' || earning.amountFils <= 0 || p.totalFils <= 0 || refundedFils <= 0) return null;

    const target = refundedFils >= p.totalFils ? earning.amountFils : Math.min(earning.amountFils, Math.round((earning.amountFils * refundedFils) / p.totalFils));
    const adjustments = (await this.repo.adjustmentsForPayment(paymentId)).filter((a) => a.status !== 'REVERSED');
    const unpaid = earning.payoutId === null && earning.status !== 'PAID';

    if (unpaid && target >= earning.amountFils) {
      for (const a of adjustments.filter((x) => x.payoutId === null)) await this.repo.updateEarning(a.id, { status: 'REVERSED' });
      return this.repo.updateEarning(earning.id, { status: 'REVERSED' });
    }

    const reversed = -adjustments.reduce((s, a) => s + a.amountFils, 0);
    const delta = target - reversed;
    if (delta <= 0) return null;

    const open = adjustments.find((a) => a.payoutId === null && a.status !== 'PAID');
    if (open) return this.repo.updateEarning(open.id, { amountFils: open.amountFils - delta });
    return this.repo.createEarning({
      teacherId: earning.teacherId,
      courseId: earning.courseId ?? undefined,
      // the unique key allows one keyed adjustment per payment; later ones are found again through the note
      ...(adjustments.length === 0 ? { subscriptionPaymentId: paymentId } : {}),
      kind: 'REFUND_ADJUSTMENT',
      amountFils: -delta,
      status: unpaid ? earning.status : 'AVAILABLE',
      availableAt: unpaid ? earning.availableAt : this.clock.now(),
      note: `Subscription refund ${paymentId}`,
    });
  }

  /**
   * A yearly plan accrued in monthly slices: the cumulative refund claws back round(share × refunded ÷ total).
   * Unpaid slices are withdrawn first (latest month first); what is left (part of a slice, or money already paid out)
   * becomes one negative REFUND_ADJUSTMENT that rides with the earliest slice still to come, or is due now when none is.
   * Paid slices are never touched. Idempotent: the same cumulative amount changes nothing.
   */
  private async reverseSlicedPayment(
    paymentId: string,
    refundedFils: number,
    slices: Awaited<ReturnType<PayoutRepository['subscriptionEarningsFor']>>,
  ) {
    const p = await this.repo.subscriptionPaymentForAccrual(paymentId);
    if (!p || p.totalFils <= 0 || refundedFils <= 0) return null;
    const share = slices.reduce((s, e) => s + e.amountFils, 0);
    if (share <= 0) return null;
    const target = refundedFils >= p.totalFils ? share : Math.min(share, Math.round((share * refundedFils) / p.totalFils));
    const adjustments = (await this.repo.adjustmentsForPayment(paymentId)).filter((a) => a.status !== 'REVERSED');
    const state = slices.map((e) => ({
      id: e.id,
      sliceIndex: e.sliceIndex,
      amountFils: e.amountFils,
      unpaid: e.payoutId === null && e.status !== 'PAID',
      reversed: e.status === 'REVERSED',
      availableAt: e.availableAt,
      status: e.status,
    }));
    const clawed = state.filter((s) => s.reversed).reduce((s, e) => s + e.amountFils, 0) - adjustments.reduce((s, a) => s + a.amountFils, 0);
    const plan = sliceClawback(state, target, clawed);
    for (const id of plan.reverse) await this.repo.updateEarning(id, { status: 'REVERSED' });
    if (plan.adjustmentFils <= 0) return plan.reverse.length ? { reversed: plan.reverse.length, adjustmentFils: 0 } : null;

    const first = slices[0]!;
    const next = state.filter((s) => s.unpaid && !s.reversed && !plan.reverse.includes(s.id)).sort((a, b) => a.sliceIndex - b.sliceIndex)[0];
    const open = adjustments.find((a) => a.payoutId === null && a.status !== 'PAID');
    if (open) {
      await this.repo.updateEarning(open.id, { amountFils: open.amountFils - plan.adjustmentFils });
    } else {
      await this.repo.createEarning({
        teacherId: first.teacherId,
        courseId: first.courseId ?? undefined,
        ...(adjustments.length === 0 ? { subscriptionPaymentId: paymentId } : {}),
        kind: 'REFUND_ADJUSTMENT',
        amountFils: -plan.adjustmentFils,
        status: next ? next.status : 'AVAILABLE',
        availableAt: next ? next.availableAt : this.clock.now(),
        note: `Subscription refund ${paymentId}`,
      });
    }
    return { reversed: plan.reverse.length, adjustmentFils: -plan.adjustmentFils };
  }

  /** Idempotent thanks to the unique (sessionId, teacherId, kind) key. */
  async accrueForSession(sessionId: string) {
    const rules = await this.currentRules();
    const s = await this.repo.sessionForAccrual(sessionId);
    if (!s || s.status !== 'ENDED') return null;
    const sessionCount = s.batch.schedule?.sessionCount ?? s.batch._count.sessions;
    const net = this.calculator.batchNet(await this.repo.batchOrders(s.batchId));
    const cutPercent = cutFor(s.batch.course, await this.settings.cuts());
    const amountFils = this.calculator.sessionShare(net, sessionCount, cutPercent);
    const endedAt = s.endedAt ?? s.endsAt;
    return this.repo.upsertSessionEarning({
      teacherId: s.hostId ?? s.batch.teacherId,
      batchId: s.batchId,
      sessionId: s.id,
      amountFils,
      availableAt: new Date(endedAt.getTime() + rules.earningHoldDays * DAY_MS),
    });
  }

  /**
   * When a batch completes: pays the teacher what the delivered sessions earn from the batch's final net, less what was
   * accrued (a TRUE_UP earning, positive or negative, on the usual hold). Idempotent: a rerun finds nothing left to add.
   */
  async trueUpBatch(batchId: string) {
    const rules = await this.currentRules();
    const b = await this.repo.batchForTrueUp(batchId);
    if (!b || b.status !== 'COMPLETED') return null;
    const amountFils = this.calculator.trueUp({
      netFils: this.calculator.batchNet(await this.repo.batchOrders(b.id)),
      cutPercent: cutFor(b.course, await this.settings.cuts()),
      sessionCount: b.schedule?.sessionCount ?? b._count.sessions,
      deliveredSessions: b.sessions.length,
      accruedFils: await this.repo.batchAccrued(b.id),
    });
    if (amountFils === 0) return null;
    return this.repo.createEarning({
      teacherId: b.teacherId,
      batchId: b.id,
      kind: 'TRUE_UP',
      amountFils,
      status: 'PENDING',
      availableAt: new Date(this.clock.now().getTime() + rules.earningHoldDays * DAY_MS),
      note: `Batch ${b.code} final share`,
    });
  }

  async reverseForRefund(args: { batchId: string; refundFils: number; totalFils: number; vatFils: number; reference: string }) {
    const batch = await this.repo.batchForRefund(args.batchId);
    if (!batch) return null;
    const refundNet = this.calculator.orderNet({ totalFils: args.totalFils, vatFils: args.vatFils, refundedFils: args.totalFils - args.refundFils, feeFils: 0 });
    // The refund is already booked on the order, so the net before it is today's net plus the refunded part.
    const netBefore = this.calculator.batchNet(await this.repo.batchOrders(batch.id)) + refundNet;
    const accrued = await this.repo.netAccruedForBatch(batch.id, batch.teacherId);
    const amount = this.calculator.refundReversal(refundNet, netBefore, accrued);
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

    const [earnedThisMonthFils, availableFils, pendingFils, lifetimePaidFils, maturingFils, batches, earnedByBatch, upcoming, ledger, courses] =
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
        this.repo.earnedByCourse(teacherId),
      ]);

    const cuts = await this.settings.cuts();
    const perSession = new Map<string, number>();
    const batchRows = await Promise.all(
      batches.map(async (b) => {
        const sessionCount = b.schedule?.sessionCount ?? 0;
        const money = this.calculator.batchBreakdown(await this.repo.batchOrders(b.id));
        const netRevenueFils = money.netFils;
        const perSessionFils = this.calculator.sessionShare(netRevenueFils, sessionCount, cutFor(b.course, cuts));
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
      /** Recorded (subscription) earnings, grouped by course. */
      courses,
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
        ar: { title: 'بيانات بنكية لمدرّس تحتاج إلى تحقق', body: `${input.accountHolder} · ${input.bankName} ${maskIban(input.iban)}` },
        data: { teacherId: userId },
      },
      { channels: ['in-app', 'realtime'] },
    );
    return details;
  }

  async verifyBankDetails(teacherId: string, actorId: string | null = null) {
    const rules = await this.currentRules();
    if (!(await this.repo.bankDetails(teacherId))) throw new NotFoundError('Bank details for teacher', teacherId);
    const details = await this.repo.verifyBankDetails(teacherId, this.clock.now());
    await this.audit.record({ actorId, action: 'BANK_DETAILS_VERIFIED', entityType: 'TeacherBankDetails', entityId: teacherId });
    // re-evaluate payouts held only because of the bank in draft runs
    for (const p of await this.repo.draftPayoutsOf(teacherId)) {
      const d = this.calculator.payoutDecision({
        amountFils: p.amountFils + p.adjustmentsFils,
        bankVerified: true,
        hasBankDetails: true,
        minPayoutFils: rules.minPayoutFils,
      });
      await this.repo.updatePayout(p.id, { status: d.status, holdReason: d.holdReason });
    }
    return details;
  }

  // ───────── admin payout runs ─────────

  async createRun(input: { periodStart: string; periodEnd: string }, actorId: string | null = null) {
    const rules = await this.currentRules();
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
        minPayoutFils: rules.minPayoutFils,
      });
      return { teacherId, ...agg, ...decision };
    });
    const run = await this.repo.createRun(periodStart, periodEnd, payouts, actorId);
    await this.audit.record({ actorId, action: 'PAYOUT_RUN_CREATED', entityType: 'PayoutRun', entityId: run.id, data: { periodStart: input.periodStart, periodEnd: input.periodEnd, payouts: payouts.length } });
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
    const byCourse = await this.repo.runEarningsByCourse(run.payouts.map((p) => p.id));
    const payouts = run.payouts.map((p) => ({
      ...p,
      totalFils: p.amountFils + p.adjustmentsFils,
      courses: byCourse.filter((c) => c.payoutId === p.id).map(({ payoutId: _p, ...c }) => c),
    }));
    return {
      ...run,
      payouts,
      audit: await this.audit.forEntity('PayoutRun', run.id),
      totals: {
        totalFils: payouts.reduce((s, p) => s + p.totalFils, 0),
        readyFils: payouts.filter((p) => p.status === 'READY' || p.status === 'PAID').reduce((s, p) => s + p.totalFils, 0),
        held: payouts.filter((p) => p.status === 'HELD').length,
        carriedOver: payouts.filter((p) => p.status === 'CARRIED_OVER').length,
      },
    };
  }

  async adjust(input: { payoutId: string; amountAed: number; reason: string }, actorId: string | null = null) {
    const rules = await this.currentRules();
    const payout = await this.repo.findPayout(input.payoutId);
    if (!payout) throw new NotFoundError('Payout', input.payoutId);
    if (payout.run.status !== 'DRAFT') throw new BusinessRuleError('Only draft runs can be adjusted', 'RUN_NOT_DRAFT');
    const amountFils = aedToFils(input.amountAed);
    if (amountFils === 0) throw new BusinessRuleError('Adjustment cannot be zero', 'ZERO_ADJUSTMENT');
    const first = payout.earnings[0];
    const batchId = first?.batchId ?? (first?.courseId ? undefined : (await this.repo.latestBatchOfTeacher(payout.teacherId))?.id);
    const courseId = first?.batchId ? undefined : (first?.courseId ?? undefined);
    if (!batchId && !courseId) throw new BusinessRuleError('Teacher has no batch to attach the adjustment to', 'NO_BATCH');

    await this.repo.createEarning({
      teacherId: payout.teacherId,
      batchId,
      courseId,
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
      minPayoutFils: rules.minPayoutFils,
    });
    await this.repo.updatePayout(payout.id, { adjustmentsFils, status: decision.status, holdReason: decision.holdReason });
    await this.audit.record({ actorId, action: 'PAYOUT_ADJUSTED', entityType: 'PayoutRun', entityId: payout.runId, data: { payoutId: payout.id, teacherId: payout.teacherId, amountFils, reason: input.reason } });
    return this.getRun(payout.runId);
  }

  async approve(id: string, adminId: string) {
    const run = await this.getRun(id);
    if (run.status !== 'DRAFT') throw new BusinessRuleError(`Run is ${run.status}`, 'RUN_NOT_DRAFT');
    const involved = new Set<string>(run.createdById ? [run.createdById] : []);
    for (const e of run.audit) if (e.actorId && (e.action === 'PAYOUT_RUN_CREATED' || e.action === 'PAYOUT_ADJUSTED')) involved.add(e.actorId);
    const admins = await this.repo.activeAdminCount();
    if (approvalBlocked(admins, involved, adminId)) {
      throw new BusinessRuleError('Another admin must approve this run: you created or adjusted it', 'SECOND_ADMIN_REQUIRED');
    }
    await this.repo.updateRun(id, { status: 'APPROVED', approvedById: adminId, approvedAt: this.clock.now() });
    await this.audit.record({ actorId: adminId, action: 'PAYOUT_RUN_APPROVED', entityType: 'PayoutRun', entityId: id, data: { secondPerson: !involved.has(adminId), activeAdmins: admins } });
    return this.getRun(id);
  }

  async exportCsv(id: string, actorId: string | null = null) {
    const run = await this.getRun(id);
    // The file carries full IBANs for the bank upload, so every export is on the record.
    await this.audit.record({ actorId, action: 'PAYOUT_RUN_EXPORTED', entityType: 'PayoutRun', entityId: id });
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

  async markPaid(id: string, transferReference: string, actorId: string | null = null, references: Record<string, string> = {}) {
    const run = await this.getRun(id);
    if (run.status !== 'APPROVED') throw new BusinessRuleError('Approve the run before marking it paid', 'RUN_NOT_APPROVED');
    // A payout sent through the provider is settled by the provider, never by hand.
    if (run.payouts.some((p) => p.status === 'PROCESSING')) {
      throw new BusinessRuleError('Some payouts are still being sent through the payout provider', 'PAYOUTS_PROCESSING');
    }
    const inRun = new Set(run.payouts.map((p) => p.id));
    const foreign = Object.keys(references).filter((k) => !inRun.has(k));
    if (foreign.length) throw new BusinessRuleError('A transfer reference names a payout outside this run', 'UNKNOWN_PAYOUT', { payoutIds: foreign });
    const paid = await this.repo.settleRun(id, transferReference, this.clock.now(), references);
    await this.audit.record({ actorId, action: 'PAYOUT_RUN_PAID', entityType: 'PayoutRun', entityId: id, data: { transferReference, references, paid: paid.length } });
    for (const p of paid) {
      const amount = formatMoney((p.amountFils + p.adjustmentsFils) / 100, 'AED');
      const ref = references[p.id] ?? transferReference;
      await this.notifier.notify([p.teacherId], {
        type: 'PAYOUT_PAID',
        title: `Payout sent · ${amount}`,
        body: `Transfer reference ${ref}`,
        ar: { title: `أُرسلت مستحقاتك · ${amount}`, body: `مرجع التحويل ${ref}` },
        data: { payoutId: p.id },
        email: (r) => emailsIn(r.locale).payoutPaid(r.name, amount, ref),
      });
    }
    return this.getRun(id);
  }
}
