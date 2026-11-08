import { describe, expect, test } from 'bun:test';
import { ForbiddenError } from '../src/core/errors';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';
import { PayoutService } from '../src/modules/payouts/payout.service';
import type { CutSettings, SettingsRepository } from '../src/modules/settings/settings.repository';
import { cutFor, SettingsService } from '../src/modules/settings/settings.service';

const cuts: CutSettings = { liveCutPercent: 70, recordedCutPercent: 60 };

class FakeSettingsRepo implements SettingsRepository {
  constructor(public value: CutSettings = { liveCutPercent: 70, recordedCutPercent: 60 }) {}
  async getCuts() { return this.value; }
  async saveCuts(c: CutSettings) { this.value = c; return c; }
  async setCourseCut(id: string, p: number | null) { return { id, type: 'LIVE' as const, teacherCutPercent: p }; }
}

describe('cutFor', () => {
  test('uses the default for the course type unless the course overrides it', () => {
    expect(cutFor({ type: 'LIVE', teacherCutPercent: null }, cuts)).toBe(70);
    expect(cutFor({ type: 'RECORDED', teacherCutPercent: null }, cuts)).toBe(60);
    expect(cutFor({ type: 'RECORDED', teacherCutPercent: 85 }, cuts)).toBe(85);
    expect(cutFor({ type: 'LIVE', teacherCutPercent: 0 }, cuts)).toBe(0);
  });
});

