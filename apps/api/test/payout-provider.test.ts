import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { StripeConnectPayoutProvider, verifyStripeSignature } from '../src/infrastructure/payments/stripe-connect-payouts';
import { PayoutDispatchService } from '../src/modules/payouts/payout-dispatch.service';
import { FakePayoutProvider } from '../src/modules/payouts/payout-provider';
import { RecordingNotifier } from './fakes/in-memory';

const NOW = new Date('2026-12-05T08:00:00Z');
type P = {
  id: string; runId: string; teacherId: string; amountFils: number; adjustmentsFils: number; status: string;
  provider: string | null; providerTransferId: string | null; providerStatus: string | null; providerFailureReason: string | null; providerAttempts: number;
  paidAt: Date | null; transferReference: string | null;
  teacher: { id: string; name: string; email: string; bankDetails: { accountHolder: string; iban: string; stripeAccountId: string | null } | null };
};

function harness(provider = new FakePayoutProvider()) {
  const run = { id: 'run1', status: 'APPROVED', paidAt: null as Date | null };
  const bank = (iban: string | null) => (iban ? { accountHolder: 'Teacher', iban, stripeAccountId: 'acct_123456' } : null);
  const payout = (id: string, teacherId: string, amountFils: number, status = 'READY', iban: string | null = 'AE070331234567890123456'): P => ({
    id, runId: 'run1', teacherId, amountFils, adjustmentsFils: 0, status, provider: null, providerTransferId: null, providerStatus: null,
    providerFailureReason: null, providerAttempts: 0, paidAt: null, transferReference: null,
    teacher: { id: teacherId, name: teacherId, email: `${teacherId}@x.test`, bankDetails: bank(iban) },
  });
  const payouts = [payout('po1', 't1', 50_000), payout('po2', 't2', 30_000), payout('po3', 't3', 10_000, 'HELD')];
  const earnings = [{ id: 'e1', payoutId: 'po1', status: 'AVAILABLE' }, { id: 'e3', payoutId: 'po3', status: 'AVAILABLE' }];
  const audit: Array<{ action: string; data?: unknown }> = [];
  const repo = {
    findRun: async (id: string) => (id === run.id ? { ...run, payouts } : null),
    claimForProvider: async (id: string, d: { provider: string; attempt: number }) => {
      const p = payouts.find((x) => x.id === id)!;
      if (p.status !== 'READY') return false;
      Object.assign(p, { status: 'PROCESSING', provider: d.provider, providerAttempts: d.attempt, providerStatus: 'PENDING', providerFailureReason: null, providerTransferId: null });
      return true;
    },
    updateProviderState: async (id: string, d: Partial<P>) => Object.assign(payouts.find((x) => x.id === id)!, d),
    payoutByProviderTransferId: async (tid: string) => payouts.find((x) => x.providerTransferId === tid) ?? null,
    processingPayouts: async (name: string) => payouts.filter((x) => x.status === 'PROCESSING' && x.provider === name),
    settleProviderPayout: async (id: string, at: Date, ref: string) => {
      const p = payouts.find((x) => x.id === id)!;
      if (p.status !== 'PROCESSING') return false;
      Object.assign(p, { status: 'PAID', paidAt: at, transferReference: ref, providerStatus: 'PAID' });
      for (const e of earnings.filter((x) => x.payoutId === id)) e.status = 'PAID';
      return true;
    },
    finalizeRunIfDone: async (runId: string, at: Date) => {
      if (payouts.some((p) => p.runId === runId && (p.status === 'READY' || p.status === 'PROCESSING'))) return false;
      for (const e of earnings.filter((x) => payouts.find((p) => p.id === x.payoutId)?.status === 'HELD')) e.payoutId = null as never;
      Object.assign(run, { status: 'PAID', paidAt: at });
      return true;
    },
    bankDetails: async (id: string) => payouts.find((p) => p.teacherId === id)?.teacher.bankDetails ?? null,
    setStripeAccount: async (id: string, acct: string | null) => Object.assign(payouts.find((p) => p.teacherId === id)!.teacher.bankDetails!, { stripeAccountId: acct }),
  };
  const notifier = new RecordingNotifier();
  const auditLog = { record: async (e: { action: string; data?: unknown }) => { audit.push(e); }, forEntity: async () => [] };
  const svc = new PayoutDispatchService(repo as never, provider, notifier, { now: () => NOW }, auditLog as never, () => {});
  return { svc, provider, run, payouts, earnings, audit, notifier };
}

