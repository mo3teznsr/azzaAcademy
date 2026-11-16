import { beforeEach, describe, expect, test } from 'bun:test';
import { filsToTabbyAmount, tabbyAmountToFils, tabbyInstallmentFils } from '@azza/shared';
import { loadConfig, tabbyConfigured } from '../src/core/config';
import { FixedClock } from '../src/infrastructure/clock';
import { FakePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { FakeTabbyGateway, HttpTabbyGateway, headerMatches, toTabbyPayment, toTabbySession } from '../src/infrastructure/payments/tabby-gateway';
import { CheckoutStrategyRegistry } from '../src/modules/payments/checkout/checkout-strategy';
import { StripeCheckout } from '../src/modules/payments/checkout/stripe-checkout';
import { TabbyCheckout } from '../src/modules/payments/checkout/tabby-checkout';
import { CheckoutService } from '../src/modules/payments/checkout.service';
import { EnrollmentLifecycle } from '../src/modules/payments/enrollment-lifecycle';
import { EnrollmentStateMachine } from '../src/modules/payments/enrollment-state';
import { FinanceAdminService } from '../src/modules/payments/finance-admin.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { ReferenceGenerator } from '../src/modules/payments/reference-generator';
import { TabbyPaymentService } from '../src/modules/payments/tabby/tabby-payment.service';
import { webhookRoutes } from '../src/modules/webhooks/webhook.routes';
import { errorHandler } from '../src/http/error-handler';
import { InMemoryPaymentsRepository, RecordingBroadcaster, RecordingNotifier } from './fakes/in-memory';

const T0 = new Date('2026-11-16T10:00:00Z');
const WEB = 'https://azza.test';

describe('tabby amounts', () => {
  test('fils ↔ Tabby decimal strings', () => {
    expect(filsToTabbyAmount(92_400)).toBe('924.00');
    expect(filsToTabbyAmount(5)).toBe('0.05');
    expect(tabbyAmountToFils('924.00')).toBe(92_400);
    expect(tabbyAmountToFils('924')).toBe(92_400);
    expect(tabbyAmountToFils('924.5')).toBe(92_450);
    expect(Number.isNaN(tabbyAmountToFils('abc'))).toBe(true);
    expect(() => filsToTabbyAmount(1.5)).toThrow();
  });

  test('"4 payments of" follows Tabby’s total × 1.015 / 4', () => {
    expect(tabbyInstallmentFils(92_400)).toBe(23_447); // 924 × 1.015 / 4 = 234.465
  });

  test('responses map to the port', () => {
    expect(
      toTabbySession({
        status: 'created',
        payment: { id: 'p1' },
        configuration: { available_products: { installments: [{ web_url: 'https://checkout.tabby.ai/x' }] }, products: { installments: { rejection_reason: null } } },
      }),
    ).toEqual({ status: 'created', paymentId: 'p1', webUrl: 'https://checkout.tabby.ai/x', rejectionReason: null });
    expect(toTabbySession({ status: 'rejected', configuration: { available_products: {}, products: { installments: { rejection_reason: 'order_amount_too_high' } } } })).toMatchObject({
      status: 'rejected',
      webUrl: null,
      rejectionReason: 'order_amount_too_high',
    });
    expect(toTabbyPayment({ id: 'p1', status: 'closed', amount: '924.00', currency: 'AED', captures: [{ amount: '924.00' }], refunds: [{ amount: '100' }], order: { reference_id: 'AZ-1' } })).toEqual({
      id: 'p1',
      status: 'CLOSED',
      amountFils: 92_400,
      currency: 'AED',
      referenceId: 'AZ-1',
      capturedFils: 92_400,
      refundedFils: 10_000,
    });
  });

  test('webhook header comparison', () => {
    expect(headerMatches('s3cret', 's3cret')).toBe(true);
    expect(headerMatches('s3cret', 's3creT')).toBe(false);
    expect(headerMatches('s3cre', 's3cret')).toBe(false);
    expect(headerMatches(undefined, 's3cret')).toBe(false);
    expect(headerMatches('x', undefined)).toBe(false);
  });
});

describe('tabby config', () => {
  const env = { DATABASE_URL: 'postgres://x', BETTER_AUTH_SECRET: 'x'.repeat(32) };
  test('offered only with a secret key and a merchant code', () => {
    expect(tabbyConfigured(loadConfig(env))).toBe(false);
    expect(tabbyConfigured(loadConfig({ ...env, TABBY_SECRET_KEY: 'sk_test_1' }))).toBe(false);
    expect(tabbyConfigured(loadConfig({ ...env, TABBY_SECRET_KEY: 'sk_test_1', TABBY_MERCHANT_CODE: 'AZZA' }))).toBe(true);
    expect(loadConfig(env).TABBY_WEBHOOK_HEADER).toBe('X-Tabby-Webhook-Secret');
  });
});

describe('HTTP adapter (fetch stubbed, never the live API)', () => {
  test('creates the session with the full payload, Bearer auth and lines that add up', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchStub = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({ status: 'created', payment: { id: 'pay_1' }, configuration: { available_products: { installments: [{ web_url: 'https://checkout.tabby.ai/s' }] } } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const gw = new HttpTabbyGateway({ secretKey: 'sk_test_x', merchantCode: 'AZZA', webhookHeader: 'X-H', webhookSecret: 's', fetch: fetchStub });
    const r = await gw.createSession({
      reference: 'AZ-B08-1',
      amountFils: 83_160,
      subtotalFils: 88_000,
      discountFils: 8_800,
      vatFils: 3_960,
      buyer: { name: 'Sara', email: 'otp.success@tabby.ai', phone: '+971500000001' },
      registeredSince: T0,
      item: { reference: 'b08', title: 'Design · B08', category: 'Education' },
      lang: 'ar',
      successUrl: `${WEB}/ok`,
      cancelUrl: `${WEB}/cancel`,
      failureUrl: `${WEB}/fail`,
    });
    expect(r).toEqual({ status: 'created', paymentId: 'pay_1', webUrl: 'https://checkout.tabby.ai/s', rejectionReason: null });
    expect(calls[0]!.url).toBe('https://api.tabby.ai/api/v2/checkout');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_x');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).toMatchObject({ lang: 'ar', merchant_code: 'AZZA', merchant_urls: { success: `${WEB}/ok`, cancel: `${WEB}/cancel`, failure: `${WEB}/fail` } });
    expect(body.payment).toMatchObject({ amount: '831.60', currency: 'AED', buyer: { phone: '+971500000001' } });
    const o = body.payment.order;
    expect(o).toMatchObject({ reference_id: 'AZ-B08-1', tax_amount: '39.60', discount_amount: '88.00', shipping_amount: '0.00' });
    expect(o.items[0]).toMatchObject({ quantity: 1, unit_price: '880.00', category: 'Education' });
    // Σ(unit_price × qty − item discount) + tax + shipping − order discount = amount
    expect(880 + 39.6 + 0 - 88).toBeCloseTo(831.6, 5);
  });

  test('capture and refund send the idempotency key; errors become TABBY_ERROR', async () => {
    const bodies: unknown[] = [];
    let status = 200;
    const fetchStub = (async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response(status === 200 ? JSON.stringify({ id: 'p', status: 'CLOSED', amount: '10.00', currency: 'AED', captures: [{ amount: '10.00' }] }) : '{"error":"x"}', { status });
    }) as unknown as typeof fetch;
    const gw = new HttpTabbyGateway({ secretKey: 'sk', merchantCode: 'M', webhookHeader: 'X', webhookSecret: 's', fetch: fetchStub });
    expect((await gw.capture('p', 1_000, 'capture-o1')).status).toBe('CLOSED');
    await gw.refund('p', 500, 'refund-o1-0', 'Changed plans');
    expect(bodies).toEqual([
      { amount: '10.00', reference_id: 'capture-o1' },
      { amount: '5.00', reference_id: 'refund-o1-0', reason: 'Changed plans' },
    ]);
    status = 400;
    await expect(gw.refund('p', 500, 'k', 'r')).rejects.toMatchObject({ code: 'TABBY_ERROR' });
  });
});

describe('tabby seat checkout', () => {
  let repo: InMemoryPaymentsRepository;
  let notifier: RecordingNotifier;
  let tabby: FakeTabbyGateway;
  let checkout: CheckoutService;
  let service: TabbyPaymentService;
  let finance: FinanceAdminService;
  const reversals: unknown[] = [];
  let refs = 0;

  beforeEach(() => {
    const clock = new FixedClock(T0);
    repo = new InMemoryPaymentsRepository(() => clock.now());
    notifier = new RecordingNotifier();
    tabby = new FakeTabbyGateway('X-Tabby-Webhook-Secret', 'whsec_test');
    repo.users.set('sara', { id: 'sara', name: 'Sara Ali', email: 'sara@test', locale: 'ar', timezone: 'Asia/Dubai', phone: '+971500000001', createdAt: new Date('2025-01-01T00:00:00Z') });
    repo.addUser('nophone');
    repo.batches.set('b08', {
      id: 'b08',
      code: 'B08',
      status: 'ENROLLING',
      capacity: 24,
      waitlistEnabled: true,
      priceFils: 88_000,
      timezone: 'Asia/Dubai',
      teacherId: 'lina',
      courseId: 'pdf',
      courseTitle: 'Product Design Foundations',
      firstSessionAt: null,
    });
    repo.coupons.push({ id: 'c1', code: 'WELCOME10', percentOff: 10, amountOffFils: null, active: true, startsOn: null, expiresOn: null, maxRedemptions: 5, redemptions: 0, perUserLimit: 1, minOrderFils: null, courseId: null, batchId: null });
    const machine = new EnrollmentStateMachine();
    const lifecycle = new EnrollmentLifecycle(repo, machine, notifier, new RecordingBroadcaster(), clock, WEB);
    checkout = new CheckoutService(
      repo,
      new CheckoutStrategyRegistry([new StripeCheckout(new FakePaymentGateway(), WEB), new TabbyCheckout(tabby, WEB)]),
      new PriceCalculator(5),
      { rateFor: async () => 1 },
      machine,
      lifecycle,
      new ReferenceGenerator(() => (refs = (refs + 0.137) % 1)),
      notifier,
    );
    reversals.length = 0;
    finance = new FinanceAdminService(repo, lifecycle, new FakePaymentGateway(), { reverseForRefund: async (a) => void reversals.push(a) }, notifier, 48, tabby);
    service = new TabbyPaymentService(repo, tabby, checkout, lifecycle);
  });

  const start = async (user = 'sara', couponCode?: string) => {
    const res = await checkout.checkout(user, { batchId: 'b08', method: 'TABBY', displayCurrency: 'AED', couponCode });
    if (res.waitlisted) throw new Error('unexpected waitlist');
    return res;
  };
  const enrollmentOf = (userId: string) => repo.enrollments.find((e) => e.userId === userId)?.status;
  const enrolledCount = () => notifier.types().filter((t) => t === 'ENROLLED').length;

  test('holds the seat and returns Tabby’s hosted page', async () => {
    const res = await start();
    expect(res.order).toMatchObject({ method: 'TABBY', status: 'AWAITING_PAYMENT', totalFils: 92_400, tabbyPaymentId: 'tabby_pay_1' });
    expect(res.order.expiresAt?.toISOString()).toBe('2026-11-16T10:45:00.000Z');
    expect(res).toMatchObject({ checkoutUrl: 'https://checkout.tabby.test/?sessionId=tabby_pay_1' });
    expect(enrollmentOf('sara')).toBe('PENDING_PAYMENT');
    const s = tabby.sessions[0]!;
    expect(s).toMatchObject({ reference: res.order.reference, amountFils: 92_400, subtotalFils: 88_000, vatFils: 4_400, discountFils: 0, lang: 'ar' });
    expect(s.buyer).toEqual({ name: 'Sara Ali', email: 'sara@test', phone: '+971500000001' });
    expect(s.successUrl).toBe(`${WEB}/checkout/return?ref=${res.order.reference}&provider=tabby`);
    expect(s.cancelUrl).toEndWith('&cancelled=1');
    expect(s.failureUrl).toEndWith('&failed=1');
  });

  test('coupon lines add up to the amount Tabby charges', async () => {
    await start('sara', 'WELCOME10');
    const s = tabby.sessions[0]!;
    expect(s.subtotalFils - s.discountFils + s.vatFils).toBe(s.amountFils);
  });

  test('needs a phone, and a rejected session holds no seat', async () => {
    await expect(start('nophone')).rejects.toMatchObject({ code: 'PHONE_REQUIRED' });
    tabby.rejectWith = 'order_amount_too_high';
    await expect(start()).rejects.toMatchObject({ code: 'TABBY_REJECTED', details: { reason: 'order_amount_too_high' } });
    expect(repo.orders).toHaveLength(0);
    expect(repo.enrollments).toHaveLength(0);
  });

  test('not offered when no strategy is registered', async () => {
    const bare = new CheckoutService(
      repo,
      new CheckoutStrategyRegistry([new StripeCheckout(new FakePaymentGateway(), WEB)]),
      new PriceCalculator(5),
      { rateFor: async () => 1 },
      new EnrollmentStateMachine(),
      new EnrollmentLifecycle(repo, new EnrollmentStateMachine(), notifier, new RecordingBroadcaster(), new FixedClock(T0), WEB),
      new ReferenceGenerator(),
      notifier,
    );
    await expect(bare.checkout('sara', { batchId: 'b08', method: 'TABBY', displayCurrency: 'AED' })).rejects.toMatchObject({ code: 'PAYMENT_METHOD_UNAVAILABLE' });
  });

  test('AUTHORIZED → captured in full once → PAID through confirmPaid, idempotent across webhook and return page', async () => {
    const { order } = await start('sara', 'WELCOME10');
    expect((await service.confirmForUser('sara', order.id)).outcome).toBe('pending'); // still CREATED

    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    const [a, b] = await Promise.all([service.confirmForUser('sara', order.id), service.sync(order)]);
    expect([a.outcome, b.outcome].sort()).toEqual(['duplicate', 'paid']);
    expect(tabby.captures).toEqual([{ paymentId: order.tabbyPaymentId!, amountFils: order.totalFils, referenceId: `capture-${order.id}` }]);
    expect(repo.orders[0]).toMatchObject({ status: 'PAID', feeFils: 0, receivedFils: order.totalFils });
    expect(enrollmentOf('sara')).toBe('ACTIVE');
    expect(repo.redemptions).toHaveLength(1);

    // Tabby's capture + close notifications (and replays) change nothing.
    const body = JSON.stringify({ id: order.tabbyPaymentId, status: 'closed' });
    const header = (n: string) => (n === 'X-Tabby-Webhook-Secret' ? 'whsec_test' : undefined);
    expect(await service.handleWebhook(body, header)).toMatchObject({ outcome: 'duplicate' });
    expect(await service.handleWebhook(body, header)).toMatchObject({ outcome: 'duplicate' });
    expect(tabby.captures).toHaveLength(1);
    expect(enrolledCount()).toBe(1);
  });

  test('a failed capture releases the claim so the next delivery captures', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    tabby.failCapture = true;
    await expect(service.sync(order)).rejects.toMatchObject({ code: 'TABBY_ERROR' });
    expect(repo.orders[0]!.status).toBe('AWAITING_PAYMENT');
    tabby.failCapture = false;
    expect((await service.sync(repo.orders[0]!)).outcome).toBe('paid');
  });

  test('an amount that does not match the order is not confirmed', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED', { amountFils: 100 });
    await expect(service.sync(order)).rejects.toMatchObject({ code: 'TABBY_AMOUNT_MISMATCH' });
    expect(tabby.captures).toHaveLength(0);
    expect(repo.orders[0]!.status).toBe('AWAITING_PAYMENT');
  });

  test('REJECTED and EXPIRED mark the order FAILED once; the seat stays held for a retry', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'REJECTED');
    expect((await service.confirmForUser('sara', order.id)).outcome).toBe('failed');
    expect((await service.confirmForUser('sara', order.id)).outcome).toBe('duplicate');
    expect(repo.orders[0]!.status).toBe('FAILED');
    expect(enrollmentOf('sara')).toBe('PENDING_PAYMENT');

    const retry = await start();
    tabby.setStatus(retry.order.tabbyPaymentId!, 'EXPIRED');
    expect((await service.sync(retry.order)).outcome).toBe('failed');
  });

  test('a late authorization still pays an order our expiry job closed', async () => {
    const { order } = await start();
    await repo.updateOrder(order.id, { status: 'EXPIRED' });
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    expect((await service.sync(repo.orders[0]!)).outcome).toBe('paid');
    expect(enrollmentOf('sara')).toBe('ACTIVE');
  });

  test('webhook: bad header → 401, unknown payment → 404 (so Tabby retries)', async () => {
    const app = webhookRoutes({ tabby: service } as unknown as Parameters<typeof webhookRoutes>[0]);
    app.onError(errorHandler);
    const post = (body: unknown, secret?: string) =>
      app.request('/tabby', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(secret && { 'X-Tabby-Webhook-Secret': secret }) } });
    expect((await post({ id: 'x', status: 'authorized' })).status).toBe(401);
    expect((await post({ id: 'x', status: 'authorized' }, 'wrong')).status).toBe(401);
    expect((await post({ id: 'nope', status: 'authorized' }, 'whsec_test')).status).toBe(404);

    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    const res = await post({ id: order.tabbyPaymentId, status: 'authorized' }, 'whsec_test');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, outcome: 'paid', orderId: order.id });
  });

  test('another student cannot confirm the order', async () => {
    const { order } = await start();
    await expect(service.confirmForUser('nophone', order.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('admin refunds go through Tabby with an order-derived key, then recordRefund', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    await service.sync(order);

    const partial = await finance.refund(order.id, { amountAed: 100, reason: 'Missed first week' });
    expect(partial).toMatchObject({ refundFils: 10_000, manual: false });
    expect(partial.order).toMatchObject({ status: 'PAID', refundedFils: 10_000 });
    const rest = await finance.refund(order.id, { amountAed: 824, reason: 'Left the course' });
    expect(rest.order).toMatchObject({ status: 'REFUNDED', refundedFils: 92_400 });
    expect(tabby.refunds.map((r) => [r.amountFils, r.referenceId])).toEqual([
      [10_000, `refund-${order.id}-0`],
      [82_400, `refund-${order.id}-10000`],
    ]);
    expect(enrollmentOf('sara')).toBe('REFUNDED');
    expect(reversals).toHaveLength(2);
  });

  test('a Tabby refund that Tabby refuses books nothing', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    await service.sync(order);
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED'); // not CLOSED: Tabby refuses refunds
    await expect(finance.refund(order.id, { amountAed: 10, reason: 'Test refund' })).rejects.toMatchObject({ code: 'TABBY_ERROR' });
    expect(repo.orders[0]!.refundedFils).toBe(0);
  });

  test('without Tabby configured, refunds of TABBY orders are refused', async () => {
    const { order } = await start();
    tabby.setStatus(order.tabbyPaymentId!, 'AUTHORIZED');
    await service.sync(order);
    const noTabby = new FinanceAdminService(repo, new EnrollmentLifecycle(repo, new EnrollmentStateMachine(), notifier, new RecordingBroadcaster(), new FixedClock(T0), WEB), new FakePaymentGateway(), { reverseForRefund: async () => {} }, notifier, 48);
    await expect(noTabby.refund(order.id, { amountAed: 10, reason: 'Test refund' })).rejects.toMatchObject({ code: 'TABBY_NOT_CONFIGURED' });
  });

  describe('eligibility', () => {
    test('available with the monthly figure; rejection reasons pass through', async () => {
      expect(await service.eligibility('sara', { batchId: 'b08' })).toEqual({ available: true, reason: null, installmentFils: tabbyInstallmentFils(92_400) });
      tabby.rejectWith = 'order_amount_too_low';
      expect(await service.eligibility('sara', { batchId: 'b08' })).toMatchObject({ available: false, reason: 'order_amount_too_low' });
    });

    test('needs a phone and a configured gateway; fails open when Tabby is down', async () => {
      expect(await service.eligibility('nophone', { batchId: 'b08' })).toMatchObject({ available: false, reason: 'PHONE_REQUIRED' });
      const off = new TabbyPaymentService(repo, null, checkout, { orderUpdated: () => {} });
      expect(await off.eligibility('sara', { batchId: 'b08' })).toMatchObject({ available: false, reason: 'NOT_CONFIGURED' });
      tabby.failEligibility = true;
      expect(await service.eligibility('sara', { batchId: 'b08' })).toMatchObject({ available: true });
    });

    test('prices the coupon in', async () => {
      const r = await service.eligibility('sara', { batchId: 'b08', couponCode: 'WELCOME10' });
      expect(r.installmentFils).toBe(tabbyInstallmentFils(83_160));
    });
  });
});
