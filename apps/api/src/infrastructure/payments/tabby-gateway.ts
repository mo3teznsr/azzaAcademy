import { filsToTabbyAmount, tabbyAmountToFils } from '@azza/shared';
import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../../core/errors';
import type {
  TabbyCreateSessionArgs,
  TabbyEligibilityArgs,
  TabbyEligibilityResult,
  TabbyGateway,
  TabbyPayment,
  TabbyPaymentStatus,
  TabbySessionResult,
} from '../../core/ports';

/** UAE merchants are pinned to the UAE base URL (docs.tabby.ai › API reference › Base URLs). */
export const TABBY_UAE_BASE_URL = 'https://api.tabby.ai';
const CURRENCY = 'AED';
const STATUSES: TabbyPaymentStatus[] = ['CREATED', 'AUTHORIZED', 'CLOSED', 'REJECTED', 'EXPIRED'];
/**
 * Seats are online classes: nothing ships, but Tabby requires `shipping_address` on the full session payload.
 * We send the academy's city and say plainly that delivery is online.
 */
const ONLINE_DELIVERY = { city: 'Dubai', address: 'Online course (no shipping)', zip: '00000' } as const;

export interface TabbyConfig {
  secretKey: string;
  merchantCode: string;
  /** Header Tabby sends on webhooks (registered as `header.title`) and its expected value (`header.value`). */
  webhookHeader: string;
  webhookSecret: string | undefined;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

interface RawPayment {
  id?: string;
  status?: string;
  amount?: string;
  currency?: string;
  order?: { reference_id?: string | null } | null;
  captures?: Array<{ amount?: string }> | null;
  refunds?: Array<{ amount?: string }> | null;
}
interface RawSession {
  status?: string;
  payment?: RawPayment | null;
  configuration?: {
    available_products?: { installments?: Array<{ web_url?: string }> } | null;
    products?: { installments?: { rejection_reason?: string | null } | null } | null;
  } | null;
}

const sum = (rows: Array<{ amount?: string }> | null | undefined) => (rows ?? []).reduce((t, r) => t + (tabbyAmountToFils(r.amount) || 0), 0);

export function toTabbyPayment(raw: RawPayment): TabbyPayment {
  const status = String(raw.status ?? '').toUpperCase() as TabbyPaymentStatus;
  if (!raw.id || !STATUSES.includes(status)) throw new AppError('Unexpected Tabby payment', 502, 'TABBY_BAD_RESPONSE');
  return {
    id: raw.id,
    status,
    amountFils: tabbyAmountToFils(raw.amount),
    currency: raw.currency ?? '',
    referenceId: raw.order?.reference_id ?? null,
    capturedFils: sum(raw.captures),
    refundedFils: sum(raw.refunds),
  };
}

export function toTabbySession(raw: RawSession): TabbySessionResult {
  const status = raw.status === 'created' || raw.status === 'rejected' || raw.status === 'expired' ? raw.status : 'rejected';
  const webUrl = raw.configuration?.available_products?.installments?.[0]?.web_url ?? null;
  return {
    status,
    paymentId: raw.payment?.id ?? null,
    webUrl,
    rejectionReason: raw.configuration?.products?.installments?.rejection_reason ?? (status === 'created' ? null : 'not_available'),
  };
}

/** Constant-time comparison of the webhook auth header (no early exit on the first differing byte). */
export function headerMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Webhook body → payment id + (lowercase) status. The status is advisory: callers re-read the payment from the API. */
export function parseTabbyWebhook(rawBody: string, header: (name: string) => string | undefined, webhookHeader: string, secret: string | undefined) {
  if (!headerMatches(header(webhookHeader), secret)) throw new AppError('Invalid Tabby webhook signature', 401, 'TABBY_SIGNATURE');
  let body: { id?: unknown; status?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    throw new AppError('Invalid Tabby webhook body', 400, 'TABBY_PAYLOAD');
  }
  if (typeof body?.id !== 'string' || !body.id) throw new AppError('Tabby webhook without a payment id', 400, 'TABBY_PAYLOAD');
  return { paymentId: body.id, status: typeof body.status === 'string' ? body.status : '' };
}

/** Tabby's REST API over fetch (no SDK). Never used in tests or dev without keys: see FakeTabbyGateway. */
export class HttpTabbyGateway implements TabbyGateway {
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(private readonly config: TabbyConfig) {
    this.baseUrl = (config.baseUrl ?? TABBY_UAE_BASE_URL).replace(/\/$/, '');
    this.doFetch = config.fetch ?? fetch;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.doFetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.config.secretKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000),
      });
    } catch (e) {
      throw new AppError('Tabby is unreachable, please try again', 502, 'TABBY_UNAVAILABLE', { cause: String(e) });
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      if (res.ok) throw new AppError('Unexpected Tabby response', 502, 'TABBY_BAD_RESPONSE');
    }
    if (!res.ok) {
      // Never echo the request (it carries the buyer's contact details); Tabby's error body is enough to debug.
      console.warn(`[tabby] ${method} ${path} → ${res.status} ${text.slice(0, 500)}`);
      throw new AppError('Tabby refused the request', res.status === 429 ? 429 : 502, 'TABBY_ERROR', { status: res.status });
    }
    return json as T;
  }

  async checkEligibility(args: TabbyEligibilityArgs): Promise<TabbyEligibilityResult> {
    const raw = await this.call<RawSession>('POST', '/api/v2/checkout', {
      payment: { amount: filsToTabbyAmount(args.amountFils), currency: CURRENCY, buyer: args.buyer },
      merchant_code: this.config.merchantCode,
    });
    const session = toTabbySession(raw);
    return { eligible: session.status === 'created', rejectionReason: session.status === 'created' ? null : session.rejectionReason };
  }

  async createSession(args: TabbyCreateSessionArgs): Promise<TabbySessionResult> {
    const amount = filsToTabbyAmount;
    const raw = await this.call<RawSession>('POST', '/api/v2/checkout', {
      payment: {
        amount: amount(args.amountFils),
        currency: CURRENCY,
        description: args.item.title,
        buyer: args.buyer,
        shipping_address: ONLINE_DELIVERY,
        order: {
          reference_id: args.reference,
          updated_at: new Date().toISOString(),
          tax_amount: amount(args.vatFils),
          shipping_amount: '0.00',
          discount_amount: amount(args.discountFils),
          items: [
            {
              reference_id: args.item.reference,
              title: args.item.title,
              quantity: 1,
              unit_price: amount(args.subtotalFils),
              discount_amount: '0.00',
              category: args.item.category,
              is_refundable: true,
            },
          ],
        },
        buyer_history: { registered_since: (args.registeredSince ?? new Date()).toISOString(), loyalty_level: 0 },
        meta: { order_id: args.reference },
      },
      lang: args.lang,
      merchant_code: this.config.merchantCode,
      merchant_urls: { success: args.successUrl, cancel: args.cancelUrl, failure: args.failureUrl },
    });
    return toTabbySession(raw);
  }

  async getPayment(paymentId: string): Promise<TabbyPayment> {
    return toTabbyPayment(await this.call<RawPayment>('GET', `/api/v2/payments/${encodeURIComponent(paymentId)}`));
  }

  async capture(paymentId: string, amountFils: number, referenceId: string): Promise<TabbyPayment> {
    return toTabbyPayment(
      await this.call<RawPayment>('POST', `/api/v2/payments/${encodeURIComponent(paymentId)}/captures`, {
        amount: filsToTabbyAmount(amountFils),
        reference_id: referenceId,
      }),
    );
  }

  async refund(paymentId: string, amountFils: number, referenceId: string, reason: string): Promise<void> {
    await this.call('POST', `/api/v2/payments/${encodeURIComponent(paymentId)}/refunds`, {
      amount: filsToTabbyAmount(amountFils),
      reference_id: referenceId,
      reason: reason.slice(0, 255),
    });
  }

  parseWebhook(rawBody: string, header: (name: string) => string | undefined) {
    return parseTabbyWebhook(rawBody, header, this.config.webhookHeader, this.config.webhookSecret);
  }
}