describe('SettingsService', () => {
  test('a non-admin cannot update the cuts', async () => {
    const svc = new SettingsService(new FakeSettingsRepo());
    await expect(svc.updateCuts({ liveCutPercent: 50, recordedCutPercent: 50 }, { id: 't1', role: 'TEACHER' })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(svc.setCourseCut('c1', { teacherCutPercent: 50 }, { id: 't1', role: 'TEACHER' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('an admin can update the cuts', async () => {
    const svc = new SettingsService(new FakeSettingsRepo());
    expect(await svc.updateCuts({ liveCutPercent: 55, recordedCutPercent: 65 }, { id: 'a1', role: 'ADMIN' })).toEqual({ liveCutPercent: 55, recordedCutPercent: 65 });
    expect(await svc.cuts()).toEqual({ liveCutPercent: 55, recordedCutPercent: 65 });
  });
});

type Earn = { sessionId: string | null; kind: string; amountFils: number };

/** A payout service over an in-memory earnings list; one batch, net 100_000 before the refund, 10 sessions. */
type Order = { totalFils: number; vatFils: number; refundedFils: number; feeFils: number };
const order = (): Order => ({ totalFils: 105_000, vatFils: 5_000, refundedFils: 0, feeFils: 0 }); // net 100_000

function harness(initial: CutSettings, course = { type: 'LIVE' as const, teacherCutPercent: null as number | null }, orders: Order[] = [order()]) {
  const settingsRepo = new FakeSettingsRepo(initial);
  const settings = new SettingsService(settingsRepo);
  const earnings: Earn[] = [];
  const repo = {
    sessionForAccrual: async (id: string) => ({
      id,
      status: 'ENDED' as const,
      endedAt: new Date('2026-11-01T10:00:00Z'),
      endsAt: new Date('2026-11-01T10:00:00Z'),
      hostId: null,
      batchId: 'b1',
      batch: { teacherId: 't1', course, schedule: { sessionCount: 10 }, _count: { sessions: 10 } },
    }),
    batchOrders: async () => orders.map((o) => ({ ...o })),
    upsertSessionEarning: async (d: { sessionId: string; amountFils: number }) => {
      if (!earnings.some((e) => e.sessionId === d.sessionId && e.kind === 'SESSION')) earnings.push({ sessionId: d.sessionId, kind: 'SESSION', amountFils: d.amountFils });
      return d;
    },
    netAccruedForBatch: async () => earnings.reduce((s, e) => s + e.amountFils, 0),
    batchForRefund: async () => ({ id: 'b1', teacherId: 't1', course, schedule: { sessionCount: 10 }, _count: { sessions: 4 } }),
    createEarning: async (d: { kind: string; amountFils: number }) => {
      earnings.push({ sessionId: null, kind: d.kind, amountFils: d.amountFils });
      return d;
    },
  };
  const svc = new PayoutService(repo as never, new EarningsCalculator(), settings, {} as never, { now: () => new Date('2026-11-02T00:00:00Z') } as never, {
    earningHoldDays: 14,
    minPayoutFils: 0,
  });
  /** Books a refund the way FinanceAdminService does: the order first, then the reversal. Returns the new reversal row. */
  const refund = async (orderIdx: number, refundFils: number) => {
    const o = orders[orderIdx]!;
    o.refundedFils += refundFils;
    const before = earnings.length;
    await svc.reverseForRefund({ batchId: 'b1', refundFils, totalFils: o.totalFils, vatFils: o.vatFils, reference: `R${before}` });
    return earnings.slice(before)[0]?.amountFils ?? 0;
  };
  const refundHalf = () => refund(0, 52_500); // net 50_000
  return { svc, settings, earnings, refund, refundHalf };
}

const admin = { id: 'a1', role: 'ADMIN' as const };

describe('accrueForSession reads the cut at payment time', () => {
  test('changing the live cut from 70 to 50 affects later sessions only', async () => {
    const { svc, settings, earnings } = harness({ liveCutPercent: 70, recordedCutPercent: 60 });
    await svc.accrueForSession('s1');
    await settings.updateCuts({ liveCutPercent: 50, recordedCutPercent: 60 }, admin);
    await svc.accrueForSession('s2');
    await svc.accrueForSession('s1'); // re-accruing is idempotent: the old amount stays

    expect(earnings.find((e) => e.sessionId === 's1')!.amountFils).toBe(7_000); // 70% of 100_000 / 10
    expect(earnings.find((e) => e.sessionId === 's2')!.amountFils).toBe(5_000); // 50%
    expect(earnings.filter((e) => e.sessionId === 's1')).toHaveLength(1);
  });
});

describe('reverseForRefund claws back what was accrued', () => {
  test('(a) a cut changed after accrual does not change the reversal', async () => {
    const { svc, settings, earnings, refundHalf } = harness({ liveCutPercent: 70, recordedCutPercent: 60 });
    for (const id of ['s1', 's2', 's3', 's4']) await svc.accrueForSession(id); // 4 × 7_000 at 70%
    await settings.updateCuts({ liveCutPercent: 50, recordedCutPercent: 60 }, admin);
    await refundHalf();

    const reversal = earnings.find((e) => e.kind === 'REFUND_ADJUSTMENT')!;
    expect(reversal.amountFils).toBe(-14_000); // half of the 28_000 accrued at 70%, not 50%-based -10_000
  });

  test('(b) with an unchanged cut the result equals the old formula', async () => {
    const { svc, earnings, refundHalf } = harness({ liveCutPercent: 60, recordedCutPercent: 60 });
    for (const id of ['s1', 's2', 's3', 's4']) await svc.accrueForSession(id);
    await refundHalf();

    const old = -Math.round(0.6 * ((50_000 * 4) / 10)); // cut × refundNet × delivered ÷ sessionCount
    expect(old).toBe(-12_000);
    expect(earnings.find((e) => e.kind === 'REFUND_ADJUSTMENT')!.amountFils).toBe(old);
  });

  test('(c) successive partial refunds total the old formula, not more', async () => {
    const { svc, earnings, refund } = harness({ liveCutPercent: 60, recordedCutPercent: 60 });
    for (const id of ['s1', 's2', 's3', 's4']) await svc.accrueForSession(id); // accrued 24_000
    expect(await refund(0, 52_500)).toBe(-12_000); // net 50_000 of 100_000
    expect(await refund(0, 26_250)).toBe(-6_000); // net 25_000 of the remaining 50_000: (24_000 - 12_000) × ½
    const total = earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT').reduce((s, e) => s + e.amountFils, 0);
    expect(total).toBe(-Math.round(0.6 * 50_000 * 0.4) - Math.round(0.6 * 25_000 * 0.4)); // -18_000
  });

  test('(d) a second order in the same batch refunded after the first', async () => {
    const { svc, earnings, refund } = harness({ liveCutPercent: 60, recordedCutPercent: 60 }, undefined, [order(), order()]);
    for (const id of ['s1', 's2', 's3', 's4']) await svc.accrueForSession(id); // net 200_000 → 4 × 12_000 = 48_000
    expect(await refund(0, 105_000)).toBe(-24_000); // all of order 1: old 0.6 × 100_000 × 4/10
    expect(await refund(1, 52_500)).toBe(-12_000); // half of order 2: old 0.6 × 50_000 × 4/10
    expect(earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT').reduce((s, e) => s + e.amountFils, 0)).toBe(-36_000);
  });
});
