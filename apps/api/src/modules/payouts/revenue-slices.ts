/**
 * Pure rules for spreading a yearly plan over the months it covers (no I/O).
 * Used by teacher pay (12 monthly earning slices) and by reporting (deferred and recognised revenue).
 */

/** Months a plan covers: a yearly plan is 12 monthly slices, a monthly plan one. */
export const sliceCountFor = (plan: 'MONTHLY' | 'YEARLY') => (plan === 'YEARLY' ? 12 : 1);

/** Splits `totalFils` into `n` integer slices that add up exactly; the leftover fils go to the first slices. */
export function splitIntoSlices(totalFils: number, n: number): number[] {
  if (n <= 0) return [];
  const sign = totalFils < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(totalFils));
  const base = Math.floor(abs / n);
  const extra = abs - base * n;
  return Array.from({ length: n }, (_, i) => sign * (base + (i < extra ? 1 : 0)));
}

/** Calendar months in UTC, clamping to the end of a short month (31 Jan + 1 month = 28 Feb). */
export function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export interface SliceState {
  id: string;
  sliceIndex: number;
  amountFils: number;
  /** Not in any payout (draft runs included) and not PAID: it can still be withdrawn. */
  unpaid: boolean;
  reversed: boolean;
}

/**
 * How a refund takes money back from a sliced earning.
 * `targetFils` is what the cumulative refund should claw back in total (round(share × refunded ÷ total));
 * `clawedFils` is what earlier refunds already took (reversed slices plus live negative adjustments).
 * Whole unpaid slices are withdrawn first, latest month first, while they fit in what is left to take; the remainder
 * (less than one slice, or money already paid out) becomes a negative adjustment.
 */
export function sliceClawback(slices: SliceState[], targetFils: number, clawedFils: number): { reverse: string[]; adjustmentFils: number } {
  let left = targetFils - clawedFils;
  if (left <= 0) return { reverse: [], adjustmentFils: 0 };
  const reverse: string[] = [];
  const open = slices.filter((s) => s.unpaid && !s.reversed && s.amountFils > 0).sort((a, b) => b.sliceIndex - a.sliceIndex);
  for (const s of open) {
    if (s.amountFils > left) continue;
    reverse.push(s.id);
    left -= s.amountFils;
    if (left === 0) break;
  }
  return { reverse, adjustmentFils: left };
}
