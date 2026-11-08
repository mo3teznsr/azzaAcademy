import { describe, expect, test } from 'bun:test';
import { PriceCalculator } from '../src/modules/payments/price-calculator';

const calc = new PriceCalculator(5);

describe('PriceCalculator', () => {
  test('course price + 5% VAT, in fils', () => {
    const q = calc.quote({ priceFils: 88_000 });
    expect(q).toMatchObject({ subtotalFils: 88_000, discountFils: 0, vatFils: 4_400, totalFils: 92_400, couponCode: null });
    expect(q.display).toEqual({ currency: 'AED', amount: 924, rate: 1 });
  });

  test('batch price overrides course price', () => {
    expect(PriceCalculator.basePrice(75_000, 88_000)).toBe(75_000);
    expect(PriceCalculator.basePrice(null, 88_000)).toBe(88_000);
  });

  test('percent coupon is applied before VAT', () => {
    const q = calc.quote({ priceFils: 88_000, coupon: { code: 'WELCOME10', percentOff: 10, amountOffFils: null } });
    expect(q.discountFils).toBe(8_800);
    expect(q.vatFils).toBe(3_960);
    expect(q.totalFils).toBe(83_160);
    expect(q.couponCode).toBe('WELCOME10');
  });

  test('fixed coupon never discounts below zero', () => {
    const q = calc.quote({ priceFils: 10_000, coupon: { code: 'BIG', percentOff: null, amountOffFils: 50_000 } });
    expect(q.discountFils).toBe(10_000);
    expect(q.totalFils).toBe(0);
  });

  test('display currency uses the fx snapshot (whole units)', () => {
    const q = calc.quote({ priceFils: 88_000, displayCurrency: 'SAR', fxRate: 1.0211 });
    expect(q.totalFils).toBe(92_400);
    expect(q.display).toEqual({ currency: 'SAR', amount: 943, rate: 1.0211 });
  });

  test('VAT rounding stays integer', () => {
    const q = new PriceCalculator(5).quote({ priceFils: 12_345 });
    expect(Number.isInteger(q.vatFils)).toBe(true);
    expect(q.vatFils).toBe(617);
  });
});

describe('inclusive / splitInclusive', () => {
  test('splitInclusive inverts quote for every price', () => {
    const calc = new PriceCalculator(5);
    for (let p = 0; p < 3000; p++) {
      const total = calc.inclusive(p);
      expect(calc.splitInclusive(total)).toEqual({ subtotalFils: p, vatFils: total - p });
    }
    expect(calc.inclusive(4900)).toBe(5145);
  });
});
