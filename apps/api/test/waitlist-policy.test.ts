import { describe, expect, test } from 'bun:test';
import { waitlistRefusal } from '../src/modules/payments/waitlist-policy';

const full = { heldSeats: 24, capacity: 24, waitlistEnabled: true };

describe('waitlistRefusal', () => {
  test('a new student may join a full batch with the waitlist on', () => {
    expect(waitlistRefusal({ ...full, existing: null })).toBeNull();
    expect(waitlistRefusal({ ...full, existing: 'CANCELLED' })).toBeNull();
    expect(waitlistRefusal({ ...full, existing: 'EXPIRED' })).toBeNull();
  });

  test('seats still open → enroll instead', () => {
    expect(waitlistRefusal({ ...full, heldSeats: 23, existing: null })).toBe('SEATS_AVAILABLE');
  });

  test('waitlist disabled', () => {
    expect(waitlistRefusal({ ...full, waitlistEnabled: false, existing: null })).toBe('WAITLIST_DISABLED');
  });

  test('students who already hold or wait for a seat are refused', () => {
    expect(waitlistRefusal({ ...full, existing: 'ACTIVE' })).toBe('ALREADY_ENROLLED');
    expect(waitlistRefusal({ ...full, existing: 'WAITLISTED' })).toBe('ALREADY_WAITLISTED');
    expect(waitlistRefusal({ ...full, existing: 'PENDING_PAYMENT' })).toBe('ORDER_IN_PROGRESS');
    expect(waitlistRefusal({ ...full, existing: 'VERIFYING' })).toBe('ORDER_IN_PROGRESS');
  });
});
