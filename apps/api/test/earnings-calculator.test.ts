import { describe, expect, test } from 'bun:test';
import { EarningsCalculator } from '../src/modules/payouts/earnings-calculator';

const calc = new EarningsCalculator(60);

describe('EarningsCalculator', () => {
  test('per-session share = round(60% × net / sessionCount)', () => {
    expect(calc.sessionShare(2_000_000, 12)).toBe(100_000);
    expect(calc.sessionShare(1_000_001, 12)).toBe(Math.round(0.6 * (1_000_001 / 12)));
    expect(calc.sessionShare(0, 12)).toBe(0);
    expect(calc.sessionShare(100_000, 0)).toBe(0);
  });

  test('order net excludes VAT, refunds and processor fees', () => {
    // 924 AED incl. 44 VAT, Stripe fee 27.80 AED
    expect(calc.orderNet({ totalFils: 92_400, vatFils: 4_400, refundedFils: 0, feeFils: 2_780 })).toBe(88_000 - 2_780);
    // fully refunded: only the fee is lost
    expect(calc.orderNet({ totalFils: 92_400, vatFils: 4_400, refundedFils: 92_400, feeFils: 2_780 })).toBe(-2_780);
    // half refunded
    expect(calc.orderNet({ totalFils: 92_400, vatFils: 4_400, refundedFils: 46_200, feeFils: 0 })).toBe(44_000);
  });

  test('batch breakdown: gross − refunds − VAT − fees = net', () => {
    const orders = [
      { totalFils: 92_400, vatFils: 4_400, refundedFils: 0, feeFils: 2_780 },
      { totalFils: 92_400, vatFils: 4_400, refundedFils: 46_200, feeFils: 0 },
    ];
    const b = calc.batchBreakdown(orders);
    expect(b.netFils).toBe(calc.batchNet(orders));
    expect(b.grossFils).toBe(184_800);
    expect(b.refundsFils).toBe(46_200);
    expect(b.feesFils).toBe(2_780);
    expect(b.grossFils - b.refundsFils - b.vatFils - b.feesFils).toBe(b.netFils);
  });

  test('batch net sums orders', () => {
    const orders = Array.from({ length: 23 }, () => ({ totalFils: 92_400, vatFils: 4_400, refundedFils: 0, feeFils: 0 }));
    expect(calc.batchNet(orders)).toBe(23 * 88_000);
    expect(calc.sessionShare(calc.batchNet(orders), 12)).toBe(101_200);
  });

  test('refund reversal claws back the delivered part only (negative)', () => {
    expect(calc.refundReversal(88_000, 4, 12)).toBe(-17_600);
    expect(calc.refundReversal(88_000, 0, 12)).toBe(0);
    expect(calc.refundReversal(88_000, 20, 12)).toBe(-52_800); // capped at sessionCount
  });

  test('payout decision: HELD without verified bank, CARRIED_OVER below minimum, else READY', () => {
    const min = 20_000;
    expect(calc.payoutDecision({ amountFils: 500_000, hasBankDetails: false, bankVerified: false, minPayoutFils: min })).toEqual({ status: 'HELD', holdReason: 'NO_BANK_DETAILS' });
    expect(calc.payoutDecision({ amountFils: 500_000, hasBankDetails: true, bankVerified: false, minPayoutFils: min })).toEqual({ status: 'HELD', holdReason: 'BANK_DETAILS_UNVERIFIED' });
    expect(calc.payoutDecision({ amountFils: 19_999, hasBankDetails: true, bankVerified: true, minPayoutFils: min })).toEqual({ status: 'CARRIED_OVER', holdReason: 'BELOW_MINIMUM' });
    expect(calc.payoutDecision({ amountFils: 20_000, hasBankDetails: true, bankVerified: true, minPayoutFils: min })).toEqual({ status: 'READY', holdReason: null });
  });
});