/**
 * In-memory Tabby for tests (and nothing else: without keys the method is simply not offered).
 * Payments are created by `createSession`; tests move them with `setStatus`. Capture/refund keyed by
 * `referenceId` are idempotent, as Tabby's are.
 */
export class FakeTabbyGateway implements TabbyGateway {
  readonly payments = new Map<string, TabbyPayment>();
  readonly sessions: TabbyCreateSessionArgs[] = [];
  readonly captures: Array<{ paymentId: string; amountFils: number; referenceId: string }> = [];
  readonly refunds: Array<{ paymentId: string; amountFils: number; referenceId: string; reason: string }> = [];
  /** Set to reject the next sessions / eligibility checks with this reason. */
  rejectWith: string | null = null;
  /** Set to make eligibility checks throw (Tabby down). */
  failEligibility = false;
  failCapture = false;
  constructor(
    readonly webhookHeader = 'X-Tabby-Webhook-Secret',
    readonly webhookSecret = 'whsec_test',
  ) {}
  private seq = 0;

  async checkEligibility(): Promise<TabbyEligibilityResult> {
    if (this.failEligibility) throw new AppError('Tabby is unreachable, please try again', 502, 'TABBY_UNAVAILABLE');
    return this.rejectWith ? { eligible: false, rejectionReason: this.rejectWith } : { eligible: true, rejectionReason: null };
  }

