import { describe, expect, test } from 'bun:test';
import { couponRefusal, couponStatus, type CouponContext, type CouponRules } from '../src/modules/payments/coupon-eligibility';

const now = new Date('2026-11-20T10:00:00Z');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const rules: CouponRules = {
  active: true,
  startsOn: null,
  expiresOn: null,
  maxRedemptions: null,
  redemptions: 0,
  perUserLimit: null,
  minOrderFils: null,
  courseId: null,
  batchId: null,
};
const ctx: CouponContext = { now, courseId: 'pdf', batchId: 'b08', subtotalFils: 88_000, userUses: 0 };

describe('couponRefusal', () => {
  test('an unrestricted coupon applies', () => {
    expect(couponRefusal(rules, ctx)).toBeNull();
  });

  test('paused', () => {
    expect(couponRefusal({ ...rules, active: false }, ctx)).toBe('PAUSED');
  });

  test('not started: valid from the start day, inclusive', () => {
    expect(couponRefusal({ ...rules, startsOn: day('2026-11-21') }, ctx)).toBe('NOT_STARTED');
    expect(couponRefusal({ ...rules, startsOn: day('2026-11-20') }, ctx)).toBeNull();
  });

  test('expired: valid through the expiry day', () => {
    expect(couponRefusal({ ...rules, expiresOn: day('2026-11-19') }, ctx)).toBe('EXPIRED');
    expect(couponRefusal({ ...rules, expiresOn: day('2026-11-20') }, ctx)).toBeNull();
  });

  test('exhausted when the total limit is reached', () => {
    expect(couponRefusal({ ...rules, maxRedemptions: 3, redemptions: 3 }, ctx)).toBe('EXHAUSTED');
    expect(couponRefusal({ ...rules, maxRedemptions: 3, redemptions: 2 }, ctx)).toBeNull();
  });

  test('scope: course and batch', () => {
    expect(couponRefusal({ ...rules, courseId: 'python' }, ctx)).toBe('WRONG_COURSE');
    expect(couponRefusal({ ...rules, courseId: 'pdf' }, ctx)).toBeNull();
    expect(couponRefusal({ ...rules, batchId: 'b09' }, ctx)).toBe('WRONG_BATCH');
    expect(couponRefusal({ ...rules, batchId: 'b08' }, ctx)).toBeNull();
  });

  test('below the minimum order subtotal', () => {
    expect(couponRefusal({ ...rules, minOrderFils: 100_000 }, ctx)).toBe('BELOW_MINIMUM');
    expect(couponRefusal({ ...rules, minOrderFils: 88_000 }, ctx)).toBeNull();
  });

  test('per-student limit, skipped for anonymous quotes', () => {
    expect(couponRefusal({ ...rules, perUserLimit: 1 }, { ...ctx, userUses: 1 })).toBe('PER_USER_LIMIT');
    expect(couponRefusal({ ...rules, perUserLimit: 2 }, { ...ctx, userUses: 1 })).toBeNull();
    expect(couponRefusal({ ...rules, perUserLimit: 1 }, { ...ctx, userUses: null })).toBeNull();
  });

  test('reports the first broken rule in a stable order', () => {
    const broken: CouponRules = { ...rules, active: false, expiresOn: day('2026-01-01'), courseId: 'python', minOrderFils: 1_000_000 };
    expect(couponRefusal(broken, ctx)).toBe('PAUSED');
    expect(couponRefusal({ ...broken, active: true }, ctx)).toBe('EXPIRED');
    expect(couponRefusal({ ...broken, active: true, expiresOn: null }, ctx)).toBe('WRONG_COURSE');
    expect(couponRefusal({ ...broken, active: true, expiresOn: null, courseId: null }, ctx)).toBe('BELOW_MINIMUM');
  });
});

describe('couponStatus', () => {
  test('derives the admin label', () => {
    expect(couponStatus(rules, now)).toBe('ACTIVE');
    expect(couponStatus({ ...rules, startsOn: day('2026-12-01') }, now)).toBe('SCHEDULED');
    expect(couponStatus({ ...rules, active: false }, now)).toBe('PAUSED');
    expect(couponStatus({ ...rules, expiresOn: day('2026-11-01') }, now)).toBe('EXPIRED');
    expect(couponStatus({ ...rules, maxRedemptions: 5, redemptions: 5 }, now)).toBe('EXHAUSTED');
  });

  test('expired and exhausted are final even when paused', () => {
    expect(couponStatus({ ...rules, active: false, expiresOn: day('2026-11-01') }, now)).toBe('EXPIRED');
    expect(couponStatus({ ...rules, active: false, maxRedemptions: 1, redemptions: 1 }, now)).toBe('EXHAUSTED');
  });
});
