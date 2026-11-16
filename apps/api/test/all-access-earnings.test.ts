import { describe, expect, test } from 'bun:test';
import type { EarningStatus } from '@azza/shared';
import { shareRefundTarget, splitAllAccessPeriod } from '../src/modules/all-access/all-access-split';
import { AllAccessEarningsService } from '../src/modules/all-access/all-access-earnings.service';
import type {
  AllAccessEarningsRepository,
  AllAccessPeriod,
  AllAccessShareRow,
  NewAllAccessShare,
  ShareReversal,
  WatchedCourseRow,
} from '../src/modules/all-access/all-access.repository';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';

describe('splitAllAccessPeriod (pure)', () => {
  test('net × cut, split by seconds watched', () => {
    // net 10000, 60% cut → pool 6000; watched 3:1 → 4500 / 1500
    const out = splitAllAccessPeriod(10_000, [
      { courseId: 'a', teacherId: 't1', seconds: 3_000, cutPercent: 60 },
      { courseId: 'b', teacherId: 't2', seconds: 1_000, cutPercent: 60 },
    ]);
    expect(out).toEqual([
      { courseId: 'a', teacherId: 't1', watchedSec: 3_000, amountFils: 4_500 },
      { courseId: 'b', teacherId: 't2', watchedSec: 1_000, amountFils: 1_500 },
    ]);
  });

  test('shares always add up to the rounded pool (largest remainder), whatever the input order', () => {
    const watched = [
      { courseId: 'a', teacherId: 't1', seconds: 1, cutPercent: 60 },
      { courseId: 'b', teacherId: 't2', seconds: 1, cutPercent: 60 },
      { courseId: 'c', teacherId: 't3', seconds: 1, cutPercent: 60 },
    ];
    const out = splitAllAccessPeriod(10_001, watched);
    expect(out.reduce((s, x) => s + x.amountFils, 0)).toBe(Math.round(10_001 * 0.6));
    expect(splitAllAccessPeriod(10_001, [...watched].reverse()).sort((x, y) => x.courseId.localeCompare(y.courseId))).toEqual(out);
  });

  test("an admin-written course counts in the minutes but its slice stays with the platform", () => {
    const out = splitAllAccessPeriod(10_000, [
      { courseId: 'a', teacherId: 't1', seconds: 500, cutPercent: 60 },
      { courseId: 'house', teacherId: null, seconds: 500, cutPercent: 60 },
    ]);
    expect(out).toEqual([{ courseId: 'a', teacherId: 't1', watchedSec: 500, amountFils: 3_000 }]);
  });

  test('a course cut override applies to its own slice', () => {
    const out = splitAllAccessPeriod(10_000, [
      { courseId: 'a', teacherId: 't1', seconds: 500, cutPercent: 80 },
      { courseId: 'b', teacherId: 't2', seconds: 500, cutPercent: 60 },
    ]);
    expect(out.map((s) => s.amountFils)).toEqual([4_000, 3_000]);
  });

  test('no watching, or no net, pays nobody', () => {
    expect(splitAllAccessPeriod(10_000, [])).toEqual([]);
    expect(splitAllAccessPeriod(10_000, [{ courseId: 'a', teacherId: 't1', seconds: 0, cutPercent: 60 }])).toEqual([]);
    expect(splitAllAccessPeriod(0, [{ courseId: 'a', teacherId: 't1', seconds: 10, cutPercent: 60 }])).toEqual([]);
  });

  test('refund target: proportional, all of it on a full refund', () => {
    expect(shareRefundTarget(3_000, 2_450, 4_900)).toBe(1_500);
    expect(shareRefundTarget(3_000, 4_900, 4_900)).toBe(3_000);
    expect(shareRefundTarget(3_000, 0, 4_900)).toBe(0);
  });
});

type Earn = { id: string; teacherId: string; courseId: string; kind: string; amountFils: number; status: EarningStatus; payoutId: string | null; availableAt: Date; note?: string };

const PERIOD_START = new Date('2026-10-05T12:00:00Z');
const PERIOD_END = new Date('2026-11-05T12:00:00Z');