describe('PayoutDispatchService', () => {
  test('sends one transfer per READY payout with per-attempt idempotency keys; nothing is PAID yet', async () => {
    const { svc, provider, payouts, audit } = harness();
    const r = await svc.sendRun('run1', 'admin1');
    expect(r.sent).toBe(2);
    expect(provider.sent.map((s) => [s.payoutId, s.amountFils, s.idempotencyKey])).toEqual([
      ['po1', 50_000, 'azza-payout-po1-1'],
      ['po2', 30_000, 'azza-payout-po2-1'],
    ]);
    expect(payouts.map((p) => p.status)).toEqual(['PROCESSING', 'PROCESSING', 'HELD']);
    expect(payouts[0]!.providerTransferId).toBe('fake_1');
    expect(audit.filter((a) => a.action === 'PAYOUT_PROVIDER_SENT')).toHaveLength(2);
    // sending again finds nothing READY
    expect((await svc.sendRun('run1', 'admin1')).sent).toBe(0);
  });

  test('PAID only when the provider confirms; the run closes when nothing is left in flight', async () => {
    const { svc, provider, payouts, earnings, run, notifier } = harness();
    await svc.sendRun('run1', 'admin1');
    provider.settle('fake_1', 'PAID');
    await svc.handleWebhook(JSON.stringify({ id: 'fake_1' }), (n) => (n === 'x-fake-signature' ? 'valid' : undefined));
    expect(payouts[0]).toMatchObject({ status: 'PAID', transferReference: 'fake_1' });
    expect(earnings[0]!.status).toBe('PAID');
    expect(notifier.types()).toContain('PAYOUT_PAID');
    expect(run.status).toBe('APPROVED'); // po2 still in flight
    provider.settle('fake_2', 'PAID');
    expect(await svc.poll()).toEqual({ checked: 1, settled: 1 });
    expect(run.status).toBe('PAID');
    expect(earnings[1]!.payoutId).toBeNull(); // the held payout's money rolls into the next run
    // a repeated webhook changes nothing
    expect((await svc.handleWebhook(JSON.stringify({ id: 'fake_1' }), () => 'valid')).handled).toBe(false);
  });

  test('a failure returns the payout to READY with the reason; a retry is a new attempt', async () => {
    const { svc, provider, payouts, audit, notifier } = harness();
    await svc.sendRun('run1', 'admin1');
    provider.settle('fake_2', 'FAILED', 'Account closed');
    await svc.poll();
    expect(payouts[1]).toMatchObject({ status: 'READY', providerStatus: 'FAILED', providerFailureReason: 'Account closed' });
    expect(audit.some((a) => a.action === 'PAYOUT_PROVIDER_FAILED')).toBe(true);
    expect(notifier.types()).toContain('PAYOUT_FAILED');
    await svc.sendRun('run1', 'admin1');
    expect(provider.sent.at(-1)!.idempotencyKey).toBe('azza-payout-po2-2');
    expect(payouts[1]!.status).toBe('PROCESSING');
  });

  test('a send error is recorded and the payout stays READY', async () => {
    const { svc, provider, payouts } = harness();
    provider.failNextSend = 'Insufficient platform balance';
    const r = await svc.sendRun('run1', 'admin1');
    expect(r.results[0]).toEqual({ payoutId: 'po1', outcome: 'FAILED', reason: 'Insufficient platform balance' });
    expect(payouts[0]).toMatchObject({ status: 'READY', providerFailureReason: 'Insufficient platform balance' });
    expect(payouts[1]!.status).toBe('PROCESSING');
  });

  test('a teacher the provider cannot pay is skipped with the reason', async () => {
    const h = harness();
    h.payouts[0]!.teacher.bankDetails = null;
    const r = await h.svc.sendRun('run1', 'admin1');
    expect(r.results[0]).toMatchObject({ payoutId: 'po1', outcome: 'SKIPPED' });
    expect(h.payouts[0]!.status).toBe('READY');
  });

  test('only approved runs, and only with a provider', async () => {
    const h = harness();
    h.run.status = 'DRAFT';
    await expect(h.svc.sendRun('run1', 'a')).rejects.toMatchObject({ code: 'RUN_NOT_APPROVED' });
    const off = new PayoutDispatchService({} as never, null, new RecordingNotifier(), { now: () => NOW });
    await expect(off.sendRun('run1', 'a')).rejects.toMatchObject({ code: 'PAYOUT_PROVIDER_DISABLED' });
    expect(off.info()).toEqual({ enabled: false, name: null, label: null });
  });

  test('a bad webhook signature is refused', async () => {
    const { svc } = harness();
    await expect(svc.handleWebhook('{}', () => 'nope')).rejects.toThrow();
  });

  test('the Stripe account id is validated and audited', async () => {
    const { svc, audit } = harness();
    await expect(svc.setStripeAccount('t1', 'bogus', 'admin1')).rejects.toMatchObject({ code: 'INVALID_STRIPE_ACCOUNT' });
    await svc.setStripeAccount('t1', 'acct_1AbCdEf', 'admin1');
    expect(audit.at(-1)!.action).toBe('PAYOUT_ACCOUNT_SET');
  });
});

