import { describe, expect, test } from 'bun:test';
import { canDeleteAccount, deletedEmail } from '../src/modules/me/account-deletion';

const student = { role: 'STUDENT' as const, activeTeaching: 0, unpaidEarnings: 0, ordersUnderReview: 0 };

describe('canDeleteAccount', () => {
  test('a student with nothing pending may delete', () => {
    expect(canDeleteAccount(student)).toEqual({ ok: true });
  });

  test('a former teacher with only finished batches and settled earnings may delete', () => {
    expect(canDeleteAccount({ ...student, role: 'TEACHER' })).toEqual({ ok: true });
  });

  test('admins are refused', () => {
    expect(canDeleteAccount({ ...student, role: 'ADMIN' })).toEqual({ ok: false, code: 'ADMIN_ACCOUNT' });
  });

  test('teachers with assigned batches are refused', () => {
    expect(canDeleteAccount({ ...student, role: 'TEACHER', activeTeaching: 2 })).toEqual({ ok: false, code: 'HAS_ACTIVE_TEACHING' });
  });

  test('unpaid earnings block deletion', () => {
    expect(canDeleteAccount({ ...student, role: 'TEACHER', unpaidEarnings: 1 })).toEqual({ ok: false, code: 'HAS_UNPAID_EARNINGS' });
  });

  test('a bank transfer under review blocks deletion', () => {
    expect(canDeleteAccount({ ...student, ordersUnderReview: 1 })).toEqual({ ok: false, code: 'ORDER_IN_PROGRESS' });
  });

  test('admin wins over every other reason', () => {
    expect(canDeleteAccount({ role: 'ADMIN', activeTeaching: 1, unpaidEarnings: 1, ordersUnderReview: 1 })).toEqual({ ok: false, code: 'ADMIN_ACCOUNT' });
  });
});

describe('deletedEmail', () => {
  test('is unique per user and undeliverable', () => {
    expect(deletedEmail('u_1')).toBe('deleted-u_1@deleted.invalid');
  });
});
