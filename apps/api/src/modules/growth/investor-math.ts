/**
 * Pure investor metrics: gross margin, net revenue retention, CAC, LTV, payback and acquisition mix.
 * Money is integer fils of AED. Months are calendar months in UTC, `YYYY-MM`, like the growth cohorts.
 */

import { MARKETING_CHANNELS, type MarketingChannel } from '@azza/shared';

/** A paid seat order or plan payment (PAID or REFUNDED). */
export interface Payment {
  userId: string;
  at: Date;
  totalFils: number;
  vatFils: number;
  refundedFils: number;
  /** Stripe's fee, or Apple's commission on App Store sales. */
  feeFils: number;
}

export interface SpendRow {
  month: string;
  channel: string;
  amountFils: number;
}

/** Where a paying customer came from: a paid channel, `other` (tagged but not a listed channel), `referral`, `organic` or `direct`. */
export type CustomerChannel = MarketingChannel | 'referral' | 'organic' | 'direct';

export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** `YYYY-MM` shifted by `n` months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return monthKey(new Date(Date.UTC(y, m - 1 + n, 1)));
}

/** The last `count` months ending with `last`, oldest first. */
export function monthRange(last: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(last, i - count + 1));
}

/**
 * Revenue a payment keeps after refunds and VAT: the same rule as `EarningsCalculator.orderNet`, before the fee.
 * VAT belongs to the tax authority and is never revenue.
 */
export function netRevenue(p: Pick<Payment, 'totalFils' | 'vatFils' | 'refundedFils'>): number {
  if (p.totalFils <= 0) return 0;
  return Math.round(((p.totalFils - p.refundedFils) * (p.totalFils - p.vatFils)) / p.totalFils);
}

const ALIASES: Record<string, MarketingChannel> = {
  ig: 'instagram',
  insta: 'instagram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  tt: 'tiktok',
  snapchat: 'snapchat',
  snap: 'snapchat',
  sc: 'snapchat',
  google: 'google',
  adwords: 'google',
  googleads: 'google',
  gads: 'google',
  youtube: 'google',
  facebook: 'facebook',
  fb: 'facebook',
  meta: 'facebook',
};

/**
 * First-touch channel from attribution JSON (text or object). A referral code wins (`referral`); then `utm_source`
 * (a listed channel, or `other` for any other tag); then an ad click id (gclid, ttclid, sccid); then a referring site
 * (`organic`); else `direct`.
 */
export function channelOf(raw: unknown): CustomerChannel {
  let a: Record<string, unknown> | null = null;
  try {
    a = typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  } catch {
    return 'direct';
  }
  if (!a) return 'direct';
  const str = (k: string) => (typeof a[k] === 'string' && (a[k] as string).trim() ? (a[k] as string).trim().toLowerCase() : null);
  if (str('ref')) return 'referral';
  const source = str('utm_source');
  if (source) return ALIASES[source.replace(/[^a-z]/g, '')] ?? 'other';
  if (str('gclid')) return 'google';
  if (str('ttclid')) return 'tiktok';
  if (str('sccid')) return 'snapchat';
  if (str('referrer')) return 'organic';
  return 'direct';
}

export const PAID_CHANNELS: readonly MarketingChannel[] = MARKETING_CHANNELS;
const isPaid = (c: string): c is MarketingChannel => (PAID_CHANNELS as readonly string[]).includes(c);

export interface MonthRow {
  month: string;
  /** The current month, still running. */
  partial: boolean;
  grossFils: number;
  vatFils: number;
  refundsFils: number;
  /** After refunds and VAT. */
  netRevenueFils: number;
  feesFils: number;
  teacherFils: number;
  /** Net revenue − provider fees − teacher earnings. */
  grossMarginFils: number;
  grossMarginRate: number | null;
  /** Customers who paid this month. */
  activeCustomers: number;
  /** Customers whose first payment was this month. */
  newCustomers: number;
  newByChannel: Partial<Record<CustomerChannel, number>>;
  spendFils: number;
  /** All marketing spend ÷ all new paying customers (organic included). */
  blendedCacFils: number | null;
}

