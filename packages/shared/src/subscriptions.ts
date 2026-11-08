import type { SubscriptionPlan } from './enums';

/** A PAST_DUE subscriber keeps access this many days past `currentPeriodEnd`. */
export const GRACE_DAYS = 16;
/** The yearly-renewal reminder goes out this many days before `currentPeriodEnd`. */
export const YEARLY_REMINDER_DAYS = 7;

/** iOS: one Apple subscription group per recorded course, a product per plan. Mirrored in the mobile app. */
export function appleRecordedProductId(slug: string, plan: SubscriptionPlan): string {
  return `com.futuretech.azza.rec.${slug}.${plan === 'YEARLY' ? 'yearly' : 'monthly'}`;
}

/** Whole months free on the yearly plan versus twelve monthly payments (rounded down). */
export function yearlySavingMonths(monthlyFils: number, yearlyFils: number): number {
  if (monthlyFils <= 0) return 0;
  return Math.max(0, Math.floor((monthlyFils * 12 - yearlyFils) / monthlyFils));
}
