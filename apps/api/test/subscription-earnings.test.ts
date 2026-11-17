import { describe, expect, test } from 'bun:test';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';
import { PayoutService } from '../src/modules/payouts/payout.service';
import { ReportService } from '../src/modules/reports/report.service';
import { SettingsService } from '../src/modules/settings/settings.service';

type Pay = {
  id: string;
  status: string;
  reviewNote: string | null;
  totalFils: number;
  vatFils: number;
  feeFils: number;
  refundedFils: number;
  paidAt: Date | null;
  plan?: 'MONTHLY' | 'YEARLY';
  periodStart?: Date;
  subscription: { course: { id: string; type: 'RECORDED'; teacherCutPercent: number | null; createdById: string | null } };
};
type Earn = {
  id: string;
  teacherId: string;
  courseId: string | null;
  subscriptionPaymentId: string | null;
  kind: string;
  amountFils: number;
  status: 'PENDING' | 'AVAILABLE' | 'PAID' | 'REVERSED';
  availableAt: Date;
  payoutId: string | null;
  note?: string;
  sliceIndex: number;
};

const PAID_AT = new Date('2026-11-01T00:00:00Z');
const payment = (over: Partial<Pay> = {}, createdById: string | null = 't1'): Pay => ({
  id: 'p1',
  status: 'PAID',
  reviewNote: null,
  totalFils: 4900,
  vatFils: 233, // 5% VAT included in the total
  feeFils: 200,
  refundedFils: 0,
  paidAt: PAID_AT,
  subscription: { course: { id: 'c1', type: 'RECORDED', teacherCutPercent: null, createdById } },
  ...over,
});

function harness(pay: Pay = payment()) {
  const payments = new Map([[pay.id, pay]]);
  const earnings: Earn[] = [];
  let seq = 0;
  const repo = {
    subscriptionPaymentForAccrual: async (id: string) => payments.get(id) ?? null,
    upsertSubscriptionEarning: async (d: Omit<Earn, 'id' | 'payoutId' | 'kind' | 'sliceIndex'> & { sliceIndex?: number }) => {
      const sliceIndex = d.sliceIndex ?? 0;
      const found = earnings.find((e) => e.subscriptionPaymentId === d.subscriptionPaymentId && e.kind === 'SUBSCRIPTION' && e.sliceIndex === sliceIndex);
      if (found) return found;
      const e: Earn = { ...d, sliceIndex, id: `e${++seq}`, kind: 'SUBSCRIPTION', payoutId: null };
      earnings.push(e);
      return e;
    },
    subscriptionEarningFor: async (id: string) => earnings.find((e) => e.subscriptionPaymentId === id && e.kind === 'SUBSCRIPTION' && e.sliceIndex === 0) ?? null,
    subscriptionEarningsFor: async (id: string) =>
      earnings.filter((e) => e.subscriptionPaymentId === id && e.kind === 'SUBSCRIPTION').sort((a, b) => a.sliceIndex - b.sliceIndex),
    adjustmentsForPayment: async (id: string) =>
      earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT' && (e.subscriptionPaymentId === id || e.note === `Subscription refund ${id}`)),
    createEarning: async (d: Partial<Earn> & { teacherId: string; kind: string; amountFils: number }) => {
      const e = { courseId: null, subscriptionPaymentId: null, payoutId: null, status: 'AVAILABLE', availableAt: new Date(), sliceIndex: 0, ...d, id: `e${++seq}` } as Earn;
      earnings.push(e);
      return e;
    },
    updateEarning: async (id: string, data: Partial<Earn>) => Object.assign(earnings.find((e) => e.id === id)!, data),
  };
  const settings = new SettingsService({ getCuts: async () => ({ liveCutPercent: 70, recordedCutPercent: 60 }) } as never);
  const svc = new PayoutService(repo as never, new EarningsCalculator(), settings, {} as never, { now: () => new Date('2026-11-02T00:00:00Z') } as never, {
    earningHoldDays: 14,
    minPayoutFils: 0,
  });
  return { svc, earnings, pay };
}