class MemAllAccess implements AllAccessEarningsRepository {
  periods = new Map<string, AllAccessPeriod>();
  watched: Array<WatchedCourseRow & { day: Date }> = [];
  earnings: Earn[] = [];
  shares: Array<Omit<AllAccessShareRow, 'earning'> & { earningId: string; paymentId: string }> = [];
  seq = 0;
  async pendingPeriods(now: Date) {
    return [...this.periods.values()].filter((p) => p.allAccess && p.status === 'PAID' && !p.allAccessAccruedAt && p.periodEnd <= now).map((p) => p.id);
  }
  async period(id: string) {
    const p = this.periods.get(id);
    return p ? { ...p } : null;
  }
  async watchedByCourse(_userId: string, from: Date, to: Date) {
    const by = new Map<string, WatchedCourseRow>();
    for (const w of this.watched.filter((x) => x.day >= from && x.day < to)) {
      const row = by.get(w.courseId) ?? { ...w, seconds: 0 };
      row.seconds += w.seconds;
      by.set(w.courseId, row);
    }
    return [...by.values()].map(({ courseId, seconds, createdById, type, teacherCutPercent }) => ({ courseId, seconds, createdById, type, teacherCutPercent }));
  }
  async recordShares(paymentId: string, shares: NewAllAccessShare[], at: Date) {
    const p = this.periods.get(paymentId)!;
    if (p.allAccessAccruedAt) return false;
    p.allAccessAccruedAt = at;
    for (const s of shares) {
      const e: Earn = { id: `e${++this.seq}`, teacherId: s.teacherId, courseId: s.courseId, kind: 'ALL_ACCESS', amountFils: s.amountFils, status: 'PENDING', payoutId: null, availableAt: s.availableAt };
      this.earnings.push(e);
      this.shares.push({ id: `s${this.seq}`, paymentId, courseId: s.courseId, teacherId: s.teacherId, amountFils: s.amountFils, reversedFils: 0, earningId: e.id });
    }
    return true;
  }
  async sharesFor(paymentId: string) {
    return this.shares
      .filter((s) => s.paymentId === paymentId)
      .map((s) => {
        const e = this.earnings.find((x) => x.id === s.earningId)!;
        return { ...s, earning: { id: e.id, status: e.status, payoutId: e.payoutId, availableAt: e.availableAt } };
      });
  }
  async reverseShare(id: string, from: number, to: number, change: ShareReversal) {
    const s = this.shares.find((x) => x.id === id)!;
    if (s.reversedFils !== from) return false;
    s.reversedFils = to;
    if (change.kind === 'VOID') this.earnings.find((e) => e.id === change.earningId)!.status = 'REVERSED';
    else this.earnings.push({ id: `e${++this.seq}`, teacherId: change.teacherId, courseId: change.courseId, kind: 'REFUND_ADJUSTMENT', amountFils: change.amountFils, status: change.status, payoutId: null, availableAt: change.availableAt, note: change.note });
    return true;
  }
}

function harness(over: Partial<AllAccessPeriod> = {}, nowIso = '2026-11-06T00:00:00Z') {
  const repo = new MemAllAccess();
  repo.periods.set('p1', {
    id: 'p1', userId: 'sam', status: 'PAID', reviewNote: null, totalFils: 10_500, vatFils: 500, feeFils: 0, refundedFils: 0, paidAt: PERIOD_START,
    periodStart: PERIOD_START, periodEnd: PERIOD_END, allAccessAccruedAt: null, allAccess: true, ...over,
  });
  const course = (courseId: string, createdById: string | null) => ({ courseId, createdById, type: 'RECORDED' as const, teacherCutPercent: null });
  repo.watched.push(
    { ...course('a', 't1'), seconds: 3_000, day: new Date('2026-10-05T00:00:00Z') }, // the purchase day counts
    { ...course('b', 't2'), seconds: 1_000, day: new Date('2026-10-20T00:00:00Z') },
    { ...course('a', 't1'), seconds: 9_999, day: new Date('2026-11-05T00:00:00Z') }, // the end day opens the next period
  );
  let now = new Date(nowIso);
  const svc = new AllAccessEarningsService(repo, new EarningsCalculator(), { cuts: async () => ({ liveCutPercent: 70, recordedCutPercent: 60 }) }, { now: () => now }, () => 14);
  return { repo, svc, setNow: (iso: string) => (now = new Date(iso)) };
}

