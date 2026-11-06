import { beforeEach, describe, expect, test } from 'bun:test';
import { appleSeatProductId, priceFilsOfAppleSeatProduct } from '@azza/shared';
import { loadConfig } from '../src/core/config';
import type { AppleNotification, AppleSignedDataVerifier, AppleTransaction } from '../src/core/ports';
import { FixedClock } from '../src/infrastructure/clock';
import { AppStoreSignedDataVerifier } from '../src/infrastructure/payments/apple-store-verifier';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { decideApplePurchase, receivedFils } from '../src/modules/payments/apple/apple-iap-policy';
import { AppleIapService } from '../src/modules/payments/apple/apple-iap.service';
import { AppleIapCheckout } from '../src/modules/payments/checkout/apple-iap-checkout';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { StripeCheckout } from '../src/modules/payments/checkout/stripe-checkout';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { FinanceAdminService } from '../src/modules/payments/finance-admin.service';
import type { OrderRecord } from '../src/modules/payments/payments.repository';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const PRODUCT = 'com.futuretech.azza.seat.aed880';
const T0 = new Date('2026-11-05T10:00:00Z');

/** Stands in for Apple's signature check: a "JWS" is just a key into this table. */
class FakeAppleVerifier implements AppleSignedDataVerifier {
  transactions = new Map<string, AppleTransaction>();
  notifications = new Map<string, AppleNotification>();
  async verifyTransaction(jws: string) {
    const tx = this.transactions.get(jws);
    if (!tx) throw new Error('bad signature');
    return tx;
  }
  async verifyNotification(jws: string) {
    const n = this.notifications.get(jws);
    if (!n) throw new Error('bad signature');
    return n;
  }
}

const tx = (over: Partial<AppleTransaction> = {}): AppleTransaction => ({
  transactionId: '2000000123',
  originalTransactionId: '2000000123',
  productId: PRODUCT,
  environment: 'Sandbox',
  appAccountToken: null,
  purchaseDate: T0,
  priceMilliunits: 924_000,
  currency: 'AED',
  revocationDate: null,
  ...over,
});

describe('apple seat product ids', () => {
  test('one consumable per whole-dirham price point', () => {
    expect(appleSeatProductId(88_000)).toBe(PRODUCT);
    expect(appleSeatProductId(120_000)).toBe('com.futuretech.azza.seat.aed1200');
    expect(appleSeatProductId(5_000)).toBe('com.futuretech.azza.seat.aed50');
  });

  test('no product for fractional dirhams, zero or invalid prices', () => {
    expect(appleSeatProductId(88_050)).toBeNull();
    expect(appleSeatProductId(0)).toBeNull();
    expect(appleSeatProductId(-100)).toBeNull();
    expect(appleSeatProductId(1.5)).toBeNull();
  });

  test('round-trips back to the price', () => {
    expect(priceFilsOfAppleSeatProduct(PRODUCT)).toBe(88_000);
    expect(priceFilsOfAppleSeatProduct('com.futuretech.azza.seat.aed088')).toBeNull();
    expect(priceFilsOfAppleSeatProduct('com.other.seat.aed880')).toBeNull();
  });
});

