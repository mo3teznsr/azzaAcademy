/**
 * Port for sending teacher payouts through a provider instead of the bank CSV (Stripe Connect today; see
 * `StripeConnectPayoutProvider`). The provider is the only thing that may say a payout is PAID.
 */

/** The provider's view of one transfer attempt. */
export type ProviderTransferStatus = 'PENDING' | 'IN_TRANSIT' | 'PAID' | 'FAILED';

export interface ProviderTransfer {
  /** Stable id of the attempt at the provider (stored on `Payout.providerTransferId`). */
  id: string;
  status: ProviderTransferStatus;
  failureReason: string | null;
}

export interface PayoutRecipient {
  teacherId: string;
  name: string;
  iban: string | null;
  /** Stripe Connect connected account (acct_...). */
  stripeAccountId: string | null;
}

export interface SendPayoutArgs {
  /** Unique per payout and attempt: a retried request never pays twice. */
  idempotencyKey: string;
  payoutId: string;
  /** Integer fils of AED. */
  amountFils: number;
  recipient: PayoutRecipient;
  /** Shown to the teacher where the provider allows it. */
  description: string;
}

export interface PayoutProvider {
  /** Stored on `Payout.provider`, e.g. "stripe_connect". */
  readonly name: string;
  /** Shown on the admin button ("Send through Stripe"). */
  readonly label: string;
  /** Why this teacher cannot be paid through the provider (shown to admins), or null. */
  recipientProblem(recipient: PayoutRecipient): string | null;
  send(args: SendPayoutArgs): Promise<ProviderTransfer>;
  /** Re-reads an attempt (polling, and to confirm what a webhook said). */
  fetch(id: string): Promise<ProviderTransfer>;
  /** Verifies a webhook and returns the attempt it is about; null for events that are not about payouts. Throws when the signature is wrong. */
  parseWebhook(rawBody: string, header: (name: string) => string | undefined): Promise<ProviderTransfer | null>;
}

/** In-memory provider for tests and local development: nothing leaves the process. */
export class FakePayoutProvider implements PayoutProvider {
  readonly name = 'fake';
  readonly label = 'Fake provider';
  readonly sent: SendPayoutArgs[] = [];
  private readonly byKey = new Map<string, ProviderTransfer>();
  private readonly byId = new Map<string, ProviderTransfer>();
  /** Makes the next `send` throw (a network or API error). */
  failNextSend: string | null = null;

  recipientProblem(r: PayoutRecipient) {
    return r.iban ? null : 'No IBAN on file';
  }

  async send(args: SendPayoutArgs) {
    if (this.failNextSend) {
      const msg = this.failNextSend;
      this.failNextSend = null;
      throw new Error(msg);
    }
    const existing = this.byKey.get(args.idempotencyKey);
    if (existing) return { ...existing };
    this.sent.push(args);
    const t: ProviderTransfer = { id: `fake_${this.byId.size + 1}`, status: 'PENDING', failureReason: null };
    this.byKey.set(args.idempotencyKey, t);
    this.byId.set(t.id, t);
    return { ...t };
  }

  async fetch(id: string) {
    const t = this.byId.get(id);
    if (!t) throw new Error(`Unknown transfer ${id}`);
    return { ...t };
  }

  /** Test helper: what the provider would report later. */
  settle(id: string, status: ProviderTransferStatus, failureReason: string | null = null) {
    const t = this.byId.get(id);
    if (t) Object.assign(t, { status, failureReason });
  }

  async parseWebhook(rawBody: string, header: (name: string) => string | undefined) {
    if (header('x-fake-signature') !== 'valid') throw new Error('Bad signature');
    const body = JSON.parse(rawBody) as { id?: string };
    return body.id ? this.fetch(body.id) : null;
  }
}
