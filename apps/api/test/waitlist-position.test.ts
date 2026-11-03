import { describe, expect, test } from 'bun:test';
import { waitlistPosition } from '../src/modules/payments/waitlist-position';

const at = (min: number) => new Date(Date.UTC(2026, 10, 1, 9, min));
const queue = [
  { id: 'c', createdAt: at(30) },
  { id: 'a', createdAt: at(10) },
  { id: 'b', createdAt: at(20) },
];

describe('waitlistPosition', () => {
  test('1-based rank by createdAt, whatever the input order', () => {
    expect(waitlistPosition(queue, 'a')).toEqual({ position: 1, total: 3 });
    expect(waitlistPosition(queue, 'b')).toEqual({ position: 2, total: 3 });
    expect(waitlistPosition(queue, 'c')).toEqual({ position: 3, total: 3 });
  });

  test('ties are broken by id so the order is stable', () => {
    const tied = [
      { id: 'y', createdAt: at(0) },
      { id: 'x', createdAt: at(0) },
    ];
    expect(waitlistPosition(tied, 'x')).toEqual({ position: 1, total: 2 });
    expect(waitlistPosition(tied, 'y')).toEqual({ position: 2, total: 2 });
  });

  test('alone in the queue', () => {
    expect(waitlistPosition([{ id: 'a', createdAt: at(0) }], 'a')).toEqual({ position: 1, total: 1 });
  });

  test('not in the queue → null', () => {
    expect(waitlistPosition(queue, 'zz')).toBeNull();
    expect(waitlistPosition([], 'a')).toBeNull();
  });
});
