import type { Role } from '@azza/shared';

export type AccountDeletionRefusal = 'ADMIN_ACCOUNT' | 'HAS_ACTIVE_TEACHING' | 'HAS_UNPAID_EARNINGS' | 'ORDER_IN_PROGRESS';

export type AccountDeletionFacts = {
  role: Role;
  /** Batches taught that are not COMPLETED/CANCELLED, plus upcoming hosted sessions. */
  activeTeaching: number;
  /** PENDING/AVAILABLE earnings and READY/HELD payouts — paying them needs the bank details we would erase. */
  unpaidEarnings: number;
  /** Bank transfers under review (VERIFYING / AMOUNT_MISMATCH): money may have arrived and must be settled first. */
  ordersUnderReview: number;
};

/**
 * Pure rule for `DELETE /me`. Deletion is refused only where erasing the account would break
 * someone else's data (a cohort without its teacher, an unsettled payment); everything else is self-service.
 */
export function canDeleteAccount(facts: AccountDeletionFacts): { ok: true } | { ok: false; code: AccountDeletionRefusal } {
  if (facts.role === 'ADMIN') return { ok: false, code: 'ADMIN_ACCOUNT' };
  if (facts.activeTeaching > 0) return { ok: false, code: 'HAS_ACTIVE_TEACHING' };
  if (facts.unpaidEarnings > 0) return { ok: false, code: 'HAS_UNPAID_EARNINGS' };
  if (facts.ordersUnderReview > 0) return { ok: false, code: 'ORDER_IN_PROGRESS' };
  return { ok: true };
}

/** Tombstone email: unique per user, and `.invalid` can never receive mail (RFC 2606). */
export const deletedEmail = (userId: string) => `deleted-${userId}@deleted.invalid`;