describe('apple purchase decision', () => {
  const order = (over: Partial<OrderRecord> = {}) =>
    ({
      id: 'o1',
      userId: 'sara',
      method: 'APPLE_IAP',
      status: 'AWAITING_PAYMENT',
      totalFils: 92_400,
      appleProductId: PRODUCT,
      appleAppAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001',
      appleTransactionId: null,
      ...over,
    }) as OrderRecord;

  test('pays a matching awaiting order and records the transaction', () => {
    const d = decideApplePurchase(order(), tx({ appAccountToken: 'AAAAAAAA-0000-4000-8000-000000000001' }), 'sara');
    expect(d).toEqual({
      kind: 'pay',
      patch: { appleTransactionId: '2000000123', appleOriginalTransactionId: '2000000123', appleEnvironment: 'Sandbox', receivedFils: 92_400 },
    });
  });

  test('a late purchase still pays an expired or failed order', () => {
    expect(decideApplePurchase(order({ status: 'EXPIRED' }), tx(), 'sara').kind).toBe('pay');
    expect(decideApplePurchase(order({ status: 'FAILED' }), tx(), 'sara').kind).toBe('pay');
  });

  test('replaying the same transaction is a duplicate', () => {
    expect(decideApplePurchase(order({ status: 'PAID', appleTransactionId: '2000000123' }), tx(), 'sara')).toEqual({ kind: 'duplicate' });
  });

  test('rejections', () => {
    const reason = (o: Partial<OrderRecord>, t: Partial<AppleTransaction> = {}, user = 'sara') => {
      const d = decideApplePurchase(order(o), tx(t), user);
      return d.kind === 'reject' ? d.reason : d.kind;
    };
    expect(reason({}, {}, 'omar')).toBe('FOREIGN_ORDER');
    expect(reason({ method: 'STRIPE' })).toBe('NOT_APPLE_ORDER');
    expect(reason({}, { productId: 'com.futuretech.azza.seat.aed50' })).toBe('PRODUCT_MISMATCH');
    expect(reason({}, { appAccountToken: 'bbbbbbbb-0000-4000-8000-000000000002' })).toBe('TOKEN_MISMATCH');
    expect(reason({}, { revocationDate: T0 })).toBe('TRANSACTION_REVOKED');
    expect(reason({ status: 'PAID', appleTransactionId: '1999' })).toBe('ORDER_ALREADY_PAID');
    expect(reason({ status: 'REFUNDED' })).toBe('ORDER_REFUNDED');
  });

  test('received amount uses the AED price Apple reports, else the order total', () => {
    expect(receivedFils({ totalFils: 92_400 }, { priceMilliunits: 919_990, currency: 'AED' })).toBe(91_999);
    expect(receivedFils({ totalFils: 92_400 }, { priceMilliunits: 899_990, currency: 'SAR' })).toBe(92_400);
    expect(receivedFils({ totalFils: 92_400 }, { priceMilliunits: null, currency: null })).toBe(92_400);
  });
});

