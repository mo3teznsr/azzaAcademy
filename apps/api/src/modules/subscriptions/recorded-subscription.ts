import type { Db } from '../../infrastructure/db';
import { hasPendingRenewalReceipt, type AccessSubscription } from './access-policy';

const RANK: Record<string, number> = { ACTIVE: 0, CANCELLING: 0, PAST_DUE: 0, INCOMPLETE: 1 };

/** Prefers a row that can grant access (ACTIVE, CANCELLING, PAST_DUE), then INCOMPLETE; newest first within a group. EXPIRED rows are skipped. */
export function pickSubscription<T extends AccessSubscription & { createdAt: Date }>(rows: T[]): T | null {
  const live = rows.filter((r) => r.status !== 'EXPIRED');
  live.sort((a, b) => (RANK[a.status] ?? 2) - (RANK[b.status] ?? 2) || b.createdAt.getTime() - a.createdAt.getTime());
  return live[0] ?? null;
}

type LiveRow = { id: string; status: AccessSubscription['status']; currentPeriodEnd: Date | null; provider: NonNullable<AccessSubscription['provider']> };

/** The access slice of a row, with `pendingRenewalReceipt` worked out for an ACTIVE transfer plan. */
async function withPendingReceipt(db: Db, row: LiveRow): Promise<AccessSubscription> {
  const base = { status: row.status, currentPeriodEnd: row.currentPeriodEnd, provider: row.provider };
  if (row.provider !== 'BANK_TRANSFER' || row.status !== 'ACTIVE') return base;
  const waiting = await db.subscriptionPayment.findMany({ where: { subscriptionId: row.id, status: 'AWAITING_REVIEW' }, select: { status: true, updatedAt: true } });
  return { ...base, pendingRenewalReceipt: hasPendingRenewalReceipt(row, waiting) };
}

/** The subscription that decides the user's access to the course (null when there is none). */
export async function newestLiveSubscription(db: Db, courseId: string, userId: string): Promise<AccessSubscription | null> {
  const rows = await db.subscription.findMany({
    where: { courseId, userId, status: { not: 'EXPIRED' } },
    select: { id: true, status: true, currentPeriodEnd: true, provider: true, createdAt: true },
  });
  const row = pickSubscription(rows);
  return row ? withPendingReceipt(db, row) : null;
}

/** What the learner's progress list shows for a recorded course. */
export type LearnerSubscription = AccessSubscription & { cancelAtPeriodEnd: boolean };

/** Like `newestLiveSubscription`, but a lapsed learner gets their newest ended plan instead of nothing. */
export async function learnerSubscription(db: Db, courseId: string, userId: string): Promise<LearnerSubscription | null> {
  const rows = await db.subscription.findMany({
    where: { courseId, userId },
    select: { id: true, status: true, currentPeriodEnd: true, provider: true, createdAt: true, cancelAtPeriodEnd: true },
  });
  const row = pickSubscription(rows) ?? rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return row ? { ...(await withPendingReceipt(db, row)), cancelAtPeriodEnd: row.cancelAtPeriodEnd } : null;
}

/** Payment statuses that prove a period was paid for (a later refund does not undo that the learner once had the plan). */
export const PAID_PAYMENT_STATUSES = ['PAID', 'REFUNDED'] as const;

/**
 * Did this row ever have a paid period? A period end was set, or one of its payments went through. An abandoned checkout
 * (INCOMPLETE, never paid) is not one. The fakes use this; `everSubscribed` asks the database the same question.
 */
export function hadPaidPeriod(row: { currentPeriodEnd: Date | null; paymentStatuses?: readonly string[] }): boolean {
  return row.currentPeriodEnd != null || (row.paymentStatuses ?? []).some((s) => (PAID_PAYMENT_STATUSES as readonly string[]).includes(s));
}

/** Has the user ever had a paid plan for the course? Tells a lapsed learner ("Your plan has ended") from a new visitor. */
export async function everSubscribed(db: Db, courseId: string, userId: string): Promise<boolean> {
  const paid = await db.subscription.count({
    where: {
      courseId,
      userId,
      OR: [{ currentPeriodEnd: { not: null } }, { payments: { some: { status: { in: [...PAID_PAYMENT_STATUSES] } } } }],
    },
  });
  return paid > 0;
}
