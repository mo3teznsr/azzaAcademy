import { GRACE_DAYS, type SubscriptionProvider, type SubscriptionStatus } from '@azza/shared';

const DAY_MS = 86_400_000;

/** The slice of a `Subscription` row the access rule reads. */
export interface AccessSubscription {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  provider?: SubscriptionProvider;
  /** Transfer renewals: a receipt uploaded before the end is waiting for review (see `hasPendingRenewalReceipt`). */
  pendingRenewalReceipt?: boolean;
}

/**
 * Can this subscription read a recorded course right now? (Admins and the author are checked by the callers.)
 * - ACTIVE and CANCELLING: until `currentPeriodEnd`.
 * - PAST_DUE: `GRACE_DAYS` past `currentPeriodEnd`. Bank transfers have no grace: they are prepaid and never go past due.
 * - INCOMPLETE, EXPIRED and no subscription: no.
 * `pendingRenewalReceipt` is for transfer renewals: an ACTIVE BANK_TRANSFER plan keeps access past its end while a receipt
 * uploaded before that end waits for review. It defaults to the flag carried on `sub`; other providers ignore it.
 */
export function canAccessRecorded(sub: AccessSubscription | null, now: Date, pendingRenewalReceipt = sub?.pendingRenewalReceipt ?? false): boolean {
  if (!sub?.currentPeriodEnd) return false;
  const end = sub.currentPeriodEnd.getTime();
  switch (sub.status) {
    case 'ACTIVE':
    case 'CANCELLING':
      return now.getTime() < end || (sub.provider === 'BANK_TRANSFER' && sub.status === 'ACTIVE' && pendingRenewalReceipt);
    case 'PAST_DUE':
      return now.getTime() < end + (sub.provider === 'BANK_TRANSFER' ? 0 : GRACE_DAYS) * DAY_MS;
    default:
      return false;
  }
}

/** A receipt (payment AWAITING_REVIEW) was uploaded before the period ended. A payment's `updatedAt` is its upload time while it waits. */
export function hasPendingRenewalReceipt(sub: { currentPeriodEnd: Date | null }, payments: Array<{ status: string; updatedAt: Date }>): boolean {
  const end = sub.currentPeriodEnd?.getTime();
  return end != null && payments.some((p) => p.status === 'AWAITING_REVIEW' && p.updatedAt.getTime() < end);
}

/** Where the plans that can open a recorded course come from (the lesson and quiz repositories). */
export interface RecordedPlanSource {
  recordedSubscription(courseId: string, userId: string): Promise<AccessSubscription | null>;
  /** The learner's live all-access plan (null when none). Optional so older fakes keep working: absent means none. */
  allAccessSubscription?(userId: string): Promise<AccessSubscription | null>;
}

/**
 * Can this learner read the recorded course through a plan? (Admins and the author are checked by the callers.)
 * Their own plan for the course, or a live all-access plan while the course is PUBLISHED: all-access opens every
 * published recorded course, under the same grace rules (`canAccessRecorded`) as a per-course plan.
 */
export async function canReadRecordedCourse(source: RecordedPlanSource, course: { id: string; status: string }, userId: string, now: Date): Promise<boolean> {
  if (canAccessRecorded(await source.recordedSubscription(course.id, userId), now)) return true;
  if (course.status !== 'PUBLISHED' || !source.allAccessSubscription) return false;
  return canAccessRecorded(await source.allAccessSubscription(userId), now);
}