describe('apple in-app purchase flow', () => {
  let clock: FixedClock;
  let repo: InMemoryPaymentsRepository;
  let notifier: RecordingNotifier;
  let verifier: FakeAppleVerifier;
  let checkout: CheckoutService;
  let finance: FinanceAdminService;
  let apple: AppleIapService;
  let tokens: number;
  const reversals: unknown[] = [];

  beforeEach(() => {
    clock = new FixedClock(T0);
    repo = new InMemoryPaymentsRepository(() => clock.now());
    notifier = new RecordingNotifier();
    verifier = new FakeAppleVerifier();
    for (const u of ['sara', 'omar']) repo.addUser(u);
    repo.batches.set('b08', {
      id: 'b08',
      code: 'B08',
      status: 'ENROLLING',
      capacity: 2,
      waitlistEnabled: true,
      priceFils: 88_000,
      timezone: 'Asia/Dubai',
      teacherId: 'lina',
      courseId: 'pdf',
      courseTitle: 'Product Design Foundations',
      firstSessionAt: new Date('2026-12-01T14:00:00Z'),
    });
    repo.coupons.push({ id: 'c1', code: 'WELCOME10', percentOff: 10, amountOffFils: null, active: true, startsOn: null, expiresOn: null, maxRedemptions: 5, redemptions: 0, perUserLimit: 1, minOrderFils: null, courseId: null, batchId: null });
    const machine = new EnrollmentStateMachine();
    const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, 'http://web.test');
    tokens = 0;
    checkout = new CheckoutService(
      repo,
      new CheckoutStrategyRegistry([new StripeCheckout(new FakePaymentGateway(), 'https://azza.test'), new AppleIapCheckout(60, () => `AAAAAAAA-0000-4000-8000-00000000000${++tokens}`)]),
      new PriceCalculator(5),
      { rateFor: async () => 1 },
      machine,
      lifecycle,
      new ReferenceGenerator(() => 0.5),
      notifier,
    );
    reversals.length = 0;
    finance = new FinanceAdminService(repo, lifecycle, new FakePaymentGateway(), { reverseForRefund: async (a) => reversals.push(a) }, notifier, 48);
    apple = new AppleIapService(repo, verifier, checkout, finance);
  });

  const startOrder = async (user = 'sara') => {
    const res = await checkout.checkout(user, { batchId: 'b08', method: 'APPLE_IAP', displayCurrency: 'AED' });
    if (res.waitlisted) throw new Error('unexpected waitlist');
    return res;
  };
  const statusOf = (userId: string) => repo.enrollments.find((e) => e.userId === userId)?.status;

  test('checkout creates an AWAITING_PAYMENT order for the price-point product with a per-order token', async () => {
    const res = await startOrder();
    expect(res.order.method).toBe('APPLE_IAP');
    expect(res.order.status).toBe('AWAITING_PAYMENT');
    expect(res.order.appleProductId).toBe(PRODUCT);
    expect(res.order.appleAppAccountToken).toBe('aaaaaaaa-0000-4000-8000-000000000001');
    expect(res).toMatchObject({ appleProductId: PRODUCT, appAccountToken: 'aaaaaaaa-0000-4000-8000-000000000001' });
    expect(statusOf('sara')).toBe('PENDING_PAYMENT');
  });

  test('checkout refuses coupons and prices without a product', async () => {
    await expect(checkout.checkout('sara', { batchId: 'b08', method: 'APPLE_IAP', displayCurrency: 'AED', couponCode: 'WELCOME10' })).rejects.toMatchObject({
      code: 'COUPON_NOT_SUPPORTED',
    });
    repo.batches.set('b08', { ...repo.batches.get('b08')!, priceFils: 88_050 });
    await expect(startOrder()).rejects.toMatchObject({ code: 'APPLE_PRODUCT_UNAVAILABLE' });
  });

  test('a verified transaction pays the order through the shared paid path, once', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-1', tx({ appAccountToken: order.appleAppAccountToken }));

    const first = await apple.verifyPurchase('sara', { orderId: order.id, signedTransaction: 'jws-1' });
    expect(first.duplicate).toBe(false);
    expect(first.order).toMatchObject({ status: 'PAID', appleTransactionId: '2000000123', appleEnvironment: 'Sandbox', receivedFils: 92_400 });
    expect(statusOf('sara')).toBe('ACTIVE');
    expect(notifier.types().filter((t) => t === 'ENROLLED')).toHaveLength(1);

    // App restarts before finishing the transaction and re-posts it: no second activation.
    const replay = await apple.verifyPurchase('sara', { signedTransaction: 'jws-1' });
    expect(replay.duplicate).toBe(true);
    expect(replay.order.id).toBe(order.id);
    expect(notifier.types().filter((t) => t === 'ENROLLED')).toHaveLength(1);
  });

  test('restored transactions without orderId find their order by appAccountToken', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-restore', tx({ appAccountToken: order.appleAppAccountToken!.toUpperCase() }));
    const res = await apple.verifyPurchase('sara', { signedTransaction: 'jws-restore' });
    expect(res.order.id).toBe(order.id);
    expect(res.order.status).toBe('PAID');
  });

  test('another student cannot claim the purchase; the app is told to keep the transaction', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-1', tx({ appAccountToken: order.appleAppAccountToken }));
    await expect(apple.verifyPurchase('omar', { signedTransaction: 'jws-1' })).rejects.toMatchObject({
      status: 403,
      code: 'FOREIGN_ORDER',
      details: { finishTransaction: false },
    });
    expect(repo.orders[0]!.status).toBe('AWAITING_PAYMENT');
  });

  test('a product mismatch is a final rejection (the app finishes the transaction)', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-x', tx({ productId: 'com.futuretech.azza.seat.aed50' }));
    await expect(apple.verifyPurchase('sara', { orderId: order.id, signedTransaction: 'jws-x' })).rejects.toMatchObject({
      status: 409,
      code: 'PRODUCT_MISMATCH',
      details: { finishTransaction: true },
    });
  });

  test('a signature failure never touches the order', async () => {
    const { order } = await startOrder();
    await expect(apple.verifyPurchase('sara', { orderId: order.id, signedTransaction: 'forged' })).rejects.toThrow('bad signature');
    expect(repo.orders[0]!.status).toBe('AWAITING_PAYMENT');
  });

  test('REFUND notification refunds the order, cancels the seat and is idempotent', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-1', tx({ appAccountToken: order.appleAppAccountToken }));
    await apple.verifyPurchase('sara', { signedTransaction: 'jws-1' });
    const refund: AppleNotification = { notificationUUID: 'n1', notificationType: 'REFUND', subtype: null, environment: 'Sandbox', transaction: tx({ revocationDate: T0 }) };
    verifier.notifications.set('note-1', refund);

    expect(await apple.handleNotification('note-1')).toMatchObject({ handled: true });
    expect(repo.orders[0]).toMatchObject({ status: 'REFUNDED', refundedFils: 92_400 });
    expect(statusOf('sara')).toBe('REFUNDED');
    expect(reversals).toHaveLength(1);
    expect(notifier.types()).toContain('ORDER_REFUNDED');

    expect(await apple.handleNotification('note-1')).toMatchObject({ handled: true, duplicate: true });
    expect(reversals).toHaveLength(1);
  });

  test('REVOKE also cancels; other notification types and unknown transactions are ignored', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-1', tx({ appAccountToken: order.appleAppAccountToken }));
    await apple.verifyPurchase('sara', { signedTransaction: 'jws-1' });
    verifier.notifications.set('consumption', { notificationUUID: 'n2', notificationType: 'CONSUMPTION_REQUEST', subtype: null, environment: 'Sandbox', transaction: tx() });
    verifier.notifications.set('unknown', { notificationUUID: 'n3', notificationType: 'REFUND', subtype: null, environment: 'Sandbox', transaction: tx({ transactionId: '999' }) });
    verifier.notifications.set('revoke', { notificationUUID: 'n4', notificationType: 'REVOKE', subtype: null, environment: 'Sandbox', transaction: tx() });

    expect(await apple.handleNotification('consumption')).toMatchObject({ handled: false });
    expect(await apple.handleNotification('unknown')).toMatchObject({ handled: false });
    expect(repo.orders[0]!.status).toBe('PAID');
    expect(await apple.handleNotification('revoke')).toMatchObject({ handled: true });
    expect(repo.orders[0]!.status).toBe('REFUNDED');
  });

  test('admins cannot refund in-app purchases themselves', async () => {
    const { order } = await startOrder();
    verifier.transactions.set('jws-1', tx({ appAccountToken: order.appleAppAccountToken }));
    await apple.verifyPurchase('sara', { signedTransaction: 'jws-1' });
    await expect(finance.refund(order.id, { amountAed: 924, reason: 'changed mind' })).rejects.toMatchObject({ code: 'APPLE_REFUND_VIA_APPLE' });
  });
});

