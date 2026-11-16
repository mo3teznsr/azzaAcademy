import { describe, expect, test } from 'bun:test';
import { cohorts, livePlanCount, mrrFils, planChurn, repeatPurchase, signupSources, teacherShares, type PlanRow } from '../src/modules/growth/growth-math';
import { GrowthService } from '../src/modules/growth/growth.service';

const NOW = new Date('2026-11-16T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const plan = (over: Partial<PlanRow>): PlanRow => ({ plan: 'MONTHLY', priceFils: 4_900, status: 'ACTIVE', createdAt: daysAgo(60), currentPeriodEnd: daysAgo(-10), ...over });

describe('plan revenue and churn', () => {
  test('MRR counts live plans, a yearly one as a twelfth', () => {
    const plans = [plan({}), plan({ plan: 'YEARLY', priceFils: 49_000 }), plan({ status: 'CANCELLING' }), plan({ status: 'EXPIRED' }), plan({ status: 'PAST_DUE' })];
    expect(mrrFils(plans)).toBe(4_900 * 3 + Math.round(49_000 / 12));
    expect(livePlanCount(plans)).toBe(4);
  });

  test('churn: plans running at the start of the window that ended inside it', () => {
    const plans = [
      plan({}), // still running
      plan({ status: 'EXPIRED', currentPeriodEnd: daysAgo(5) }), // ended in the window
      plan({ status: 'EXPIRED', currentPeriodEnd: daysAgo(45) }), // ended before: not counted at all
      plan({ createdAt: daysAgo(3) }), // new in the window: not at start
    ];
    expect(planChurn(plans, daysAgo(30), NOW)).toEqual({ atStart: 2, ended: 1, rate: 0.5 });
    expect(planChurn([], daysAgo(30), NOW).rate).toBeNull();
  });
});

describe('customers', () => {
  const purchases = [
    { userId: 'a', at: daysAgo(150) },
    { userId: 'a', at: daysAgo(120) }, // second within 90 days of the first
    { userId: 'b', at: daysAgo(140) },
    { userId: 'b', at: daysAgo(10) }, // second, but 130 days later
    { userId: 'c', at: daysAgo(20) }, // too recent to judge
  ];

  test('second purchase within 90 days, among customers who had the whole window', () => {
    expect(repeatPurchase(purchases, NOW, 90)).toEqual({ eligible: 2, repeated: 1, rate: 0.5 });
  });

  test('cohorts by first-purchase month, with how many bought again later', () => {
    const rows = cohorts(purchases, NOW, 6);
    expect(rows.map((r) => r.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(rows.find((r) => r.month === '2026-06')).toEqual({ month: '2026-06', customers: 2, returned: 2, rate: 1 });
    expect(rows.find((r) => r.month === '2026-10')).toEqual({ month: '2026-10', customers: 1, returned: 0, rate: 0 });
    expect(rows.find((r) => r.month === '2026-08')!.rate).toBeNull();
  });
});

describe('teachers and sign-ups', () => {
  test('earnings by teacher with the top five share', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ teacherId: `t${i}`, name: `T${i}`, amountFils: (i + 1) * 100 }));
    const out = teacherShares([...rows, { teacherId: 't5', name: 'T5', amountFils: -100 }]);
    expect(out.totalFils).toBe(2_000);
    expect(out.teachers.slice(0, 2).map((t) => t.amountFils)).toEqual([500, 500]); // t5 nets 600 − 100, tying t4
    expect(out.topFiveShare).toBeCloseTo(1_900 / 2_000);
  });

  test('sign-ups by first-touch source', () => {
    expect(
      signupSources([JSON.stringify({ utm_source: 'Instagram' }), JSON.stringify({ utm_source: 'instagram' }), JSON.stringify({ referrer: 'https://www.google.com/search' }), null, 'garbage']),
    ).toEqual([
      { source: 'instagram', signups: 2 },
      { source: 'direct', signups: 2 },
      { source: 'google.com', signups: 1 },
    ]);
  });
});

test('the dashboard puts it together', async () => {
  const service = new GrowthService(
    {
      plans: async () => [plan({}), plan({ plan: 'YEARLY', priceFils: 12_000 })],
      purchases: async () => [{ userId: 'a', at: daysAgo(10) }],
      teacherEarnings: async () => [{ teacherId: 't', name: 'Lina', amountFils: 700 }],
      signups: async () => [null],
    },
    { now: () => NOW },
  );
  const out = await service.growth(30);
  expect(out.plans).toMatchObject({ mrrFils: 5_900, arrFils: 70_800, live: 2 });
  expect(out.customers.total).toBe(1);
  expect(out.teachers.topFiveShare).toBe(1);
  expect(out.signups).toEqual({ total: 1, sources: [{ source: 'direct', signups: 1 }] });
});