describe('accrueForSubscriptionPayment', () => {
  test('a 4900-fils payment at the 60% recorded cut earns the share of its net', async () => {
    const { svc, earnings } = harness();
    const e = await svc.accrueForSubscriptionPayment('p1');
    // net = 4900 - 233 VAT - 200 fee = 4467; 60% = 2680
    expect(e?.amountFils).toBe(2680);
    expect(earnings).toHaveLength(1);
    expect(earnings[0]).toMatchObject({ teacherId: 't1', courseId: 'c1', subscriptionPaymentId: 'p1', kind: 'SUBSCRIPTION', status: 'PENDING' });
    expect(earnings[0]!.availableAt.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  test('a course with its own cut wins over the default', async () => {
    const p = payment();
    p.subscription.course.teacherCutPercent = 80;
    const { svc } = harness(p);
    expect((await svc.accrueForSubscriptionPayment('p1'))?.amountFils).toBe(3574);
  });

  test('an admin-created course gives no earning', async () => {
    const { svc, earnings } = harness(payment({}, null));
    expect(await svc.accrueForSubscriptionPayment('p1')).toBeNull();
    expect(earnings).toHaveLength(0);
  });

  test('accruing twice gives one earning', async () => {
    const { svc, earnings } = harness();
    await svc.accrueForSubscriptionPayment('p1');
    await svc.accrueForSubscriptionPayment('p1');
    expect(earnings).toHaveLength(1);
  });

  test.each([
    ['not paid', { status: 'AWAITING_REVIEW' }],
    ['an Apple tombstone', { status: 'REFUNDED', totalFils: 0, vatFils: 0, feeFils: 0 }],
    ['a manual refund needed', { reviewNote: 'MANUAL_REFUND_NEEDED' }],
    ['no money', { totalFils: 0, vatFils: 0, feeFils: 0 }],
  ])('%s never accrues', async (_name, over) => {
    const { svc, earnings } = harness(payment(over));
    expect(await svc.accrueForSubscriptionPayment('p1')).toBeNull();
    expect(earnings).toHaveLength(0);
  });

  test('an unknown payment accrues nothing', async () => {
    const { svc } = harness();
    expect(await svc.accrueForSubscriptionPayment('nope')).toBeNull();
  });
});

describe('reverseSubscriptionPayment', () => {
  test('before a payout, a partial refund reduces what the teacher will get and repeats change nothing', async () => {
    const { svc, earnings, pay } = harness();
    await svc.accrueForSubscriptionPayment('p1');
    pay.refundedFils = 2450; // half
    await svc.reverseSubscriptionPayment('p1', 2450);
    await svc.reverseSubscriptionPayment('p1', 2450);
    const live = earnings.filter((e) => e.status !== 'REVERSED');
    expect(live.reduce((s, e) => s + e.amountFils, 0)).toBe(2680 - 1340);
    expect(earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT')).toHaveLength(1);
  });

  test('before a payout, a full refund reverses the earning', async () => {
    const { svc, earnings, pay } = harness();
    await svc.accrueForSubscriptionPayment('p1');
    pay.refundedFils = 4900;
    await svc.reverseSubscriptionPayment('p1', 4900);
    expect(earnings.filter((e) => e.status !== 'REVERSED')).toHaveLength(0);
  });

  test('after a payout run, a refund creates a negative REFUND_ADJUSTMENT and leaves the paid earning untouched', async () => {
    const { svc, earnings, pay } = harness();
    await svc.accrueForSubscriptionPayment('p1');
    Object.assign(earnings[0]!, { status: 'PAID', payoutId: 'po1' });
    pay.refundedFils = 2450;
    await svc.reverseSubscriptionPayment('p1', 2450);
    await svc.reverseSubscriptionPayment('p1', 2450);

    expect(earnings[0]).toMatchObject({ amountFils: 2680, status: 'PAID', payoutId: 'po1' });
    const adj = earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT');
    expect(adj).toHaveLength(1);
    expect(adj[0]).toMatchObject({ teacherId: 't1', courseId: 'c1', subscriptionPaymentId: 'p1', amountFils: -1340, status: 'AVAILABLE', payoutId: null });
  });

  test('a later, larger refund after a payout adds only the difference', async () => {
    const { svc, earnings, pay } = harness();
    await svc.accrueForSubscriptionPayment('p1');
    Object.assign(earnings[0]!, { status: 'PAID', payoutId: 'po1' });
    pay.refundedFils = 2450;
    await svc.reverseSubscriptionPayment('p1', 2450);
    Object.assign(earnings.find((e) => e.kind === 'REFUND_ADJUSTMENT')!, { status: 'PAID', payoutId: 'po2' });
    pay.refundedFils = 4900;
    await svc.reverseSubscriptionPayment('p1', 4900);
    await svc.reverseSubscriptionPayment('p1', 4900);
    const adj = earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT');
    expect(adj.reduce((s, e) => s + e.amountFils, 0)).toBe(-2680);
    expect(adj).toHaveLength(2);
  });

  test('no earning (admin course) or no accrual means nothing to reverse', async () => {
    const { svc, earnings } = harness(payment({}, null));
    expect(await svc.reverseSubscriptionPayment('p1', 4900)).toBeNull();
    expect(earnings).toHaveLength(0);
  });
});

describe('finance report', () => {
  const empty = async () => [];
  const repo = {
    paidOrders: empty,
    refundedFils: async () => 0,
    batchesActiveIn: empty,
    runningBatches: empty,
    endedSessions: empty,
    finishedBatches: empty,
    activeStudents: async () => new Map(),
    seatCounts: async () => new Map(),
    attendance: async () => ({ joins: [], marks: [] }),
    recordedPayments: async () => [
      { totalFils: 4900, vatFils: 233, feeFils: 200, refundedFils: 0 },
      { totalFils: 4900, vatFils: 233, feeFils: 200, refundedFils: 2450 },
    ],
  };
  test('shows recorded revenue as its own line', async () => {
    const svc = new ReportService(repo as never, { now: () => new Date('2026-11-08T10:00:00Z') } as never);
    const r = await svc.report({ from: '2026-11-01', to: '2026-11-08' } as never);
    expect(r.recorded.grossFils).toBe(9800);
    expect(r.recorded.refundsFils).toBe(2450);
    expect(r.recorded.feesFils).toBe(400);
    expect(r.recorded.netFils).toBe(r.recorded.grossFils - r.recorded.refundsFils - r.recorded.feesFils - r.recorded.vatFils);
    expect(r.recorded.vatFils).toBeGreaterThan(0);
    expect(r.recorded.appleVatFils).toBe(0);
  });

  test("VAT on App Store sales is reported apart: Apple collects and pays it", async () => {
    const svc = new ReportService(
      {
        ...repo,
        recordedPayments: async () => [
          { totalFils: 10_500, vatFils: 500, feeFils: 1_500, refundedFils: 0, subscription: { provider: 'APPLE' } },
          { totalFils: 10_500, vatFils: 500, feeFils: 300, refundedFils: 0, subscription: { provider: 'STRIPE' } },
        ],
      } as never,
      { now: () => new Date('2026-11-08T10:00:00Z') } as never,
    );
    const r = await svc.report({ from: '2026-11-01', to: '2026-11-08' } as never);
    expect(r.recorded.vatFils).toBe(1_000);
    expect(r.recorded.appleVatFils).toBe(500);
  });
});

describe('yearly plans: teacher share in 12 monthly slices', () => {
  // 49,000 fils incl. VAT; net = 49000 - 2333 - 2000 = 44667; 60% = 26800 → 12 slices of 2233 (+4 fils on the first four)
  const yearly = () => payment({ plan: 'YEARLY', totalFils: 49_000, vatFils: 2_333, feeFils: 2_000, periodStart: PAID_AT });
  const live = (earnings: Earn[]) => earnings.filter((e) => e.status !== 'REVERSED').reduce((s, e) => s + e.amountFils, 0);

  test('accrues 12 slices that add up to the share, each maturing a month later', async () => {
    const { svc, earnings } = harness(yearly());
    await svc.accrueForSubscriptionPayment('p1');
    await svc.accrueForSubscriptionPayment('p1'); // idempotent
    const slices = earnings.filter((e) => e.kind === 'SUBSCRIPTION');
    expect(slices).toHaveLength(12);
    expect(slices.reduce((s, e) => s + e.amountFils, 0)).toBe(26_800);
    expect(slices.map((e) => e.amountFils).slice(0, 5)).toEqual([2234, 2234, 2234, 2234, 2233]);
    expect(slices[0]!.availableAt.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(slices[1]!.availableAt.toISOString()).toBe('2026-12-15T00:00:00.000Z');
    expect(slices[11]!.availableAt.toISOString()).toBe('2027-10-15T00:00:00.000Z');
  });

  test('a monthly plan still accrues one row', async () => {
    const { svc, earnings } = harness(payment({ plan: 'MONTHLY' }));
    await svc.accrueForSubscriptionPayment('p1');
    expect(earnings).toHaveLength(1);
  });

  test('a yearly earning accrued in full before slices existed is left as it is', async () => {
    const { svc, earnings } = harness(yearly());
    earnings.push({ id: 'old', teacherId: 't1', courseId: 'c1', subscriptionPaymentId: 'p1', kind: 'SUBSCRIPTION', amountFils: 26_800, status: 'PENDING', availableAt: PAID_AT, payoutId: null, sliceIndex: 0 });
    await svc.accrueForSubscriptionPayment('p1');
    expect(earnings).toHaveLength(1);
  });

  test('a full refund before anything was paid withdraws every slice', async () => {
    const { svc, earnings } = harness(yearly());
    await svc.accrueForSubscriptionPayment('p1');
    await svc.reverseSubscriptionPayment('p1', 49_000);
    expect(live(earnings)).toBe(0);
    expect(earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT')).toHaveLength(0);
  });

  test('a refund after three months were paid out only claws back unpaid slices plus the proportional remainder', async () => {
    const { svc, earnings } = harness(yearly());
    await svc.accrueForSubscriptionPayment('p1');
    const slices = earnings.filter((e) => e.kind === 'SUBSCRIPTION');
    for (const s of slices.slice(0, 3)) Object.assign(s, { status: 'PAID', payoutId: 'po1' });
    // full refund: the 9 future slices are withdrawn, the 3 paid ones are clawed back by one adjustment
    await svc.reverseSubscriptionPayment('p1', 49_000);
    await svc.reverseSubscriptionPayment('p1', 49_000);
    expect(slices.slice(3).every((s) => s.status === 'REVERSED')).toBe(true);
    expect(slices.slice(0, 3).every((s) => s.status === 'PAID')).toBe(true);
    const adj = earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT');
    expect(adj).toHaveLength(1);
    expect(adj[0]!.amountFils).toBe(-(2234 * 3));
    expect(adj[0]!.status).toBe('AVAILABLE');
    expect(live(earnings)).toBe(0);
  });

  test('a partial refund withdraws whole future slices and rides the rest with the next unpaid slice', async () => {
    const { svc, earnings } = harness(yearly());
    await svc.accrueForSubscriptionPayment('p1');
    // a quarter refunded: target round(26800 / 4) = 6700 → slices 11, 10 and 9 (2233 each) = 6699, 1 fils left
    await svc.reverseSubscriptionPayment('p1', 12_250);
    await svc.reverseSubscriptionPayment('p1', 12_250);
    const reversed = earnings.filter((e) => e.status === 'REVERSED').map((e) => e.sliceIndex);
    expect(reversed.sort()).toEqual([10, 11, 9].sort());
    const adj = earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT');
    expect(adj).toHaveLength(1);
    expect(adj[0]!.amountFils).toBe(-1);
    expect(adj[0]!.status).toBe('PENDING');
    expect(adj[0]!.availableAt.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(live(earnings)).toBe(26_800 - 6_700);
    // then refunded in full: everything nets to zero
    await svc.reverseSubscriptionPayment('p1', 49_000);
    expect(live(earnings)).toBe(0);
  });
});