describe('apple verifier adapter & config', () => {
  test('rejects malformed and unsigned data before touching the network', async () => {
    const v = new AppStoreSignedDataVerifier({ bundleId: 'com.futuretech.azza', environments: ['Sandbox'], onlineChecks: false });
    await expect(v.verifyTransaction('not-a-jws')).rejects.toMatchObject({ code: 'APPLE_VERIFICATION_FAILED' });
    const unsigned = (payload: object) => `${Buffer.from('{"alg":"ES256"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
    await expect(v.verifyTransaction(unsigned({ environment: 'Production', bundleId: 'com.futuretech.azza' }))).rejects.toMatchObject({
      code: 'APPLE_ENVIRONMENT_NOT_ACCEPTED',
    });
    await expect(
      v.verifyTransaction(unsigned({ environment: 'Sandbox', bundleId: 'com.futuretech.azza', transactionId: '1', productId: PRODUCT })),
    ).rejects.toMatchObject({ code: 'APPLE_VERIFICATION_FAILED' });
  });

  test('APPLE_IAP_ENVIRONMENT parsing', () => {
    const env = { DATABASE_URL: 'postgresql://x', BETTER_AUTH_SECRET: 'x'.repeat(32) };
    expect(loadConfig(env).appleEnvironments).toEqual(['Sandbox']);
    expect(loadConfig({ ...env, APPLE_IAP_ENVIRONMENT: 'Production, Sandbox', APPLE_APP_APPLE_ID: '6740000000' }).appleEnvironments).toEqual(['Production', 'Sandbox']);
    expect(() => loadConfig({ ...env, APPLE_IAP_ENVIRONMENT: 'Production', APPLE_APP_APPLE_ID: '' })).toThrow(/APPLE_APP_APPLE_ID/);
    expect(() => loadConfig({ ...env, APPLE_IAP_ENVIRONMENT: 'Xcode' })).toThrow(/APPLE_IAP_ENVIRONMENT/);
  });
});