export interface InvestorInput {
  payments: Payment[];
  /** Teacher earnings (every kind, signed) by the month they were recorded. */
  teacherByMonth: Map<string, number>;
  /** First-touch attribution per customer (user.acquisition, else their first order's attribution). */
  attribution: Map<string, unknown>;
  spend: SpendRow[];
  now: Date;
  /** Months in the table, the current one included. */
  months: number;
}

const ratio = (a: number, b: number) => (b ? a / b : null);
const sumBy = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

/** Lifetime cap for the projected LTV, so a month with almost no churn can't produce an absurd number. */
export const MAX_LIFETIME_MONTHS = 60;
/** A customer stays "active" for this many months after a payment (a course runs for weeks, not every month). */
export const ACTIVE_WINDOW_MONTHS = 3;
/** Complete months averaged for churn and monthly margin per customer. */
export const TRAILING_MONTHS = 6;

export function investorMetrics(input: InvestorInput) {
  const current = monthKey(input.now);
  const months = monthRange(current, input.months);
  const inWindow = new Set(months);

  // Per-month money.
  const money = new Map<string, { gross: number; vat: number; refunds: number; net: number; fees: number; active: Set<string> }>();
  const monthOf = (m: string) => {
    let row = money.get(m);
    if (!row) money.set(m, (row = { gross: 0, vat: 0, refunds: 0, net: 0, fees: 0, active: new Set() }));
    return row;
  };
  // Per customer: first payment month and per-month net revenue.
  const firstMonth = new Map<string, string>();
  const customerNet = new Map<string, Map<string, number>>();
  const customerFees = new Map<string, Map<string, number>>();
  for (const p of input.payments) {
    const m = monthKey(p.at);
    const row = monthOf(m);
    const net = netRevenue(p);
    row.gross += p.totalFils;
    row.refunds += p.refundedFils;
    row.net += net;
    row.vat += p.totalFils - p.refundedFils - net;
    row.fees += p.feeFils;
    row.active.add(p.userId);
    if (!firstMonth.has(p.userId) || m < firstMonth.get(p.userId)!) firstMonth.set(p.userId, m);
    const nets = customerNet.get(p.userId) ?? new Map<string, number>();
    nets.set(m, (nets.get(m) ?? 0) + net);
    customerNet.set(p.userId, nets);
    const fees = customerFees.get(p.userId) ?? new Map<string, number>();
    fees.set(m, (fees.get(m) ?? 0) + p.feeFils);
    customerFees.set(p.userId, fees);
  }

  const marginOfMonth = (m: string) => {
    const r = money.get(m);
    return (r?.net ?? 0) - (r?.fees ?? 0) - (input.teacherByMonth.get(m) ?? 0);
  };
  /** Teacher earnings as a share of the month's net revenue, to charge each payment its part of the teacher cost. */
  const teacherShare = (m: string) => {
    const net = money.get(m)?.net ?? 0;
    return net > 0 ? (input.teacherByMonth.get(m) ?? 0) / net : 0;
  };

  const channel = new Map<string, CustomerChannel>();
  for (const id of firstMonth.keys()) channel.set(id, channelOf(input.attribution.get(id)));

  const spendBy = new Map<string, number>(); // `${month}|${channel}`
  for (const s of input.spend) spendBy.set(`${s.month}|${s.channel}`, (spendBy.get(`${s.month}|${s.channel}`) ?? 0) + s.amountFils);
  const spendIn = (m: string) => sumBy(input.spend.filter((s) => s.month === m), (s) => s.amountFils);

  const newIn = new Map<string, string[]>();
  for (const [id, m] of firstMonth) newIn.set(m, [...(newIn.get(m) ?? []), id]);

  // 1. The monthly table.
  const monthly: MonthRow[] = months.map((m) => {
    const r = money.get(m);
    const net = r?.net ?? 0;
    const fees = r?.fees ?? 0;
    const teacher = input.teacherByMonth.get(m) ?? 0;
    const margin = net - fees - teacher;
    const fresh = newIn.get(m) ?? [];
    const newByChannel: Partial<Record<CustomerChannel, number>> = {};
    for (const id of fresh) {
      const c = channel.get(id)!;
      newByChannel[c] = (newByChannel[c] ?? 0) + 1;
    }
    const spend = spendIn(m);
    return {
      month: m,
      partial: m === current,
      grossFils: r?.gross ?? 0,
      vatFils: r?.vat ?? 0,
      refundsFils: r?.refunds ?? 0,
      netRevenueFils: net,
      feesFils: fees,
      teacherFils: teacher,
      grossMarginFils: margin,
      grossMarginRate: net > 0 ? margin / net : null,
      activeCustomers: r?.active.size ?? 0,
      newCustomers: fresh.length,
      newByChannel,
      spendFils: spend,
      blendedCacFils: fresh.length ? Math.round(spend / fresh.length) : null,
    };
  });

  // 2. Net revenue retention by first-payment cohort: month-k net revenue from the cohort ÷ its month-0 net revenue.
  //    Only shown once month k is complete.
  const HORIZONS = [3, 6, 12] as const;
  const cohortMonths = monthRange(addMonths(current, -1), Math.max(input.months, 13)).filter((m) => newIn.has(m));
  const totals = { 3: { num: 0, base: 0 }, 6: { num: 0, base: 0 }, 12: { num: 0, base: 0 } };
  const cohorts = cohortMonths.map((m0) => {
    const ids = newIn.get(m0)!;
    const revenueIn = (m: string) => sumBy(ids, (id) => customerNet.get(id)?.get(m) ?? 0);
    const base = revenueIn(m0);
    const at = {} as Record<(typeof HORIZONS)[number], number | null>;
    for (const k of HORIZONS) {
      const mk = addMonths(m0, k);
      if (mk >= current || base <= 0) {
        at[k] = null;
        continue;
      }
      const num = revenueIn(mk);
      at[k] = num / base;
      totals[k].num += num;
      totals[k].base += base;
    }
    return { month: m0, customers: ids.length, baseFils: base, m3: at[3], m6: at[6], m12: at[12] };
  });
  const nrr = { cohorts, overall: { m3: ratio(totals[3].num, totals[3].base), m6: ratio(totals[6].num, totals[6].base), m12: ratio(totals[12].num, totals[12].base) } };

  // 3. Unit economics. Contribution margin of a customer = Σ (net − fee − net × that month's teacher share).
  const customerMargin = (id: string) => {
    let total = 0;
    for (const [m, net] of customerNet.get(id) ?? []) total += net - (customerFees.get(id)?.get(m) ?? 0) - net * teacherShare(m);
    return total;
  };
  const allCustomers = [...firstMonth.keys()];
  const historicalLtv = allCustomers.length ? Math.round(sumBy(allCustomers, customerMargin) / allCustomers.length) : null;

  // Active = paid in this month or the two before. Churn in month M = active at the end of M−1 who are not active at the
  // end of M, ÷ active at the end of M−1. Averaged (pooled) over the last complete months.
  const paidMonths = new Map<string, Set<string>>();
  for (const [id, nets] of customerNet) paidMonths.set(id, new Set(nets.keys()));
  const activeAt = (m: string) => {
    const window = monthRange(m, ACTIVE_WINDOW_MONTHS);
    return allCustomers.filter((id) => window.some((w) => paidMonths.get(id)!.has(w)));
  };
  const trailing = monthRange(addMonths(current, -1), TRAILING_MONTHS);
  let lost = 0;
  let atStart = 0;
  let marginSum = 0;
  let activeSum = 0;
  for (const m of trailing) {
    const before = activeAt(addMonths(m, -1));
    const now = new Set(activeAt(m));
    atStart += before.length;
    lost += before.filter((id) => !now.has(id)).length;
    marginSum += marginOfMonth(m);
    activeSum += now.size;
  }
  const monthlyChurn = ratio(lost, atStart);
  const monthlyMarginPerActive = activeSum ? Math.round(marginSum / activeSum) : null;
  const lifetime = monthlyChurn === null ? null : monthlyChurn > 0 ? Math.min(1 / monthlyChurn, MAX_LIFETIME_MONTHS) : MAX_LIFETIME_MONTHS;
  const projectedLtv = monthlyMarginPerActive !== null && lifetime !== null ? Math.round(monthlyMarginPerActive * lifetime) : null;

  const payback = (cac: number | null) => (cac !== null && monthlyMarginPerActive !== null && monthlyMarginPerActive > 0 ? cac / monthlyMarginPerActive : null);
  const ltvCac = (cac: number | null) => (cac !== null && cac > 0 && projectedLtv !== null ? projectedLtv / cac : null);

  // 4. Channels over the table's window.
  const windowNew = allCustomers.filter((id) => inWindow.has(firstMonth.get(id)!));
  const windowSpend = sumBy(input.spend.filter((s) => inWindow.has(s.month)), (s) => s.amountFils);
  const windowPaidNew = windowNew.filter((id) => isPaid(channel.get(id)!));
  const blendedCac = windowNew.length ? Math.round(windowSpend / windowNew.length) : null;
  const paidCac = windowPaidNew.length ? Math.round(windowSpend / windowPaidNew.length) : null;

  const ALL: CustomerChannel[] = [...PAID_CHANNELS, 'referral', 'organic', 'direct'];
  const channels = ALL.map((c) => {
    const ids = windowNew.filter((id) => channel.get(id) === c);
    const everIds = allCustomers.filter((id) => channel.get(id) === c);
    const spend = isPaid(c) ? sumBy(months, (m) => spendBy.get(`${m}|${c}`) ?? 0) : 0;
    const cac = isPaid(c) && ids.length ? Math.round(spend / ids.length) : null;
    return {
      channel: c,
      paid: isPaid(c),
      newCustomers: ids.length,
      share: windowNew.length ? ids.length / windowNew.length : 0,
      spendFils: spend,
      cacFils: cac,
      historicalLtvFils: everIds.length ? Math.round(sumBy(everIds, customerMargin) / everIds.length) : null,
      ltvCac: ltvCac(cac),
      paybackMonths: payback(cac),
    };
  }).filter((c) => c.newCustomers > 0 || c.spendFils > 0 || c.historicalLtvFils !== null);

  return {
    range: { from: months[0]!, to: current, months: input.months },
    monthly,
    nrr,
    unitEconomics: {
      customers: allCustomers.length,
      historicalLtvFils: historicalLtv,
      monthlyMarginPerActiveFils: monthlyMarginPerActive,
      monthlyChurn,
      expectedLifetimeMonths: lifetime,
      projectedLtvFils: projectedLtv,
      newCustomers: windowNew.length,
      spendFils: windowSpend,
      blendedCacFils: blendedCac,
      paidCacFils: paidCac,
      ltvCac: ltvCac(paidCac),
      paybackMonths: payback(paidCac),
    },
    channels,
  };
}

