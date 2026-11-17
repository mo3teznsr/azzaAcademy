/**
 * Deferred and recognised plan revenue (pure, no I/O).
 *
 * A plan payment is earned over the months it covers: a yearly plan in 12 monthly slices, a monthly plan in one.
 * A slice is recognised at the start of its month (monthly granularity), so on any date:
 *   collected net of VAT = recognised so far + deferred.
 * Amounts are net of VAT and refunds (`netRevenue`); a refund lowers every slice of its payment in proportion.
 * Seat orders are not here: a live class is recognised when it is sold, as before.
 */
import { addMonthsUtc, sliceCountFor, splitIntoSlices } from '../payouts/revenue-slices';
import { addMonths, monthKey, monthRange, netRevenue } from './investor-math';

export interface PlanPaymentForRecognition {
  plan: 'MONTHLY' | 'YEARLY';
  paidAt: Date;
  /** Start of the period the payment covers (placeholder dates before a transfer is approved are ignored: paidAt wins). */
  periodStart: Date;
  totalFils: number;
  vatFils: number;
  refundedFils: number;
}

export interface RecognitionMonth {
  month: string;
  /** Plan money received this month, net of VAT and refunds. */
  collectedFils: number;
  /** Plan revenue earned this month (slices whose month this is). */
  recognisedFils: number;
}

export interface RevenueRecognition {
  /** Collected but not yet earned, net of VAT: the slices still to come. */
  deferredFils: number;
  /** All plan money collected so far, net of VAT and refunds. */
  collectedFils: number;
  recognisedToDateFils: number;
  /** The last `months` months, oldest first. */
  months: RecognitionMonth[];
  /** Deferred revenue that will be recognised in each of the next 12 months (this month excluded). */
  upcoming: Array<{ month: string; recognisedFils: number }>;
}

/** Each slice of one payment: when it is earned and how much (net of VAT). */
export function recognitionSlices(p: PlanPaymentForRecognition): Array<{ at: Date; amountFils: number }> {
  const net = netRevenue(p);
  if (net <= 0) return [];
  const start = p.periodStart > p.paidAt ? p.periodStart : p.paidAt;
  return splitIntoSlices(net, sliceCountFor(p.plan)).map((amountFils, i) => ({ at: addMonthsUtc(start, i), amountFils }));
}

export function revenueRecognition(payments: PlanPaymentForRecognition[], now: Date, months = 12): RevenueRecognition {
  const current = monthKey(now);
  const range = monthRange(current, months);
  const rows = new Map(range.map((m) => [m, { month: m, collectedFils: 0, recognisedFils: 0 }]));
  const ahead = Array.from({ length: 12 }, (_, i) => addMonths(current, i + 1));
  const future = new Map(ahead.map((m) => [m, 0]));
  let deferredFils = 0;
  let collectedFils = 0;

  for (const p of payments) {
    if (p.paidAt > now) continue;
    const net = netRevenue(p);
    collectedFils += net;
    const paidRow = rows.get(monthKey(p.paidAt));
    if (paidRow) paidRow.collectedFils += net;
    for (const s of recognitionSlices(p)) {
      if (s.at > now) {
        deferredFils += s.amountFils;
        const m = monthKey(s.at);
        if (future.has(m)) future.set(m, future.get(m)! + s.amountFils);
      } else {
        const row = rows.get(monthKey(s.at));
        if (row) row.recognisedFils += s.amountFils;
      }
    }
  }
  return {
    deferredFils,
    collectedFils,
    recognisedToDateFils: collectedFils - deferredFils,
    months: range.map((m) => rows.get(m)!),
    upcoming: ahead.map((m) => ({ month: m, recognisedFils: future.get(m)! })),
  };
}
