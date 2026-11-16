/**
 * How one paid all-access period is shared between course authors (pure; all amounts integer fils).
 *
 * - The period's net is the per-course rule (`EarningsCalculator.orderNet`): total minus VAT minus the processor fee.
 * - Each course the subscriber watched in the period gets the slice of that net matching its share of the watched
 *   seconds, times its teacher cut (the course override, else the recorded default): with no overrides that is exactly
 *   "net × recorded cut, split by minutes watched".
 * - Courses written by an admin (no author) still count in the minutes, but their slice stays with the platform.
 * - No watching at all: nobody is paid for the period (the platform keeps it).
 * - Rounding: each exact amount is floored and the leftover fils go to the largest remainders (ties: more seconds,
 *   then course id), so the shares always add up to the rounded exact total and never depend on input order.
 */
export interface WatchedCourse {
  courseId: string;
  /** The course author, or null for an admin-written course. */
  teacherId: string | null;
  seconds: number;
  /** The teacher cut in percent for this course. */
  cutPercent: number;
}

export interface AllAccessShareAmount {
  courseId: string;
  teacherId: string;
  watchedSec: number;
  amountFils: number;
}

export function splitAllAccessPeriod(netFils: number, watched: WatchedCourse[]): AllAccessShareAmount[] {
  const rows = watched.filter((w) => w.seconds > 0);
  const totalSec = rows.reduce((s, w) => s + w.seconds, 0);
  if (netFils <= 0 || totalSec <= 0) return [];
  const paid = rows.filter((w): w is WatchedCourse & { teacherId: string } => w.teacherId !== null && w.cutPercent > 0);
  // exact_i = net × sec_i / totalSec × cut_i / 100, kept as an integer fraction over `denom` (BigInt: no float drift).
  const denom = BigInt(totalSec) * 100n;
  const exact = paid.map((w) => ({ w, num: BigInt(netFils) * BigInt(w.seconds) * BigInt(Math.min(100, Math.trunc(w.cutPercent))) }));
  const floors = exact.map((e) => Number(e.num / denom));
  const sum = exact.reduce((s, e) => s + e.num, 0n);
  const target = Number((sum * 2n + denom) / (denom * 2n)); // round half up
  let leftover = target - floors.reduce((s, f) => s + f, 0);
  const order = exact
    .map((e, i) => ({ i, rem: e.num % denom, sec: e.w.seconds, id: e.w.courseId }))
    .sort((a, b) => (a.rem === b.rem ? 0 : a.rem < b.rem ? 1 : -1) || b.sec - a.sec || a.id.localeCompare(b.id));
  const amounts = [...floors];
  for (const o of order) {
    if (leftover <= 0) break;
    amounts[o.i]! += 1;
    leftover--;
  }
  return exact
    .map((e, i) => ({ courseId: e.w.courseId, teacherId: e.w.teacherId, watchedSec: e.w.seconds, amountFils: amounts[i]! }))
    .filter((s) => s.amountFils > 0);
}

/** What a refund takes back from one share: round(share × refunded ÷ total), all of it once fully refunded. */
export function shareRefundTarget(shareFils: number, refundedFils: number, totalFils: number): number {
  if (shareFils <= 0 || totalFils <= 0 || refundedFils <= 0) return 0;
  if (refundedFils >= totalFils) return shareFils;
  return Math.min(shareFils, Math.round((shareFils * refundedFils) / totalFils));
}