export type InvestorMetrics = ReturnType<typeof investorMetrics>;

const CSV_CHANNELS: CustomerChannel[] = [...PAID_CHANNELS, 'referral', 'organic', 'direct'];

/** The monthly table as CSV for a data room: amounts in AED with two decimals, rates as fractions. */
export function investorCsv(m: InvestorMetrics): string {
  const aed = (f: number | null) => (f === null ? '' : (f / 100).toFixed(2));
  const rate = (r: number | null) => (r === null ? '' : r.toFixed(4));
  const header = [
    'month',
    'partial',
    'gross_aed',
    'vat_aed',
    'refunds_aed',
    'net_revenue_aed',
    'provider_fees_aed',
    'teacher_earnings_aed',
    'gross_margin_aed',
    'gross_margin_rate',
    'active_customers',
    'new_customers',
    ...CSV_CHANNELS.map((c) => `new_${c}`),
    'marketing_spend_aed',
    'blended_cac_aed',
  ];
  const lines = m.monthly.map((r) =>
    [
      r.month,
      r.partial ? 'yes' : 'no',
      aed(r.grossFils),
      aed(r.vatFils),
      aed(r.refundsFils),
      aed(r.netRevenueFils),
      aed(r.feesFils),
      aed(r.teacherFils),
      aed(r.grossMarginFils),
      rate(r.grossMarginRate),
      r.activeCustomers,
      r.newCustomers,
      ...CSV_CHANNELS.map((c) => r.newByChannel[c] ?? 0),
      aed(r.spendFils),
      aed(r.blendedCacFils),
    ].join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
