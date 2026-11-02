import { describe, expect, test } from 'bun:test';
import type { AppError } from '../src/core/errors';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { BankTransferCheckout } from '../src/modules/payments/checkout/bank-transfer-checkout';
import { CheckoutStrategyRegistry, type CheckoutContext } from '../src/modules/payments/checkout/checkout-strategy';
import { StripeCheckout } from '../src/modules/payments/checkout/stripe-checkout';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { InMemoryPaymentsRepository, RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-02T10:00:00Z');
const repo = new InMemoryPaymentsRepository(() => now);
repo.bankAccounts.push(
  { id: 'adcb', bankName: 'ADCB', accountName: 'Co', iban: 'AE000000000000000000002', swift: 'ADCBAEAA', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 2 },
  { id: 'enbd', bankName: 'Emirates NBD', accountName: 'Co', iban: 'AE000000000000000000001', swift: 'EBILAEAD', branch: null, instructions: null, currency: 'AED', active: true, sortOrder: 1 },
  { id: 'off', bankName: 'Old', accountName: 'Co', iban: 'AE000000000000000000003', swift: 'OLDXAEAA', branch: null, instructions: null, currency: 'AED', active: false, sortOrder: 0 },
);
const notifier = new RecordingNotifier();
const stripe = new StripeCheckout(new FakePaymentGateway());
const bank = new BankTransferCheckout(repo, notifier, 48);
const registry = new CheckoutStrategyRegistry([stripe, bank]);

const ctx = (bankAccountId?: string): CheckoutContext => ({
  user: { id: 'sara', name: 'Sara', email: 'sara@azza.test', locale: 'en', timezone: 'Asia/Dubai' },
  batch: { id: 'b08', code: 'B08', status: 'ENROLLING', capacity: 24, waitlistEnabled: true, priceFils: null, timezone: 'Asia/Dubai', teacherId: 'lina', courseTitle: 'Product Design Foundations', coursePriceFils: 88_000, firstSessionAt: null },
  quote: new PriceCalculator(5).quote({ priceFils: 88_000 }),
  reference: 'AZ-B08-12345',
  input: { batchId: 'b08', method: bankAccountId ? 'BANK_TRANSFER' : 'STRIPE', displayCurrency: 'AED', bankAccountId },
  now,
});

describe('checkout strategy selection', () => {
  test('registry returns the strategy for each method', () => {
    expect(registry.get('STRIPE')).toBe(stripe);
    expect(registry.get('BANK_TRANSFER')).toBe(bank);
    expect(registry.methods().sort()).toEqual(['BANK_TRANSFER', 'STRIPE']);
  });

  test('a method without a registered strategy is rejected', () => {
    const onlyStripe = new CheckoutStrategyRegistry([stripe]);
    try {
      onlyStripe.get('BANK_TRANSFER');
      throw new Error('expected failure');
    } catch (e) {
      expect((e as AppError).code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    }
  });

  test('each strategy declares its pending enrollment status', () => {
    expect(stripe.pendingEnrollmentStatus).toBe('PENDING_PAYMENT');
    expect(bank.pendingEnrollmentStatus).toBe('AWAITING_TRANSFER');
  });

  test('Stripe creates an AED payment intent for the total and returns a client secret', async () => {
    const start = await stripe.start(ctx());
    expect(start.orderStatus).toBe('AWAITING_PAYMENT');
    expect(start.stripePaymentIntentId).toBe('pi_dev_AZ-B08-12345');
    expect(start.response).toEqual({ clientSecret: 'pi_dev_AZ-B08-12345_secret' });
  });

  test('bank transfer holds the seat 48h on the first active account by sort order', async () => {
    const start = await bank.start({ ...ctx(), input: { ...ctx().input, method: 'BANK_TRANSFER' } });
    expect(start.orderStatus).toBe('AWAITING_RECEIPT');
    expect(start.bankAccountId).toBe('enbd');
    expect(start.expiresAt?.toISOString()).toBe('2026-11-04T10:00:00.000Z');
    expect(start.response.reference).toBe('AZ-B08-12345');
  });

  test('bank transfer honours the chosen account and refuses inactive ones', async () => {
    expect((await bank.start(ctx('adcb'))).bankAccountId).toBe('adcb');
    await expect(bank.start(ctx('off'))).rejects.toMatchObject({ code: 'NO_BANK_ACCOUNT' });
    await expect(bank.start(ctx('nope'))).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('references look like AZ-B07-48213', () => {
    expect(new ReferenceGenerator(() => 0.42459).next('B07')).toMatch(/^AZ-B07-\d{5}$/);
    expect(new ReferenceGenerator(() => 0).next('B07')).toBe('AZ-B07-10000');
  });
});
