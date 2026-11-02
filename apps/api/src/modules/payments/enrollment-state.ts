import type { EnrollmentStatus } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';

/** Statuses that occupy a seat. */
export const SEAT_HOLDING: EnrollmentStatus[] = ['ACTIVE', 'PENDING_PAYMENT', 'AWAITING_TRANSFER', 'VERIFYING'];

const TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  PENDING_PAYMENT: ['ACTIVE', 'AWAITING_TRANSFER', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED'],
  AWAITING_TRANSFER: ['VERIFYING', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED'],
  VERIFYING: ['ACTIVE', 'AWAITING_TRANSFER', 'CANCELLED'],
  ACTIVE: ['REFUNDED', 'CANCELLED'],
  WAITLISTED: ['PENDING_PAYMENT', 'AWAITING_TRANSFER', 'CANCELLED'],
  CANCELLED: ['PENDING_PAYMENT', 'AWAITING_TRANSFER', 'WAITLISTED'],
  // a late Stripe success can still activate an expired hold
  EXPIRED: ['PENDING_PAYMENT', 'AWAITING_TRANSFER', 'WAITLISTED', 'ACTIVE'],
  REFUNDED: ['PENDING_PAYMENT', 'AWAITING_TRANSFER', 'WAITLISTED'],
};

const INITIAL: EnrollmentStatus[] = ['PENDING_PAYMENT', 'AWAITING_TRANSFER', 'WAITLISTED'];

/** Pure enrollment lifecycle. `from = null` means the enrollment does not exist yet. */
export class EnrollmentStateMachine {
  canMove(from: EnrollmentStatus | null, to: EnrollmentStatus): boolean {
    return from === null ? INITIAL.includes(to) : TRANSITIONS[from].includes(to);
  }

  assert(from: EnrollmentStatus | null, to: EnrollmentStatus) {
    if (!this.canMove(from, to)) {
      throw new BusinessRuleError(`Enrollment cannot move from ${from ?? 'NEW'} to ${to}`, 'INVALID_ENROLLMENT_TRANSITION', { from, to });
    }
  }

  holdsSeat(status: EnrollmentStatus) {
    return SEAT_HOLDING.includes(status);
  }
}