describe('StripeConnectPayoutProvider (no network)', () => {
  const sign = (body: string, secret: string, t: number) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

  test('signature check follows Stripe: right secret, within tolerance', () => {
    const t = Math.floor(NOW.getTime() / 1000);
    expect(verifyStripeSignature('{"a":1}', sign('{"a":1}', 'whsec_x', t), 'whsec_x', NOW)).toBe(true);
    expect(verifyStripeSignature('{"a":2}', sign('{"a":1}', 'whsec_x', t), 'whsec_x', NOW)).toBe(false);
    expect(verifyStripeSignature('{"a":1}', sign('{"a":1}', 'whsec_x', t - 1000), 'whsec_x', NOW)).toBe(false);
    expect(verifyStripeSignature('{"a":1}', undefined, 'whsec_x', NOW)).toBe(false);
  });

  test('send: transfer to the connected account, then an AED payout on it, both idempotent', async () => {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: string }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method!, headers: init.headers as Record<string, string>, body: init.body as string | undefined });
      const json = url.includes('/v1/transfers?') ? { data: [] } : url.endsWith('/v1/payouts') ? { id: 'po_9', status: 'pending' } : { id: 'tr_1' };
      return new Response(JSON.stringify(json), { status: 200 });
    }) as unknown as typeof fetch;
    const p = new StripeConnectPayoutProvider({ secretKey: 'sk_test_x', webhookSecret: 'whsec_x', fetch: fakeFetch, now: () => NOW });
    const t = await p.send({ idempotencyKey: 'azza-payout-po1-1', payoutId: 'po1', amountFils: 50_000, description: 'Azza payout', recipient: { teacherId: 't1', name: 'T', iban: 'AE07', stripeAccountId: 'acct_123456' } });
    expect(t).toEqual({ id: 'acct_123456/po_9', status: 'PENDING', failureReason: null });
    expect(calls.map((c) => `${c.method} ${c.url.replace('https://api.stripe.com', '')}`)).toEqual([
      'GET /v1/transfers?transfer_group=payout_po1&limit=1',
      'POST /v1/transfers',
      'POST /v1/payouts',
    ]);
    expect(calls[1]!.body).toContain('destination=acct_123456');
    expect(calls[1]!.body).toContain('currency=aed');
    expect(calls[1]!.headers['Idempotency-Key']).toBe('azza-payout-po1-1-transfer');
    expect(calls[2]!.headers['Stripe-Account']).toBe('acct_123456');
    expect(calls[2]!.headers['Idempotency-Key']).toBe('azza-payout-po1-1-payout');
  });

  test('webhook: payout.failed on a connected account maps to FAILED with the reason', async () => {
    const p = new StripeConnectPayoutProvider({ secretKey: 'sk', webhookSecret: 'whsec_x', fetch: (() => { throw new Error('no network'); }) as never, now: () => NOW });
    const body = JSON.stringify({ type: 'payout.failed', account: 'acct_123456', data: { object: { id: 'po_9', status: 'failed', failure_message: 'The bank account has been closed' } } });
    const header = sign(body, 'whsec_x', Math.floor(NOW.getTime() / 1000));
    expect(await p.parseWebhook(body, (n) => (n === 'stripe-signature' ? header : undefined))).toEqual({ id: 'acct_123456/po_9', status: 'FAILED', failureReason: 'The bank account has been closed' });
    expect(await p.parseWebhook(JSON.stringify({ type: 'charge.succeeded' }), () => sign(JSON.stringify({ type: 'charge.succeeded' }), 'whsec_x', Math.floor(NOW.getTime() / 1000)))).toBeNull();
    await expect(p.parseWebhook(body, () => 't=1,v1=bad')).rejects.toMatchObject({ code: 'STRIPE_SIGNATURE' });
  });
});
