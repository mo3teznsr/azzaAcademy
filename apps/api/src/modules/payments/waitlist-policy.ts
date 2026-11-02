import type { EnrollmentStatus } from '@azza/shared';

export type WaitlistRefusal = 'ALREADY_ENROLLED' | 'ALREADY_WAITLISTED' | 'ORDER_IN_PROGRESS' | 'SEATS_AVAILABLE' | 'WAITLIST_DISABLED';

/**
 * Pure rule for `POST /batches/:id/waitlist`. A student may join only when the batch is genuinely full,
 * the waitlist is on, and they do not already hold (or wait for) a seat.
 */
export function waitlistRefusal(args: {
  existing: EnrollmentStatus | null;
  heldSeats: number;
  capacity: number;
  waitlistEnabled: boolean;
}): WaitlistRefusal | null {
  const { existing } = args;
  if (existing === 'ACTIVE') return 'ALREADY_ENROLLED';
  if (existing === 'WAITLISTED') return 'ALREADY_WAITLISTED';
  // PENDING_PAYMENT (e.g. a promoted waitlister), AWAITING_TRANSFER, VERIFYING already own a seat → go to checkout/order.
  if (existing === 'PENDING_PAYMENT' || existing === 'AWAITING_TRANSFER' || existing === 'VERIFYING') return 'ORDER_IN_PROGRESS';
  if (args.heldSeats < args.capacity) return 'SEATS_AVAILABLE';
  if (!args.waitlistEnabled) return 'WAITLIST_DISABLED';
  return null;
}