describe('AllAccessEarningsService: settling a period', () => {
  test('after the period ends: net (10000) × 60%, split 3:1 by minutes watched in the period, held 14 days', async () => {
    const { repo, svc } = harness();
    expect(await svc.run()).toEqual({ settled: 1 });
    expect(repo.earnings.map((e) => [e.teacherId, e.kind, e.amountFils, e.status])).toEqual([
      ['t1', 'ALL_ACCESS', 4_500, 'PENDING'],
      ['t2', 'ALL_ACCESS', 1_500, 'PENDING'],
    ]);
    expect(repo.earnings[0]!.availableAt.toISOString()).toBe('2026-11-19T12:00:00.000Z');
  });

  test('idempotent: reruns and a second settle of the same period add nothing', async () => {
    const { repo, svc } = harness();
    await svc.run();
    expect(await svc.run()).toEqual({ settled: 0 });
    expect(await svc.settlePeriod('p1')).toBe(false);
    expect(repo.earnings).toHaveLength(2);
  });

  test('nothing is settled while the period is still running', async () => {
    const { repo, svc, setNow } = harness({}, '2026-11-01T00:00:00Z');
    expect(await svc.run()).toEqual({ settled: 0 });
    expect(await svc.settlePeriod('p1')).toBe(false);
    expect(repo.earnings).toHaveLength(0);
    setNow('2026-11-05T12:00:00Z');
    expect(await svc.run()).toEqual({ settled: 1 });
  });

  test('a period with no watching is closed with no earnings', async () => {
    const { repo, svc } = harness();
    repo.watched = [];
    expect(await svc.run()).toEqual({ settled: 1 });
    expect(repo.earnings).toHaveLength(0);
    expect(repo.periods.get('p1')!.allAccessAccruedAt).not.toBeNull();
  });

  test('a per-course payment is never settled here', async () => {
    const { repo, svc } = harness({ allAccess: false });
    expect(await svc.settlePeriod('p1')).toBe(false);
    expect(repo.earnings).toHaveLength(0);
  });
});

describe('AllAccessEarningsService: refunds', () => {
  test('a full refund voids unpaid shares; repeating it changes nothing', async () => {
    const { repo, svc } = harness();
    await svc.run();
    expect(await svc.reversePayment('p1', 10_500)).toEqual({ reversed: 6_000 });
    expect(repo.earnings.map((e) => e.status)).toEqual(['REVERSED', 'REVERSED']);
    expect(await svc.reversePayment('p1', 10_500)).toEqual({ reversed: 0 });
    expect(repo.earnings).toHaveLength(2);
  });

  test('a half refund takes back half of each share as pending adjustments; then the rest on a full refund', async () => {
    const { repo, svc } = harness();
    await svc.run();
    await svc.reversePayment('p1', 5_250);
    const adj = () => repo.earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT');
    expect(adj().map((e) => [e.teacherId, e.amountFils, e.status])).toEqual([['t1', -2_250, 'PENDING'], ['t2', -750, 'PENDING']]);
    await svc.reversePayment('p1', 5_250);
    expect(adj()).toHaveLength(2);
    await svc.reversePayment('p1', 10_500);
    const net = (t: string) => repo.earnings.filter((e) => e.teacherId === t && e.status !== 'REVERSED').reduce((s, e) => s + e.amountFils, 0);
    expect([net('t1'), net('t2')]).toEqual([0, 0]);
  });

  test('a share already paid out is clawed back with an AVAILABLE adjustment', async () => {
    const { repo, svc } = harness();
    await svc.run();
    Object.assign(repo.earnings[0]!, { status: 'PAID', payoutId: 'po1' });
    await svc.reversePayment('p1', 10_500);
    expect(repo.earnings[0]!.status).toBe('PAID');
    expect(repo.earnings.find((e) => e.kind === 'REFUND_ADJUSTMENT')).toMatchObject({ teacherId: 't1', amountFils: -4_500, status: 'AVAILABLE' });
  });

  test('a partial refund before the period closes is applied when it is settled', async () => {
    const { repo, svc } = harness({ refundedFils: 5_250 });
    await svc.run();
    const total = repo.earnings.filter((e) => e.status !== 'REVERSED').reduce((s, e) => s + e.amountFils, 0);
    expect(total).toBe(3_000);
  });

  test('a refund of a period not settled yet records nothing (settling reads the refund)', async () => {
    const { repo, svc } = harness({}, '2026-11-01T00:00:00Z');
    expect(await svc.reversePayment('p1', 10_500)).toEqual({ reversed: 0 });
    expect(repo.earnings).toHaveLength(0);
  });
});
