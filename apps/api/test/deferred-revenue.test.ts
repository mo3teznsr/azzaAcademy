import { describe, expect, test } from 'bun:test';
import { recognitionSlices, revenueRecognition, type PlanPaymentForRecognition } from '../src/modules/growth/deferred-revenue';
import { addMonthsUtc, sliceClawback, splitIntoSlices } from '../src/modules/payouts/revenue-slices';

const at = (iso: string) => new Date(`${iso}T08:00:00Z`);
// 12,600 fils incl. 5% VAT → 12,000 net of VAT
const yearly = (paid: string, over: Partial<PlanPaymentForRecognition> = {}): PlanPaymentForRecognition => ({
  plan: 'YEARLY', paidAt: at(paid), periodStart: at(paid), totalFils: 12_600, vatFils: 600, refundedFils: 0, ...over,
});
const monthly = (paid: string): PlanPaymentForRecognition => ({ plan: 'MONTHLY', paidAt: at(paid), periodStart: at(paid), totalFils: 1_050, vatFils: 50, refundedFils: 0 });

describe('revenue slices', () => {
  test('slices add up exactly, leftovers first', () => {
    expect(splitIntoSlices(1_000, 12)).toEqual([84, 84, 84, 84, 83, 83, 83, 83, 83, 83, 83, 83]);
    expect(splitIntoSlices(1_000, 12).reduce((s, n) => s + n, 0)).toBe(1_000);
    expect(splitIntoSlices(5, 1)).toEqual([5]);
  });

  test('months clamp to the end of a short month', () => {
    expect(addMonthsUtc(new Date('2027-01-31T00:00:00Z'), 1).toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });

  test('clawback takes whole unpaid slices from the latest month and leaves the rest as an adjustment', () => {
    const slices = [0, 1, 2].map((i) => ({ id: `s${i}`, sliceIndex: i, amountFils: 100, unpaid: i > 0, reversed: false }));
    expect(sliceClawback(slices, 250, 0)).toEqual({ reverse: ['s2', 's1'], adjustmentFils: 50 });
    expect(sliceClawback(slices, 250, 250)).toEqual({ reverse: [], adjustmentFils: 0 });
  });
});

describe('revenueRecognition', () => {
  test('a yearly plan is earned a twelfth a month; the rest is deferred', () => {
    const r = revenueRecognition([yearly('2026-09-10')], at('2026-11-16'), 3);
    expect(recognitionSlices(yearly('2026-09-10'))).toHaveLength(12);
    expect(r.collectedFils).toBe(12_000);
    expect(r.months).toEqual([
      { month: '2026-09', collectedFils: 12_000, recognisedFils: 1_000 },
      { month: '2026-10', collectedFils: 0, recognisedFils: 1_000 },
      { month: '2026-11', collectedFils: 0, recognisedFils: 1_000 },
    ]);
    expect(r.deferredFils).toBe(9_000);
    expect(r.recognisedToDateFils).toBe(3_000);
    expect(r.upcoming[0]).toEqual({ month: '2026-12', recognisedFils: 1_000 });
    expect(r.upcoming.reduce((s, m) => s + m.recognisedFils, 0)).toBe(9_000);
  });

  test('a monthly plan is earned in the month it covers', () => {
    const r = revenueRecognition([monthly('2026-11-02')], at('2026-11-16'), 1);
    expect(r.deferredFils).toBe(0);
    expect(r.months[0]).toEqual({ month: '2026-11', collectedFils: 1_000, recognisedFils: 1_000 });
  });

  test('a renewal paid ahead of its period is deferred until the period starts', () => {
    const r = revenueRecognition([{ ...monthly('2026-11-10'), periodStart: at('2026-12-01') }], at('2026-11-16'), 1);
    expect(r.deferredFils).toBe(1_000);
    expect(r.months[0]!.recognisedFils).toBe(0);
  });

  test('refunds lower the payment net of VAT; collected always equals recognised plus deferred', () => {
    const p = [yearly('2026-01-15', { refundedFils: 6_300 }), yearly('2026-10-01'), monthly('2026-11-01')];
    const r = revenueRecognition(p, at('2026-11-16'), 12);
    expect(r.collectedFils).toBe(6_000 + 12_000 + 1_000);
    expect(r.recognisedToDateFils + r.deferredFils).toBe(r.collectedFils);
    // the half-refunded January plan has one 500-fils month left (December); the October plan ten 1,000-fils months
    expect(r.deferredFils).toBe(500 + 10_000);
  });

  test('payments dated after now are ignored', () => {
    expect(revenueRecognition([yearly('2026-12-01')], at('2026-11-16')).collectedFils).toBe(0);
  });
});