  async createSession(args: TabbyCreateSessionArgs): Promise<TabbySessionResult> {
    this.sessions.push(args);
    const id = `tabby_pay_${++this.seq}`;
    if (this.rejectWith) return { status: 'rejected', paymentId: id, webUrl: null, rejectionReason: this.rejectWith };
    this.payments.set(id, { id, status: 'CREATED', amountFils: args.amountFils, currency: 'AED', referenceId: args.reference, capturedFils: 0, refundedFils: 0 });
    return { status: 'created', paymentId: id, webUrl: `https://checkout.tabby.test/?sessionId=${id}`, rejectionReason: null };
  }

  setStatus(paymentId: string, status: TabbyPaymentStatus, patch: Partial<TabbyPayment> = {}) {
    const p = this.payments.get(paymentId);
    if (!p) throw new Error(`unknown Tabby payment ${paymentId}`);
    this.payments.set(paymentId, { ...p, status, ...patch });
  }

  async getPayment(paymentId: string): Promise<TabbyPayment> {
    const p = this.payments.get(paymentId);
    if (!p) throw new AppError('No such payment', 502, 'TABBY_ERROR', { status: 404 });
    return { ...p };
  }

  async capture(paymentId: string, amountFils: number, referenceId: string): Promise<TabbyPayment> {
    if (this.failCapture) throw new AppError('Tabby refused the request', 502, 'TABBY_ERROR', { status: 500 });
    const p = await this.getPayment(paymentId);
    if (this.captures.some((c) => c.referenceId === referenceId && c.paymentId === paymentId)) return p;
    if (p.status !== 'AUTHORIZED') throw new AppError('Tabby refused the request', 502, 'TABBY_ERROR', { status: 400 });
    this.captures.push({ paymentId, amountFils, referenceId });
    const capturedFils = p.capturedFils + amountFils;
    this.setStatus(paymentId, capturedFils >= p.amountFils ? 'CLOSED' : 'AUTHORIZED', { capturedFils });
    return this.getPayment(paymentId);
  }

  async refund(paymentId: string, amountFils: number, referenceId: string, reason: string): Promise<void> {
    const p = await this.getPayment(paymentId);
    if (this.refunds.some((r) => r.referenceId === referenceId && r.paymentId === paymentId)) return;
    if (p.status !== 'CLOSED' || p.refundedFils + amountFils > p.capturedFils) throw new AppError('Tabby refused the request', 502, 'TABBY_ERROR', { status: 400 });
    this.refunds.push({ paymentId, amountFils, referenceId, reason });
    this.setStatus(paymentId, 'CLOSED', { refundedFils: p.refundedFils + amountFils });
  }

  parseWebhook(rawBody: string, header: (name: string) => string | undefined) {
    return parseTabbyWebhook(rawBody, header, this.webhookHeader, this.webhookSecret);
  }
}
