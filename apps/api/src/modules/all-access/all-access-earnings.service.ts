import type { Clock } from '../../core/ports';
import type { EarningsCalculator } from '../payouts/earnings-calculator';
import type { CutSettings } from '../settings/settings.repository';
import { cutFor } from '../settings/settings.service';
import { shareRefundTarget, splitAllAccessPeriod } from './all-access-split';
import type { AllAccessEarningsRepository } from './all-access.repository';
import { periodDays } from './watch-time';

const DAY_MS = 86_400_000;

/**
 * Teacher pay for the all-access plan.
 *
 * Per-course plans pay the author on every charge. An all-access charge can't: who earns it depends on what the
 * subscriber watches during the period. So each paid period is settled once, after it ends (`run`, a scheduler job):
 * net (`orderNet`) × teacher cut, split between the courses by the seconds watched in the period (`LessonWatchTime`,
 * see `splitAllAccessPeriod` and `periodDays`). Each share is an ALL_ACCESS earning held like any other
 * (`earningHoldDays` from the period end) before joining a payout run. Cuts are read when the period is settled.
 *
 * Refunds mirror the per-course rule: each share gives back round(share × refunded ÷ total); an untouched, unpaid share
 * is voided when fully refunded, otherwise a negative REFUND_ADJUSTMENT carries the difference. A refund that lands
 * before the period is settled is applied right after settling (a full refund leaves the period unpaid, so it is
 * never settled at all).
 */
export class AllAccessEarningsService {
  constructor(
    private readonly repo: AllAccessEarningsRepository,
    private readonly calculator: EarningsCalculator,
    private readonly settings: { cuts(): Promise<CutSettings> },
    private readonly clock: Clock,
    private readonly holdDays: () => Promise<number> | number,
  ) {}

  /** The job: settles every period that has ended. Returns how many it settled (0 on reruns). */
  async run(batch = 200) {
    let settled = 0;
    for (const id of await this.repo.pendingPeriods(this.clock.now(), batch)) {
      if (await this.settlePeriod(id)) settled++;
    }
    return { settled };
  }

  /** Works out and records one period's shares. Idempotent: false when it is not ready or already settled. */
  async settlePeriod(paymentId: string): Promise<boolean> {
    const now = this.clock.now();
    const p = await this.repo.period(paymentId);
    if (!p || !p.allAccess || p.allAccessAccruedAt || p.periodEnd.getTime() > now.getTime()) return false;
    const payable = p.status === 'PAID' && p.reviewNote !== 'MANUAL_REFUND_NEEDED' && p.totalFils > 0;
    let shares: Parameters<AllAccessEarningsRepository['recordShares']>[1] = [];
    if (payable) {
      const net = this.calculator.orderNet({ totalFils: p.totalFils, vatFils: p.vatFils, refundedFils: 0, feeFils: p.feeFils });
      const { from, to } = periodDays(p.periodStart, p.periodEnd);
      const [watched, cuts, hold] = await Promise.all([this.repo.watchedByCourse(p.userId, from, to), this.settings.cuts(), this.holdDays()]);
      const availableAt = new Date(p.periodEnd.getTime() + hold * DAY_MS);
      shares = splitAllAccessPeriod(
        net,
        watched.map((w) => ({ courseId: w.courseId, teacherId: w.createdById, seconds: w.seconds, cutPercent: cutFor(w, cuts) })),
      ).map((s) => ({ ...s, availableAt }));
    }
    const claimed = await this.repo.recordShares(p.id, shares, now);
    if (claimed && payable && p.refundedFils > 0) await this.reversePayment(p.id, p.refundedFils);
    return claimed;
  }

  /**
   * Takes back what a refund of an all-access charge earned the teachers, given the cumulative refunded amount.
   * Idempotent: the same amount again changes nothing. A period not settled yet has no shares: settling applies it.
   */
  async reversePayment(paymentId: string, refundedFils: number) {
    const p = await this.repo.period(paymentId);
    if (!p?.allAccess || p.totalFils <= 0 || refundedFils <= 0) return { reversed: 0 };
    let reversed = 0;
    for (const share of await this.repo.sharesFor(paymentId)) {
      const target = shareRefundTarget(share.amountFils, refundedFils, p.totalFils);
      const delta = target - share.reversedFils;
      if (delta <= 0 || share.earning.status === 'REVERSED') continue;
      const unpaid = share.earning.payoutId === null && share.earning.status !== 'PAID';
      const change =
        unpaid && share.reversedFils === 0 && target >= share.amountFils
          ? ({ kind: 'VOID', earningId: share.earning.id } as const)
          : ({
              kind: 'ADJUST',
              teacherId: share.teacherId,
              courseId: share.courseId,
              amountFils: -delta,
              status: unpaid ? share.earning.status : 'AVAILABLE',
              availableAt: unpaid ? share.earning.availableAt : this.clock.now(),
              note: `All-access refund ${paymentId}`,
            } as const);
      if (await this.repo.reverseShare(share.id, share.reversedFils, target, change)) reversed += delta;
    }
    return { reversed };
  }
}
