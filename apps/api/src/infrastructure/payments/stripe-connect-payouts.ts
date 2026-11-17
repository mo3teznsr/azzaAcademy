import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../core/errors';
import type { PayoutProvider, PayoutRecipient, ProviderTransfer, ProviderTransferStatus, SendPayoutArgs } from '../../modules/payouts/payout-provider';

/**
 * Teacher payouts through Stripe Connect (UAE platform, UAE connected accounts, AED to UAE bank accounts).
 *
 * Each payout is two calls, both with idempotency keys:
 *  1. `POST /v1/transfers` moves the amount from the platform balance to the teacher's connected account
 *     (`transfer_group = payout_<payoutId>`; an existing transfer for the group is reused, so a retry after a failed bank
 *     payout never funds the account twice — Stripe returns a failed payout's money to the connected balance).
 *  2. `POST /v1/payouts` on the connected account (`Stripe-Account` header) sends it to the teacher's bank.
 *     Connected accounts need a manual payout schedule so Stripe does not pay out on its own.
 * The attempt id is `<acct>/<po_...>`. `payout.paid` / `payout.failed` / `payout.canceled` / `payout.updated` arrive on a
 * Connect webhook endpoint ("Listen to events on Connected accounts"), signed like every Stripe webhook
 * (`Stripe-Signature: t=…,v1=…`, HMAC-SHA256 of `<t>.<body>` with the endpoint secret).
 *
 * Docs: https://docs.stripe.com/connect/separate-charges-and-transfers , https://docs.stripe.com/api/transfers/create ,
 * https://docs.stripe.com/api/payouts/create , https://docs.stripe.com/connect/manual-payouts ,
 * https://docs.stripe.com/webhooks#verify-manually , https://support.stripe.com/questions/connect-availability-in-the-uae
 */
export interface StripeConnectPayoutConfig {
  secretKey: string;
  webhookSecret: string | undefined;
  baseUrl?: string;
  /** Seconds a signed webhook stays valid (Stripe's default tolerance is 300). */
  toleranceSec?: number;
  fetch?: typeof fetch;
  now?: () => Date;
}

const STATUS: Record<string, ProviderTransferStatus> = { pending: 'PENDING', in_transit: 'IN_TRANSIT', paid: 'PAID', failed: 'FAILED', canceled: 'FAILED' };
const PAYOUT_EVENTS = new Set(['payout.paid', 'payout.failed', 'payout.canceled', 'payout.updated']);

interface RawPayout {
  id: string;
  status: string;
  failure_message?: string | null;
  failure_code?: string | null;
}

export function toTransfer(account: string, p: RawPayout): ProviderTransfer {
  const status = STATUS[p.status] ?? 'PENDING';
  return {
    id: `${account}/${p.id}`,
    status,
    failureReason: status === 'FAILED' ? (p.failure_message ?? p.failure_code ?? (p.status === 'canceled' ? 'Payout canceled' : 'Payout failed')) : null,
  };
}

/** Stripe's documented signature check: one of the `v1` values must equal HMAC-SHA256(secret, `${t}.${body}`), within the tolerance. */
export function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string, now: Date, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!Number.isFinite(t) || !sigs.length) return false;
  if (Math.abs(now.getTime() / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex'));
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export class StripeConnectPayoutProvider implements PayoutProvider {
  readonly name = 'stripe_connect';
  readonly label = 'Stripe';
  private readonly base: string;
  private readonly doFetch: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly config: StripeConnectPayoutConfig) {
    this.base = config.baseUrl ?? 'https://api.stripe.com';
    this.doFetch = config.fetch ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  recipientProblem(r: PayoutRecipient) {
    return r.stripeAccountId ? null : 'No Stripe connected account for this teacher';
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body: Record<string, string> | null, headers: Record<string, string> = {}): Promise<T> {
    const res = await this.doFetch(`${this.base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.config.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) throw new AppError(`Stripe: ${json.error?.message ?? res.status}`, 502, 'PAYOUT_PROVIDER');
    return json;
  }

  async send(args: SendPayoutArgs): Promise<ProviderTransfer> {
    const account = args.recipient.stripeAccountId;
    if (!account) throw new AppError('No Stripe connected account for this teacher', 400, 'PAYOUT_RECIPIENT');
    const group = `payout_${args.payoutId}`;
    const found = await this.call<{ data: Array<{ id: string }> }>('GET', `/v1/transfers?transfer_group=${encodeURIComponent(group)}&limit=1`, null);
    if (!found.data.length) {
      await this.call(
        'POST',
        '/v1/transfers',
        { amount: String(args.amountFils), currency: 'aed', destination: account, transfer_group: group, description: args.description, 'metadata[payoutId]': args.payoutId },
        { 'Idempotency-Key': `${args.idempotencyKey}-transfer` },
      );
    }
    const payout = await this.call<RawPayout>(
      'POST',
      '/v1/payouts',
      { amount: String(args.amountFils), currency: 'aed', description: args.description, 'metadata[payoutId]': args.payoutId, 'metadata[attempt]': args.idempotencyKey },
      { 'Idempotency-Key': `${args.idempotencyKey}-payout`, 'Stripe-Account': account },
    );
    return toTransfer(account, payout);
  }

  async fetch(id: string): Promise<ProviderTransfer> {
    const [account, payoutId] = id.split('/');
    if (!account || !payoutId) throw new AppError(`Unknown Stripe payout id ${id}`, 400, 'PAYOUT_PROVIDER');
    return toTransfer(account, await this.call<RawPayout>('GET', `/v1/payouts/${encodeURIComponent(payoutId)}`, null, { 'Stripe-Account': account }));
  }

  async parseWebhook(rawBody: string, header: (name: string) => string | undefined): Promise<ProviderTransfer | null> {
    const secret = this.config.webhookSecret;
    if (!secret || !verifyStripeSignature(rawBody, header('stripe-signature'), secret, this.now(), this.config.toleranceSec)) {
      throw new AppError('Invalid Stripe signature', 400, 'STRIPE_SIGNATURE');
    }
    const event = JSON.parse(rawBody) as { type?: string; account?: string; data?: { object?: RawPayout } };
    if (!event.type || !PAYOUT_EVENTS.has(event.type) || !event.account || !event.data?.object?.id) return null;
    return toTransfer(event.account, event.data.object);
  }
}
