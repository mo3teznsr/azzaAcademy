import { describe, expect, test } from 'bun:test';
import { present } from '../src/modules/courses/course.service';
import type { CourseRecord } from '../src/modules/courses/course.repository';
import { PriceCalculator } from '../src/modules/payments/price-calculator';

const recorded = { id: 'c1', slug: 'logo', type: 'RECORDED', createdById: null, monthlyPriceFils: 9_429, yearlyPriceFils: 85_619 } as unknown as CourseRecord;

describe('course plan totals', () => {
  test('a recorded course carries what the learner pays, VAT included', () => {
    const prices = new PriceCalculator(5);
    const dto = present(recorded, null, (f) => prices.inclusive(f));
    expect(dto.monthlyTotalFils).toBe(9_900);
    expect(dto.yearlyTotalFils).toBe(89_900);
    // The pre-VAT prices stay as they are for the admin and the payment logic.
    expect(dto.monthlyPriceFils).toBe(9_429);
  });

  test('no plan price, or no VAT source, means no total', () => {
    expect(present({ ...recorded, monthlyPriceFils: null } as CourseRecord, null, (f) => f).monthlyTotalFils).toBeNull();
    expect(present(recorded).yearlyTotalFils).toBeNull();
  });
});
