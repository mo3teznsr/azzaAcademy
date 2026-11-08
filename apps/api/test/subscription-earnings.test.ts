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
    upsertSubscriptionEarning: async (d: Omit<Earn, 'id' | 'payoutId' | 'kind'>) => {
      const found = earnings.find((e) => e.subscriptionPaymentId === d.subscriptionPaymentId && e.kind === 'SUBSCRIPTION');
      if (found) return found;
      const e: Earn = { ...d, id: `e${++seq}`, kind: 'SUBSCRIPTION', payoutId: null };
      earnings.push(e);
      return e;
    },
    subscriptionEarningFor: async (id: string) => earnings.find((e) => e.subscriptionPaymentId === id && e.kind === 'SUBSCRIPTION') ?? null,
    adjustmentsForPayment: async (id: string) =>
      earnings.filter((e) => e.kind === 'REFUND_ADJUSTMENT' && (e.subscriptionPaymentId === id || e.note === `Subscription refund ${id}`)),
    createEarning: async (d: Partial<Earn> & { teacherId: string; kind: string; amountFils: number }) => {
      const e = { courseId: null, subscriptionPaymentId: null, payoutId: null, status: 'AVAILABLE', availableAt: new Date(), ...d, id: `e${++seq}` } as Earn;
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
  });
});
