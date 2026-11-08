import { describe, expect, it } from 'bun:test';
import {
  GRACE_DAYS,
  YEARLY_REMINDER_DAYS,
  appleRecordedProductId,
  cutSettingsInput,
  recordedPricingInput,
  quizInput,
  subscribeInput,
  updateQuizInput,
  videoPositionInput,
  yearlySavingMonths,
} from '@azza/shared';

describe('recorded course shared contracts', () => {
  it('rejects a yearly price that is not below twelve months', () => {
    expect(recordedPricingInput.safeParse({ monthlyPriceFils: 4900, yearlyPriceFils: 58800 }).success).toBe(false);
    expect(recordedPricingInput.safeParse({ monthlyPriceFils: 4900, yearlyPriceFils: 49000 }).success).toBe(true);
    expect(recordedPricingInput.safeParse({ monthlyPriceFils: 50, yearlyPriceFils: 40 }).success).toBe(false);
  });

  it('builds Apple product ids and savings', () => {
    expect(appleRecordedProductId('ux-basics', 'YEARLY')).toBe('com.futuretech.azza.rec.ux-basics.yearly');
    expect(appleRecordedProductId('ux-basics', 'MONTHLY')).toBe('com.futuretech.azza.rec.ux-basics.monthly');
    expect(yearlySavingMonths(4900, 49000)).toBe(2);
    expect(GRACE_DAYS).toBe(16);
    expect(YEARLY_REMINDER_DAYS).toBe(7);
  });

  it('validates cuts, subscribe and video position', () => {
    expect(cutSettingsInput.safeParse({ liveCutPercent: 101, recordedCutPercent: 60 }).success).toBe(false);
    expect(subscribeInput.safeParse({ plan: 'MONTHLY', method: 'BANK_TRANSFER', bankAccountId: 'b1' }).success).toBe(true);
    expect(subscribeInput.safeParse({ plan: 'WEEKLY', method: 'STRIPE' }).success).toBe(false);
    expect(videoPositionInput.safeParse({ positionSec: -1 }).success).toBe(false);
  });

  it('keeps quiz defaults on create but not on update', () => {
    const patch = updateQuizInput.parse({ title: 'abc' });
    expect(Object.keys(patch)).toEqual(['title']);
    for (const k of ['passPercent', 'maxAttempts', 'description', 'questions']) expect(k in patch).toBe(false);
    const created = quizInput.parse({ title: 'abc' });
    expect(created.passPercent).toBe(70);
    expect(created.maxAttempts).toBe(1);
    expect(created.description).toBe('');
    expect(created.questions).toEqual([]);
  });
});
