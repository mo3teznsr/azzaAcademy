/**
 * Pure coupon rules. No I/O: callers load the coupon, the batch being bought and the student's
 * prior uses, then ask whether the coupon applies. Dates are calendar days stored at 00:00 UTC.
 */

const DAY_MS = 86_400_000;

export const COUPON_REFUSALS = [
  'PAUSED',
  'NOT_STARTED',
  'EXPIRED',
  'EXHAUSTED',
  'WRONG_COURSE',
  'WRONG_BATCH',
  'BELOW_MINIMUM',
  'PER_USER_LIMIT',
] as const;
export type CouponRefusal = (typeof COUPON_REFUSALS)[number];

/** Student-facing messages (the web/mobile clients localise by `details.reason`). */
export const COUPON_REFUSAL_MESSAGES: Record<CouponRefusal | 'NOT_FOUND', string> = {
  NOT_FOUND: 'This coupon code does not exist',
  PAUSED: 'This coupon is paused right now',
  NOT_STARTED: 'This coupon is not valid yet',
  EXPIRED: 'This coupon has expired',
  EXHAUSTED: 'This coupon has been fully used',
  WRONG_COURSE: 'This coupon is for a different course',
  WRONG_BATCH: 'This coupon is for a different batch',
  BELOW_MINIMUM: 'Your order is below this coupon’s minimum',
  PER_USER_LIMIT: 'You have already used this coupon the maximum number of times',
};

export interface CouponRules {
  active: boolean;
  startsOn: Date | null;
  expiresOn: Date | null;
  maxRedemptions: number | null;
  redemptions: number;
  perUserLimit: number | null;
  minOrderFils: number | null;
  courseId: string | null;
  batchId: string | null;
}

export interface CouponContext {
  now: Date;
  courseId: string;
  batchId: string;
  /** Order subtotal before discount, in fils. */
  subtotalFils: number;
  /** The student's paid + in-progress uses of this coupon; null when the buyer is anonymous (quote without a session). */
  userUses: number | null;
}

/** null when the coupon applies, otherwise the first rule it breaks (checked in a stable order). */
export function couponRefusal(c: CouponRules, ctx: CouponContext): CouponRefusal | null {
  const t = ctx.now.getTime();
  if (!c.active) return 'PAUSED';
  if (c.startsOn && t < c.startsOn.getTime()) return 'NOT_STARTED';
  if (c.expiresOn && t >= c.expiresOn.getTime() + DAY_MS) return 'EXPIRED'; // valid through its last day
  if (c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions) return 'EXHAUSTED';
  if (c.batchId !== null && c.batchId !== ctx.batchId) return 'WRONG_BATCH';
  if (c.courseId !== null && c.courseId !== ctx.courseId) return 'WRONG_COURSE';
  if (c.minOrderFils !== null && ctx.subtotalFils < c.minOrderFils) return 'BELOW_MINIMUM';
  if (c.perUserLimit !== null && ctx.userUses !== null && ctx.userUses >= c.perUserLimit) return 'PER_USER_LIMIT';
  return null;
}

export const COUPON_STATUSES = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'PAUSED', 'EXHAUSTED'] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

/** Admin-facing lifecycle label. Expired/exhausted win over paused: they are final. */
export function couponStatus(c: Pick<CouponRules, 'active' | 'startsOn' | 'expiresOn' | 'maxRedemptions' | 'redemptions'>, now: Date): CouponStatus {
  const t = now.getTime();
  if (c.expiresOn && t >= c.expiresOn.getTime() + DAY_MS) return 'EXPIRED';
  if (c.maxRedemptions !== null && c.redemptions >= c.maxRedemptions) return 'EXHAUSTED';
  if (!c.active) return 'PAUSED';
  if (c.startsOn && t < c.startsOn.getTime()) return 'SCHEDULED';
  return 'ACTIVE';
}
