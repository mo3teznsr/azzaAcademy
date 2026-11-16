import { describe, expect, test } from 'bun:test';
import type { AuditEntry, AuditLog } from '../src/modules/audit/audit-log';
import { InvestorService, type InvestorRepository, type MarketingSpendRecord } from '../src/modules/growth/investor.service';
import { addMonths, channelOf, investorCsv, investorMetrics, monthRange, netRevenue, type Payment } from '../src/modules/growth/investor-math';

// "Now" is mid-November 2026: November is the running month, October the last complete one.
const NOW = new Date('2026-11-16T00:00:00Z');
const at = (month: string, day = 10) => new Date(`${month}-${String(day).padStart(2, '0')}T12:00:00Z`);
/** A 105.00 AED payment (100.00 + 5% VAT) with a 3.00 AED fee. */
const pay = (userId: string, month: string, over: Partial<Payment> = {}): Payment => ({ userId, at: at(month), totalFils: 10_500, vatFils: 500, refundedFils: 0, feeFils: 300, ...over });

const run = (payments: Payment[], over: Partial<Parameters<typeof investorMetrics>[0]> = {}) =>
  investorMetrics({ payments, teacherByMonth: new Map(), attribution: new Map(), spend: [], now: NOW, months: 12, ...over });

describe('helpers', () => {
  test('months', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(monthRange('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  test('net revenue drops VAT and refunds, pro rata', () => {
    expect(netRevenue({ totalFils: 10_500, vatFils: 500, refundedFils: 0 })).toBe(10_000);
    expect(netRevenue({ totalFils: 10_500, vatFils: 500, refundedFils: 5_250 })).toBe(5_000);
    expect(netRevenue({ totalFils: 10_500, vatFils: 500, refundedFils: 10_500 })).toBe(0);
    expect(netRevenue({ totalFils: 0, vatFils: 0, refundedFils: 0 })).toBe(0);
  });

  test('first-touch channel', () => {
    expect(channelOf(JSON.stringify({ utm_source: 'Instagram', ref: 'ABCD123' }))).toBe('referral');
    expect(channelOf(JSON.stringify({ utm_source: 'IG' }))).toBe('instagram');
    expect(channelOf({ utm_source: 'tiktok' })).toBe('tiktok');
    expect(channelOf({ utm_source: 'newsletter' })).toBe('other');
    expect(channelOf({ gclid: 'x', referrer: 'https://www.google.com/' })).toBe('google');
    expect(channelOf({ referrer: 'https://www.google.com/' })).toBe('organic');
    expect(channelOf({ landing: '/courses' })).toBe('direct');
    expect(channelOf(null)).toBe('direct');
    expect(channelOf('not json')).toBe('direct');
  });
});

describe('gross margin by month', () => {
  test('net revenue − provider fees − teacher earnings, as a share of net revenue', () => {
    const m = run([pay('a', '2026-10'), pay('b', '2026-10', { refundedFils: 5_250 })], { teacherByMonth: new Map([['2026-10', 6_000]]) });
    const oct = m.monthly.find((r) => r.month === '2026-10')!;
    expect(oct).toMatchObject({ grossFils: 21_000, refundsFils: 5_250, netRevenueFils: 15_000, vatFils: 750, feesFils: 600, teacherFils: 6_000, grossMarginFils: 8_400 });
    expect(oct.grossMarginRate).toBeCloseTo(8_400 / 15_000);
    expect(m.monthly).toHaveLength(12);
    expect(m.monthly.at(-1)).toMatchObject({ month: '2026-11', partial: true, grossMarginRate: null });
  });

  test('Apple commission counts as a fee like Stripe’s', () => {
    const m = run([pay('a', '2026-10', { feeFils: 3_150 })]);
    expect(m.monthly.find((r) => r.month === '2026-10')!.grossMarginFils).toBe(10_000 - 3_150);
  });
});

describe('net revenue retention', () => {
  test('month-k revenue from a cohort ÷ its month-0 revenue, once month k is complete', () => {
    const payments = [
      pay('a', '2026-05'),
      pay('b', '2026-05'),
      pay('a', '2026-08', { totalFils: 21_000, vatFils: 1_000 }), // month 3: 200.00 net from a 200.00 cohort
      pay('c', '2026-09'), // its month 3 is December: not yet
    ];
    const m = run(payments);
    const may = m.nrr.cohorts.find((c) => c.month === '2026-05')!;
    expect(may).toMatchObject({ customers: 2, baseFils: 20_000, m3: 1, m6: null, m12: null });
    expect(m.nrr.cohorts.find((c) => c.month === '2026-09')!.m3).toBeNull();
    expect(m.nrr.overall.m3).toBe(1);
  });
});

describe('CAC, LTV and payback', () => {
  const attribution = new Map<string, unknown>([
    ['a', JSON.stringify({ utm_source: 'instagram' })],
    ['b', JSON.stringify({ utm_source: 'instagram' })],
    ['c', JSON.stringify({ utm_source: 'tiktok' })],
    ['d', JSON.stringify({ referrer: 'https://google.com' })],
    ['e', JSON.stringify({ ref: 'FRIEND1' })],
  ]);
  const payments = ['a', 'b', 'c', 'd', 'e'].map((id) => pay(id, '2026-10'));
  const spend = [
    { month: '2026-10', channel: 'instagram', amountFils: 20_000 },
    { month: '2026-10', channel: 'tiktok', amountFils: 5_000 },
    { month: '2025-01', channel: 'tiktok', amountFils: 99_999 }, // outside the window
  ];
  const m = run(payments, { attribution, spend });

  test('CAC by channel and the acquisition mix', () => {
    const ig = m.channels.find((c) => c.channel === 'instagram')!;
    expect(ig).toMatchObject({ paid: true, newCustomers: 2, spendFils: 20_000, cacFils: 10_000, share: 0.4 });
    expect(m.channels.find((c) => c.channel === 'tiktok')).toMatchObject({ newCustomers: 1, cacFils: 5_000 });
    expect(m.channels.find((c) => c.channel === 'organic')).toMatchObject({ paid: false, newCustomers: 1, cacFils: null });
    expect(m.channels.find((c) => c.channel === 'referral')).toMatchObject({ newCustomers: 1 });
    expect(m.channels.some((c) => c.channel === 'snapchat')).toBe(false);
    expect(m.unitEconomics).toMatchObject({ newCustomers: 5, spendFils: 25_000, blendedCacFils: 5_000, paidCacFils: Math.round(25_000 / 3) });
    expect(m.monthly.find((r) => r.month === '2026-10')).toMatchObject({ newCustomers: 5, spendFils: 25_000, blendedCacFils: 5_000, newByChannel: { instagram: 2, tiktok: 1, organic: 1, referral: 1 } });
  });

  test('LTV so far: average contribution margin per customer', () => {
    expect(m.unitEconomics.historicalLtvFils).toBe(10_000 - 300);
    expect(m.channels.find((c) => c.channel === 'instagram')!.historicalLtvFils).toBe(9_700);
  });

  test('projected LTV = monthly margin per active customer ÷ monthly churn; payback = CAC ÷ monthly margin', () => {
    // p and q pay every month Feb–Oct; r and s pay Mar–May and stop.
    const steady = ['p', 'q'].flatMap((id) => monthRange('2026-10', 9).map((mm) => pay(id, mm)));
    const leavers = ['r', 's'].flatMap((id) => monthRange('2026-05', 3).map((mm) => pay(id, mm)));
    const u = run([...steady, ...leavers]).unitEconomics;
    // Trailing months May–Oct. r and s last paid in May, so they leave the active set at the end of August.
    // Active at the start of each month: May 4, Jun 4, Jul 4, Aug 4, Sep 2, Oct 2 → 20; lost: 2 (in August) → churn 0.1.
    expect(u.monthlyChurn).toBeCloseTo(0.1);
    expect(u.expectedLifetimeMonths).toBeCloseTo(10);
    // Margin: May 4 payments, Jun–Oct 2 each → 4 + 10 = 14 payments × 97.00; active customer-months: 4+4+4+2+2+2 = 18.
    expect(u.monthlyMarginPerActiveFils).toBe(Math.round((14 * 9_700) / 18));
    expect(u.projectedLtvFils).toBe(Math.round(Math.round((14 * 9_700) / 18) * 10));
  });

  test('LTV/CAC and payback use the paid CAC', () => {
    const u = m.unitEconomics;
    // Everyone is new in October, so there is no churn history yet: no projection, but payback is known.
    expect(u.monthlyMarginPerActiveFils).toBe(9_700);
    expect(u.monthlyChurn).toBeNull();
    expect(u.ltvCac).toBeNull();
    expect(u.paybackMonths).toBeCloseTo(Math.round(25_000 / 3) / 9_700);
    expect(m.channels.find((c) => c.channel === 'tiktok')!.paybackMonths).toBeCloseTo(5_000 / 9_700);
    // With a year of history the ratio is projected LTV ÷ paid CAC.
    const history = ['a', 'b'].flatMap((id) => monthRange('2026-09', 8).map((mm) => pay(id, mm)));
    const v = run([...history, pay('z', '2026-03')], { attribution, spend }).unitEconomics;
    expect(v.projectedLtvFils).not.toBeNull();
    expect(v.ltvCac).toBeCloseTo(v.projectedLtvFils! / v.paidCacFils!);
  });

  test('no churn caps the lifetime at five years; no data gives nulls', () => {
    const steady = monthRange('2026-10', 9).map((mm) => pay('p', mm));
    expect(run(steady).unitEconomics.expectedLifetimeMonths).toBe(60);
    const empty = run([]).unitEconomics;
    expect(empty).toMatchObject({ customers: 0, historicalLtvFils: null, monthlyChurn: null, projectedLtvFils: null, blendedCacFils: null, ltvCac: null, paybackMonths: null });
  });
});

describe('CSV export', () => {
  test('one row per month, AED with two decimals, channels as columns', () => {
    const csv = investorCsv(run([pay('a', '2026-10')], { attribution: new Map([['a', { utm_source: 'snapchat' }]]) }));
    const [header, ...rows] = csv.trim().split('\n');
    expect(header!.startsWith('month,partial,gross_aed,vat_aed,refunds_aed,net_revenue_aed,provider_fees_aed,teacher_earnings_aed,gross_margin_aed,gross_margin_rate')).toBe(true);
    expect(header).toContain('new_snapchat');
    expect(rows).toHaveLength(12);
    const oct = rows.find((r) => r.startsWith('2026-10'))!.split(',');
    const col = (name: string) => oct[header!.split(',').indexOf(name)];
    expect(col('net_revenue_aed')).toBe('100.00');
    expect(col('gross_margin_aed')).toBe('97.00');
    expect(col('new_snapchat')).toBe('1');
    expect(rows.at(-1)!.startsWith('2026-11,yes')).toBe(true);
  });
});

describe('InvestorService', () => {
  const make = () => {
    const rows: MarketingSpendRecord[] = [];
    const audit: AuditEntry[] = [];
    const repo: InvestorRepository = {
      payments: async () => [pay('a', '2026-10')],
      teacherByMonth: async () => new Map([['2026-10', 4_000]]),
      attribution: async (ids) => new Map(ids.map((id) => [id, { utm_source: 'instagram' }])),
      spend: async (from) => rows.filter((r) => !from || r.month >= from),
      saveSpend: async (input) => {
        const existing = rows.find((r) => r.month === input.month && r.channel === input.channel);
        if (existing) return Object.assign(existing, { amountFils: input.amountFils });
        const row = { id: `s${rows.length + 1}`, month: input.month, channel: input.channel, amountFils: input.amountFils, note: input.note ?? null, updatedAt: NOW };
        rows.push(row);
        return row;
      },
      deleteSpend: async (id) => {
        const i = rows.findIndex((r) => r.id === id);
        return i < 0 ? null : rows.splice(i, 1)[0]!;
      },
    };
    const log: AuditLog = { record: async (e) => void audit.push(e), forEntity: async () => [] };
    return { service: new InvestorService(repo, { now: () => NOW }, log), rows, audit };
  };

  test('spend saved per month and channel feeds CAC; saving again replaces it; changes are audited', async () => {
    const { service, audit } = make();
    await service.saveSpend({ month: '2026-10', channel: 'instagram', amountFils: 1_000 }, 'admin');
    await service.saveSpend({ month: '2026-10', channel: 'instagram', amountFils: 3_000 }, 'admin');
    expect((await service.spend(12)).items).toHaveLength(1);
    const m = await service.metrics(12);
    expect(m.channels.find((c) => c.channel === 'instagram')).toMatchObject({ newCustomers: 1, spendFils: 3_000, cacFils: 3_000 });
    expect(m.monthly.find((r) => r.month === '2026-10')!.grossMarginFils).toBe(10_000 - 300 - 4_000);
    expect(audit.map((a) => a.action)).toEqual(['MARKETING_SPEND_SAVED', 'MARKETING_SPEND_SAVED']);
    expect((await service.csv(12)).split('\n')[0]).toStartWith('month,');
  });

  test('deleting removes the row and is audited; a missing row is a 404', async () => {
    const { service, rows, audit } = make();
    const row = await service.saveSpend({ month: '2026-09', channel: 'tiktok', amountFils: 500 }, 'admin');
    await service.deleteSpend(row.id, 'admin');
    expect(rows).toHaveLength(0);
    expect(audit.at(-1)!.action).toBe('MARKETING_SPEND_DELETED');
    await expect(service.deleteSpend('nope', 'admin')).rejects.toMatchObject({ status: 404 });
  });
});
