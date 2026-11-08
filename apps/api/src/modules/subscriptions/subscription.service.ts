import { randomUUID } from 'node:crypto';
import { filsToAed, formatMoney, YEARLY_REMINDER_DAYS, type Role, type SubscribeInput, type SubscriptionProvider, type SubscriptionPlan, type SubscriptionStatus } from '@azza/shared';
import { AppError, BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import { addHours, formatInZone } from '../../core/time';
import type { AppleNotification, AppleSignedDataVerifier, AppleTransaction, Clock, PaymentGateway, PaymentWebhookEvent, WebhookInvoice, WebhookSubscription } from '../../core/ports';
import { appEmails } from '../notifications/email-templates';
import type { Notice, Notifier } from '../notifications/notification.types';
import { resolveBankAccount } from '../payments/checkout/bank-transfer-checkout';
import type { BankAccountRecord, PaymentsRepository } from '../payments/payments.repository';
import type { PriceCalculator } from '../payments/price-calculator';
import type { ReferenceGenerator } from '../payments/reference-generator';
import { canAccessRecorded, hasPendingRenewalReceipt } from './access-policy';
import { pickSubscription } from './recorded-subscription';
import type { NewSubscriptionPayment, ReminderCandidate, SubscribableCourse, SubscriptionAdminRepository, SubscriptionRepository, SubscriptionRow, SubscriptionTransferRepository, TransferPaymentRow } from './subscription.repository';

/** The payout side of a paid charge (Task 7). A narrow port so a payout problem is contained here. */
export interface SubscriptionEarningsAccrual {
  accrueForSubscriptionPayment(paymentId: string): Promise<unknown>;
  /** Takes back what a refunded or revoked charge earned the teacher. */
  reverseSubscriptionPayment?(paymentId: string, refundedFils: number): Promise<unknown>;
}


/** What plans paid by bank transfer need: their storage, the bank accounts, and how long a transfer is held. */
export interface TransferOptions {
  repo: SubscriptionTransferRepository;
  bankAccounts: Pick<PaymentsRepository, 'findBankAccount' | 'firstActiveBankAccount'>;
  holdHours: number;
}

export interface TransferReviewInput {
  approve: boolean;
  /** Required to reject or to ask for a new receipt. */
  note?: string;
  /** Ask the learner for another receipt instead of rejecting. */
  newReceipt?: boolean;
  /** What the admin saw arrive; when given it must equal the total. */
  receivedFils?: number;
}

/** Calendar months/years in UTC, clamping to the end of a short month (31 Jan + 1 month = 28 Feb). */
export function addPeriod(from: Date, plan: SubscriptionPlan): Date {
  const months = plan === 'YEARLY' ? 12 : 1;
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

function parseSwitchSession(stored: string | null): { id: string; expiresAt: Date } | null {
  const m = stored ? /^(.+)@(\d+)$/.exec(stored) : null;
  return m ? { id: m[1]!, expiresAt: new Date(Number(m[2])) } : null;
}

/**
 * A card checkout row stores its Session as `<sessionId>#<priceId>`: a Session is reused only while it still charges the
 * course's current Price. A value without `#` (written before this marker) has no known Price and is never reused.
 */
const checkoutMarker = (sessionId: string, priceId: string) => `${sessionId}#${priceId}`;
function parseCheckoutMarker(stored: string | null): { id: string; priceId: string | null } | null {
  if (!stored) return null;
  const i = stored.indexOf('#');
  return i < 0 ? { id: stored, priceId: null } : { id: stored.slice(0, i), priceId: stored.slice(i + 1) };
}
/** The Checkout Session id stored on a card row (without the Price marker). */
const storedSessionId = (stored: string | null) => parseCheckoutMarker(stored)?.id ?? null;

const PLAN_LABEL = { MONTHLY: ['Monthly', 'شهري'], YEARLY: ['Yearly', 'سنوي'] } as const;
/** Stripe asks for a Checkout trial to end at least this far ahead. */
const MIN_TRIAL_MS = 48 * 3_600_000;

/** A subscription Checkout Session lives this long (Stripe's minimum is 30 minutes, plus a margin). */
const CHECKOUT_LIFETIME_MS = 31 * 60_000;
/** Statuses a row can be moved to by Stripe events. EXPIRED is final: a new purchase gets a new row. */
const FINAL: SubscriptionStatus = 'EXPIRED';

/** An INCOMPLETE Apple row whose checkout was started or refreshed this recently may still have a StoreKit purchase in flight. */
const APPLE_PENDING_MS = 24 * 3_600_000;

const MANAGED_BY_APPLE = () => new BusinessRuleError('This plan is managed in your Apple subscriptions', 'MANAGED_BY_APPLE');
const alreadySubscribed = () => new AppError('You already have a plan for this course', 409, 'ALREADY_SUBSCRIBED');
/** A notification about a period that ended before the one the row is already paid into (delivered out of order). */
const isOlderPeriod = (row: Pick<SubscriptionRow, 'currentPeriodEnd'>, tx: Pick<AppleTransaction, 'expiresDate'>) =>
  !!tx.expiresDate && !!row.currentPeriodEnd && tx.expiresDate.getTime() < row.currentPeriodEnd.getTime();
const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

/** Stripe status plus our `cancelAtPeriodEnd` flag → our status. Trials arrive as `active`. */
export function mapStripeStatus(sub: Pick<WebhookSubscription, 'status' | 'cancelAtPeriodEnd'>): SubscriptionStatus {
  switch (sub.status) {
    case 'active':
      return sub.cancelAtPeriodEnd ? 'CANCELLING' : 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
      return 'EXPIRED';
    default:
      return 'INCOMPLETE';
  }
}

export interface TransferSubscribeResult {
  plan: SubscriptionPlan;
  bankAccount: BankAccountRecord;
  reference: string;
  amountFils: number;
  expiresAt: Date;
  paymentId: string;
}

export class SubscriptionService {
  constructor(
    private readonly repo: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly notifier: Notifier,
    private readonly payouts: SubscriptionEarningsAccrual,
    private readonly clock: Clock,
    private readonly references: ReferenceGenerator,
    private readonly prices: PriceCalculator,
    private readonly webUrl: string,
    private readonly log: (message: string, error: unknown) => void = (m, e) => console.error(m, e),
    private readonly apple: AppleSignedDataVerifier | null = null,
    private readonly newToken: () => string = randomUUID,
    private readonly transfers: TransferOptions | null = null,
    /** Admin lists, subscriber counts and the reminder job's bookkeeping. */
    private readonly admin: SubscriptionAdminRepository | null = null,
  ) {}

  // ───────── learner actions ─────────

  /** `POST /courses/:id/subscribe`: card → an INCOMPLETE row and the hosted Checkout page; iOS → a row and its StoreKit token. */
  subscribe(userId: string, courseIdOrSlug: string, input: { plan: SubscriptionPlan; method: 'STRIPE' }): Promise<{ checkoutUrl: string; reference: string }>;
  subscribe(userId: string, courseIdOrSlug: string, input: { plan: SubscriptionPlan; method: 'APPLE_IAP' }): Promise<{ productId: string; appAccountToken: string; reference: string }>;
  subscribe(userId: string, courseIdOrSlug: string, input: { plan: SubscriptionPlan; method: 'BANK_TRANSFER'; bankAccountId?: string }): Promise<TransferSubscribeResult>;
  subscribe(userId: string, courseIdOrSlug: string, input: Pick<SubscribeInput, 'plan' | 'method'> & { bankAccountId?: string }): Promise<{ checkoutUrl: string; reference: string } | { productId: string; appAccountToken: string; reference: string } | TransferSubscribeResult>;
  async subscribe(userId: string, courseIdOrSlug: string, input: Pick<SubscribeInput, 'plan' | 'method'> & { bankAccountId?: string }) {
    if (input.method === 'APPLE_IAP') return this.subscribeApple(userId, courseIdOrSlug, input.plan);
    if (input.method === 'BANK_TRANSFER') return this.subscribeTransfer(userId, courseIdOrSlug, input.plan, input.bankAccountId);
    if (input.method !== 'STRIPE') throw new BusinessRuleError('This payment method is not available for plans yet', 'METHOD_UNAVAILABLE');
    const course = await this.repo.findCourse(courseIdOrSlug);
    // Drafts and other unpublished courses look like they don't exist, whatever their type.
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course', courseIdOrSlug);
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Only recorded courses have plans', 'NOT_RECORDED');
    const priceId = input.plan === 'YEARLY' ? course.stripeYearlyPriceId : course.stripeMonthlyPriceId;
    const priceFils = input.plan === 'YEARLY' ? course.yearlyPriceFils : course.monthlyPriceFils;
    if (!priceId || priceFils == null) throw new BusinessRuleError('This course is not open for plans yet', 'PRICE_NOT_READY');
    const user = await this.repo.findUser(userId);
    if (!user) throw new NotFoundError('User', userId);

    const existing = pickSubscription(await this.repo.forUserCourse(userId, course.id));
    if (existing) {
      // Only a checkout that was started and never finished can be taken over; any other live plan is a real one.
      if (existing.status !== 'INCOMPLETE' || existing.providerSubscriptionId) throw alreadySubscribed();
      // A transfer that is still being paid or reviewed must not be orphaned; only one whose payments are all closed is replaced.
      if (existing.provider === 'BANK_TRANSFER' && (await this.hasOpenTransferPayment(existing.id))) throw alreadySubscribed();
      // A StoreKit purchase may be finishing for a recent Apple row; taking it over could charge the learner twice.
      if (existing.provider === 'APPLE' && this.clock.now().getTime() < existing.updatedAt.getTime() + APPLE_PENDING_MS) throw alreadySubscribed();
      const lapsed = this.clock.now().getTime() >= existing.createdAt.getTime() + CHECKOUT_LIFETIME_MS;
      // A changed price (amount or Stripe Price) means the open Session charges the wrong thing, so it is replaced like another plan's.
      const samePrice = existing.priceFils === priceFils;
      const stored = existing.provider === 'STRIPE' ? parseCheckoutMarker(existing.stripeCheckoutSessionId) : null;
      if (existing.plan === input.plan && samePrice && !lapsed && stored && stored.priceId === priceId) {
        // Same plan, same Price, session still open: the per-row idempotency key hands back the very same Checkout page.
        const session = await this.startCheckout(existing, user.email, course.id, priceId);
        if (session.id === stored.id) return { checkoutUrl: session.url, reference: existing.id };
        // Stripe handed back another Session (the idempotency key had lapsed): keep only one payable Session for the row.
        if ((await this.gateway.expireCheckoutSession(stored.id)) === 'completed') {
          await this.gateway.expireCheckoutSession(session.id).catch((e: unknown) => this.log(`expireCheckoutSession(${session.id}) failed`, e));
          throw alreadySubscribed();
        }
        await this.repo.update(existing.id, { stripeCheckoutSessionId: checkoutMarker(session.id, priceId) });
        return { checkoutUrl: session.url, reference: existing.id };
      }
      // Another plan or Price, or the old session is over: close it, unless the learner already paid on it.
      const sessionId = storedSessionId(existing.stripeCheckoutSessionId);
      const outcome = sessionId ? await this.gateway.expireCheckoutSession(sessionId) : 'expired';
      if (outcome === 'completed') throw alreadySubscribed(); // the webhooks will catch the row up
      await this.repo.update(existing.id, { status: FINAL });
    }

    let row: SubscriptionRow;
    try {
      row = await this.repo.create({ userId, courseId: course.id, plan: input.plan, provider: 'STRIPE', status: 'INCOMPLETE', priceFils });
    } catch (e) {
      if (isUniqueViolation(e)) throw alreadySubscribed(); // lost a race against another request
      throw e;
    }

    try {
      const session = await this.startCheckout(row, user.email, course.id, priceId);
      await this.repo.update(row.id, { stripeCheckoutSessionId: checkoutMarker(session.id, priceId) });
      return { checkoutUrl: session.url, reference: row.id };
    } catch (e) {
      await this.repo.update(row.id, { status: FINAL }); // free the slot so the learner can try again
      throw e;
    }
  }


  // ───────── bank transfer ─────────

  private get T() {
    if (!this.transfers) throw new BusinessRuleError('This payment method is not available for plans yet', 'METHOD_UNAVAILABLE');
    return this.transfers;
  }

  /**
   * `POST /courses/:id/subscribe` (method BANK_TRANSFER): a prepaid month or year, no auto-renew. The first transfer opens an
   * INCOMPLETE row; a renewal reuses the ACTIVE transfer row. An open payment is handed back instead of making a second one.
   */
  private async subscribeTransfer(userId: string, courseIdOrSlug: string, plan: SubscriptionPlan, bankAccountId?: string): Promise<TransferSubscribeResult> {
    const T = this.T;
    const course = await this.repo.findCourse(courseIdOrSlug);
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course', courseIdOrSlug);
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Only recorded courses have plans', 'NOT_RECORDED');
    const priceFils = plan === 'YEARLY' ? course.yearlyPriceFils : course.monthlyPriceFils;
    if (priceFils == null) throw new BusinessRuleError('This course is not open for plans yet', 'PRICE_NOT_READY');
    const user = await this.repo.findUser(userId);
    if (!user) throw new NotFoundError('User', userId);
    const now = this.clock.now();

    let row = pickSubscription(await this.repo.forUserCourse(userId, course.id));
    if (row && row.provider === 'BANK_TRANSFER') {
      // A renewal (ACTIVE) or a first transfer still being paid (INCOMPLETE); anything else is not ours to extend.
      if (row.status !== 'ACTIVE' && row.status !== 'INCOMPLETE') throw alreadySubscribed();
      const open = (await T.repo.transferPaymentsOf([row.id])).find((p) => p.status === 'AWAITING_RECEIPT' || p.status === 'AWAITING_REVIEW');
      if (open && open.status === 'AWAITING_RECEIPT' && open.expiresAt && open.expiresAt < now) {
        await T.repo.updateTransferPayment(open.id, { status: 'EXPIRED' });
      } else if (open) {
        return this.transferResult(open);
      }
    } else if (row) {
      // Only an unfinished checkout can be taken over; any other live plan is a real one.
      if (row.status !== 'INCOMPLETE' || row.providerSubscriptionId) throw alreadySubscribed();
      if (row.provider === 'APPLE' && now.getTime() < row.updatedAt.getTime() + APPLE_PENDING_MS) throw alreadySubscribed();
      const sessionId = storedSessionId(row.stripeCheckoutSessionId);
      const outcome = sessionId ? await this.gateway.expireCheckoutSession(sessionId) : 'expired';
      if (outcome === 'completed') throw alreadySubscribed();
      await this.repo.update(row.id, { status: FINAL });
      row = null;
    }

    const account = await resolveBankAccount(T.bankAccounts, bankAccountId);
    if (!row) {
      try {
        row = await this.repo.create({ userId, courseId: course.id, plan, provider: 'BANK_TRANSFER', status: 'INCOMPLETE', priceFils });
      } catch (e) {
        if (isUniqueViolation(e)) throw alreadySubscribed();
        throw e;
      }
    }
    const total = this.prices.inclusive(priceFils);
    const expiresAt = addHours(now, T.holdHours);
    const payment = await T.repo.createTransferPayment({
      subscriptionId: row.id,
      userId,
      reference: await this.newReference(),
      plan,
      periodStart: now,
      periodEnd: now,
      ...this.prices.splitInclusive(total),
      totalFils: total,
      bankAccountId: account.id,
      expiresAt,
    });

    const ar = user.locale === 'ar';
    const name = (ar ? course.titleAr : null) ?? course.titleEn;
    const label = PLAN_LABEL[plan][ar ? 1 : 0];
    const amount = formatMoney(filsToAed(total), 'AED');
    const zone = user.timezone ?? 'Asia/Dubai';
    const when = formatInZone(expiresAt, zone, user.locale);
    await this.notifier.notify([userId], {
      type: 'TRANSFER_INSTRUCTIONS',
      title: ar ? `ادفع بتحويل بنكي · ${name} · ${label}` : `Pay by bank transfer · ${name} · ${label}`,
      body: ar
        ? `حوّل ${amount} بالمرجع ${payment.reference} قبل ${when}. يبدأ وصولك بعد تأكيدنا للتحويل، عادةً خلال يوم عمل واحد.`
        : `Transfer ${amount} with reference ${payment.reference} before ${when}. Your access starts once we confirm it, usually within 1 working day.`,
      data: { paymentId: payment.id, subscriptionId: row.id, reference: payment.reference },
      email: (r) => appEmails.transferInstructions(r.name, amount, payment.reference, account.bankName, account.iban, formatInZone(expiresAt, r.timezone, r.locale)),
    });
    return { plan, bankAccount: account, reference: payment.reference, amountFils: total, expiresAt, paymentId: payment.id };
  }

  private async transferResult(p: TransferPaymentRow): Promise<TransferSubscribeResult> {
    const account = p.bankAccountId ? await this.T.bankAccounts.findBankAccount(p.bankAccountId) : null;
    if (!account) throw new BusinessRuleError('No bank account is available for transfers', 'NO_BANK_ACCOUNT');
    return { plan: p.plan, bankAccount: account, reference: p.reference, amountFils: p.totalFils, expiresAt: p.expiresAt ?? this.clock.now(), paymentId: p.id };
  }

  /** Is this id a plan payment by transfer? The inbox review route uses it to tell plans from seats. */
  async isTransferPayment(id: string): Promise<boolean> {
    if (!this.transfers) return false;
    const payment = await this.transfers.repo.transferPayment(id);
    return !!payment && (await this.repo.findById(payment.subscriptionId))?.provider === 'BANK_TRANSFER';
  }

  /** A payment of this row still waits for a receipt or a review. */
  private async hasOpenTransferPayment(subscriptionId: string): Promise<boolean> {
    if (!this.transfers) return false;
    return (await this.transfers.repo.transferPaymentsOf([subscriptionId])).some((p) => p.status === 'AWAITING_RECEIPT' || p.status === 'AWAITING_REVIEW');
  }

  /**
   * Closes the row's payments that are in `statuses` (guarded in the repository, so a concurrent approval is never overwritten).
   * The job and the card takeover close only AWAITING_RECEIPT: a payment AWAITING_REVIEW has money behind it and stays for the admin.
   */
  private async closeOpenTransferPayments(subscriptionId: string, statuses: Array<'AWAITING_RECEIPT' | 'AWAITING_REVIEW'> = ['AWAITING_RECEIPT']) {
    return this.transfers ? this.transfers.repo.expireTransferPayments(subscriptionId, statuses) : [];
  }

  private async ownedPayment(paymentId: string, userId: string) {
    const payment = await this.T.repo.transferPayment(paymentId);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Payment', paymentId);
    return payment;
  }

  /** Throws unless `userId` may attach a receipt to this payment right now (the seat-order rules). */
  async assertTransferReceiptUploadable(paymentId: string, userId: string) {
    const payment = await this.ownedPayment(paymentId, userId);
    if (payment.status !== 'AWAITING_RECEIPT') throw new BusinessRuleError(`Payment is ${payment.status}`, 'PAYMENT_NOT_AWAITING_RECEIPT');
    if (payment.expiresAt && payment.expiresAt < this.clock.now()) throw new BusinessRuleError('The hold for this payment expired', 'PAYMENT_EXPIRED');
    if ((await this.repo.findById(payment.subscriptionId))?.status === FINAL) throw new BusinessRuleError('This plan has ended; start a new one', 'PLAN_ENDED');
    return payment;
  }

  /** `POST /subscription-payments/:id/receipt`: AWAITING_RECEIPT → AWAITING_REVIEW, and the admins are told. */
  async uploadTransferReceipt(paymentId: string, userId: string, receiptUrl: string) {
    const payment = await this.assertTransferReceiptUploadable(paymentId, userId);
    const updated = await this.T.repo.updateTransferPayment(payment.id, { status: 'AWAITING_REVIEW', receiptUrl, reviewNote: null });
    await this.notifier.notifyRole(
      'ADMIN',
      {
        type: 'TRANSFER_TO_VERIFY',
        title: `Transfer to verify · ${payment.reference}`,
        body: `${(payment.totalFils / 100).toFixed(2)} AED receipt uploaded`,
        data: { paymentId: payment.id, reference: payment.reference },
      },
      { channels: ['in-app', 'realtime'] },
    );
    return this.transferView(updated);
  }

  private transferView(p: TransferPaymentRow) {
    return { id: p.id, reference: p.reference, amountFils: p.totalFils, status: p.status, plan: p.plan, receiptUrl: p.receiptUrl, expiresAt: p.expiresAt, reviewNote: p.reviewNote };
  }

  /**
   * Admin decision on a transfer waiting for review (called from the transfers inbox).
   * Approve: PAID, the plan runs from max(now, its current end) for a month/year, earnings accrue, a receipt goes out.
   * Reject: the learner is told why; a first transfer or a lapsed plan ends so they can start again.
   * `newReceipt`: back to AWAITING_RECEIPT with a fresh hold.
   */
  async reviewTransfer(paymentId: string, input: TransferReviewInput, adminId: string) {
    const T = this.T;
    const payment = await T.repo.transferPayment(paymentId);
    if (!payment) throw new NotFoundError('Payment', paymentId);
    if (payment.status !== 'AWAITING_REVIEW') throw new BusinessRuleError(`Payment is ${payment.status}, nothing to review`, 'PAYMENT_NOT_REVIEWABLE');
    const sub = await this.repo.findById(payment.subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', payment.subscriptionId);
    const now = this.clock.now();
    const course = await this.repo.courseOf(sub.courseId);

    if (input.approve) {
      if (input.receivedFils != null && input.receivedFils !== payment.totalFils) {
        throw new BusinessRuleError('Received amount does not match the payment total', 'AMOUNT_MISMATCH', {
          expectedFils: payment.totalFils,
          receivedFils: input.receivedFils,
          differenceFils: input.receivedFils - payment.totalFils,
        });
      }
      const periodStart = new Date(Math.max(now.getTime(), sub.currentPeriodEnd?.getTime() ?? 0));
      const periodEnd = addPeriod(periodStart, payment.plan);
      // The claim and the plan update are one step: a second approval finds the payment already PAID and changes nothing.
      // A plan that had ended (EXPIRED) comes back as ACTIVE on purpose: the learner paid for this period.
      let claimed: TransferPaymentRow | null;
      try {
        claimed = await T.repo.reviewTransferPayment(
          payment.id,
          { status: 'PAID', periodStart, periodEnd, paidAt: now, reviewedById: adminId, reviewNote: input.note ?? null },
          {
            id: sub.id,
            patch: {
              status: 'ACTIVE',
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              ...(payment.plan !== sub.plan || payment.subtotalFils !== sub.priceFils ? { plan: payment.plan, priceFils: payment.subtotalFils } : {}),
            },
          },
        );
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        throw new BusinessRuleError('The learner already has another plan for this course', 'ANOTHER_PLAN_ACTIVE');
      }
      if (!claimed) throw await this.notReviewable(payment.id);
      const updated = (await this.repo.findById(sub.id))!;
      await this.announceIfActivated(sub, updated);
      try {
        await this.payouts.accrueForSubscriptionPayment(payment.id);
      } catch (e) {
        this.log(`accrueForSubscriptionPayment(${payment.id}) failed`, e);
      }
      await this.sendReceipt(updated, course, payment.totalFils, payment.reference, periodEnd);
      return this.transferView(claimed);
    }

    const note = input.note?.trim();
    if (!note) throw new BusinessRuleError('Say why, so the learner knows what to do', 'NOTE_REQUIRED');
    const user = await this.repo.findUser(payment.userId);

    if (input.newReceipt) {
      const expiresAt = addHours(now, T.holdHours);
      const reopened = await T.repo.reviewTransferPayment(payment.id, { status: 'AWAITING_RECEIPT', receiptUrl: null, reviewNote: note, reviewedById: adminId, expiresAt });
      if (!reopened) throw await this.notReviewable(payment.id);
      await this.notifier.notify([payment.userId], {
        type: 'TRANSFER_NEW_RECEIPT',
        title: `New receipt needed · ${payment.reference}`,
        body: note,
        data: { paymentId: payment.id },
        email: (r) => appEmails.newReceiptRequested(r.name, payment.reference, note, formatInZone(expiresAt, r.timezone, r.locale)),
      });
      return this.transferView(reopened);
    }

    // Nothing paid for is left to run: a first transfer frees the slot, a renewal past its end lets the plan lapse.
    const lapsed = sub.status === 'INCOMPLETE' || (sub.status === 'ACTIVE' && !!sub.currentPeriodEnd && sub.currentPeriodEnd <= now);
    const rejected = await T.repo.reviewTransferPayment(
      payment.id,
      { status: 'REJECTED', reviewNote: note, reviewedById: adminId },
      lapsed ? { id: sub.id, patch: { status: FINAL } } : undefined,
    );
    if (!rejected) throw await this.notReviewable(payment.id);
    if (lapsed && sub.status !== 'INCOMPLETE') await this.notifyEnded(sub, course, user?.locale);
    await this.notifier.notify([payment.userId], {
      type: 'TRANSFER_REJECTED',
      title: `Transfer not verified · ${payment.reference}`,
      body: note,
      data: { paymentId: payment.id },
      email: (r) => appEmails.transferRejected(r.name, payment.reference, note),
    });
    return this.transferView(rejected);
  }

  /** The claim lost to another review: say what the payment is now. */
  private async notReviewable(paymentId: string) {
    const status = (await this.T.repo.transferPayment(paymentId))?.status ?? 'gone';
    return new BusinessRuleError(`Payment is ${status}, nothing to review`, 'PAYMENT_NOT_REVIEWABLE');
  }

  private async notifyEnded(sub: SubscriptionRow, course: SubscribableCourse | null, locale?: string) {
    const ar = locale === 'ar';
    await this.notifier.notify([sub.userId], {
      type: 'SUBSCRIPTION_ENDED',
      title: ar ? `انتهى اشتراكك · ${(course?.titleAr ?? course?.titleEn) ?? ''}` : `Your plan has ended · ${course?.titleEn ?? ''}`,
      body: ar ? 'انتهى اشتراكك، وتقدّمك محفوظ.' : 'Your plan has ended. Your progress is saved.',
      data: { subscriptionId: sub.id, ...(course && { courseSlug: course.slug }) },
    });
  }

  /** Held transfers that were never paid expire (and free an INCOMPLETE row). Runs often; the daily job calls it too. */
  async expireStaleTransferPayments() {
    if (!this.transfers) return { expiredPayments: 0 };
    const T = this.transfers;
    let expiredPayments = 0;
    for (const p of await T.repo.staleTransferPayments(this.clock.now())) {
      await T.repo.updateTransferPayment(p.id, { status: 'EXPIRED' });
      expiredPayments++;
      const sub = await this.repo.findById(p.subscriptionId);
      if (sub && sub.status === 'INCOMPLETE') await this.repo.update(sub.id, { status: FINAL });
      await this.notifier.notify([p.userId], {
        type: 'TRANSFER_EXPIRED',
        title: `Transfer window closed · ${p.reference}`,
        body: 'We did not receive a receipt in time. You can start again whenever you like.',
        data: { paymentId: p.id },
      });
    }
    return { expiredPayments };
  }

  /**
   * Daily job. Stale holds expire; transfer plans past their end become EXPIRED (no grace) unless a renewal receipt uploaded
   * before the end is waiting for review. Learners are told when a plan ends.
   */
  async expireTransferSubscriptions() {
    if (!this.transfers) return { expiredPayments: 0, expiredSubscriptions: 0 };
    const T = this.transfers;
    const { expiredPayments } = await this.expireStaleTransferPayments();
    let expiredSubscriptions = 0;
    for (const sub of await T.repo.endedTransferSubscriptions(this.clock.now())) {
      const payments = await T.repo.transferPaymentsOf([sub.id]);
      if (hasPendingRenewalReceipt(sub, payments)) continue;
      await this.repo.update(sub.id, { status: FINAL });
      // A renewal that never got its receipt can no longer be paid into this plan; one with a receipt waits for the admin.
      await this.closeOpenTransferPayments(sub.id);
      expiredSubscriptions++;
      const [user, course] = await Promise.all([this.repo.findUser(sub.userId), this.repo.courseOf(sub.courseId)]);
      await this.notifyEnded(sub, course, user?.locale);
    }
    return { expiredPayments, expiredSubscriptions };
  }

  /**
   * `POST /subscriptions/:id/switch-to-card`: a Stripe subscription whose first charge is the day the paid transfer period ends.
   * The webhook that confirms it closes this row and starts the card row (`takeOverFromTransfer`).
   */
  async switchToCard(id: string, userId: string) {
    const sub = await this.owned(id, userId);
    if (sub.provider !== 'BANK_TRANSFER') throw new BusinessRuleError('This plan is not paid by transfer', 'NOT_TRANSFER_PLAN');
    const now = this.clock.now();
    if (sub.status !== 'ACTIVE' || !sub.currentPeriodEnd || sub.currentPeriodEnd <= now) throw new BusinessRuleError('This plan is not active', 'NOT_ACTIVE');
    if (sub.currentPeriodEnd.getTime() < now.getTime() + MIN_TRIAL_MS) {
      throw new BusinessRuleError('Your plan ends within two days; start a card plan once it has ended', 'SWITCH_TOO_LATE');
    }
    if (await this.hasOpenTransferPayment(sub.id)) {
      throw new AppError('Finish your open transfer, or let it lapse, before switching to card', 409, 'TRANSFER_PENDING');
    }
    const [course, user] = await Promise.all([this.repo.courseOf(sub.courseId), this.repo.findUser(userId)]);
    const priceId = sub.plan === 'YEARLY' ? course?.stripeYearlyPriceId : course?.stripeMonthlyPriceId;
    if (!course || !priceId) throw new BusinessRuleError('Card payment is not available for this course yet', 'PRICE_NOT_READY');
    if (!user) throw new NotFoundError('User', userId);

    // The Session is remembered on the transfer row as `<id>@<expiresAtMs>`, so a repeat call asks for the very same Session
    // (same arguments, same idempotency key) while it is open, and closes it first once it has lapsed. Before a Session exists
    // the slot is claimed with a guarded write (`pending@<expiresAtMs>`): of two concurrent first calls one wins, and the other
    // adopts the winner's expiry, so both ask Stripe for the same Session.
    const T = this.T;
    const stored = parseSwitchSession(sub.stripeCheckoutSessionId);
    let expiresAt: Date;
    let claimedSlot: string | null = null;
    if (stored && stored.expiresAt > now) {
      expiresAt = stored.expiresAt;
    } else {
      if (stored && stored.id !== 'pending' && (await this.gateway.expireCheckoutSession(stored.id)) === 'completed') {
        throw new AppError('Your card checkout was already completed; it will show here shortly', 409, 'SWITCH_IN_PROGRESS');
      }
      expiresAt = new Date(now.getTime() + CHECKOUT_LIFETIME_MS);
      const slot = `pending@${expiresAt.getTime()}`;
      if (await T.repo.claimCheckoutSlot(sub.id, sub.stripeCheckoutSessionId, slot)) {
        claimedSlot = slot;
      } else {
        const winner = parseSwitchSession((await this.repo.findById(sub.id))?.stripeCheckoutSessionId ?? null);
        if (!winner || winner.expiresAt <= now) throw new AppError('Another card checkout is starting; try again in a moment', 409, 'SWITCH_IN_PROGRESS');
        expiresAt = winner.expiresAt;
      }
    }
    const ref = encodeURIComponent(sub.id);
    let session: { id: string; url: string };
    try {
      session = await this.gateway.createSubscriptionCheckout({
        priceId,
        customerEmail: user.email,
        reference: sub.id,
        metadata: { subscriptionRef: sub.id, replacesSubscriptionId: sub.id, userId, courseId: course.id, plan: sub.plan },
        successUrl: `${this.webUrl}/learn/recorded/return?ref=${ref}`,
        cancelUrl: `${this.webUrl}/learn/recorded/return?ref=${ref}&cancelled=1`,
        trialEnd: sub.currentPeriodEnd,
        expiresAt,
      });
    } catch (e) {
      if (claimedSlot) await T.repo.claimCheckoutSlot(sub.id, claimedSlot, sub.stripeCheckoutSessionId ?? '').catch(() => false);
      throw e;
    }
    await this.repo.update(sub.id, { stripeCheckoutSessionId: `${session.id}@${expiresAt.getTime()}` });
    return { checkoutUrl: session.url };
  }

  /**
   * The Stripe subscription started by `switchToCard` arrived. The transfer row is closed (EXPIRED, its end date kept) and a card
   * row takes over, already running until the same end, so the learner never loses access. Safe to replay.
   */
  private async takeOverFromTransfer(oldId: string, metadata: Record<string, string>, stripeId: string | null): Promise<SubscriptionRow | null> {
    const old = await this.repo.findById(oldId);
    if (!old || old.provider !== 'BANK_TRANSFER' || (metadata.userId && metadata.userId !== old.userId)) return null;
    const liveCard = () =>
      this.repo.forUserCourse(old.userId, old.courseId).then((rows) => rows.find((r) => r.provider === 'STRIPE' && r.status !== FINAL) ?? null);
    const existing = await liveCard();
    if (existing) {
      // The first event already made the card row and this one fills it in; a card row tied to another Stripe subscription means
      // the learner completed a second checkout, whose subscription would bill silently.
      if (!existing.providerSubscriptionId) return existing;
      await this.cancelStray(stripeId, [old.id, existing.id]);
      return null;
    }
    if (old.status !== FINAL) await this.repo.update(old.id, { status: FINAL });
    await this.closeOpenTransferPayments(old.id);
    let row: SubscriptionRow;
    try {
      row = await this.repo.create({ userId: old.userId, courseId: old.courseId, plan: old.plan, provider: 'STRIPE', status: 'INCOMPLETE', priceFils: old.priceFils });
    } catch (e) {
      if (isUniqueViolation(e)) return liveCard();
      throw e;
    }
    if (old.currentPeriodEnd && old.currentPeriodEnd > this.clock.now()) {
      row = await this.repo.update(row.id, { status: 'ACTIVE', currentPeriodEnd: old.currentPeriodEnd });
    }
    return row;
  }

  private async cancelStray(stripeId: string | null, rowIds: string[], kind = 'switch-to-card') {
    if (!stripeId) {
      this.log(`stray ${kind} subscription found (rows ${rowIds.join(', ')}) but the event has no Stripe id: nothing to cancel`, null);
      return;
    }
    this.log(`stray ${kind} subscription cancelled: stripe ${stripeId} (rows ${rowIds.join(', ')})`, null);
    try {
      await this.gateway.cancelNow(stripeId);
    } catch (e) {
      this.log(`cancelNow(${stripeId}) failed for a stray subscription`, e);
    }
  }

  /**
   * Admin ends a transfer plan now (the route is Task 9). FULL also records a manual refund on the last paid payment and takes
   * back what it earned the teacher; the money itself is returned by finance.
   */
  async adminCancelTransfer(id: string, input: { refund: 'NONE' | 'FULL' }, _adminId: string) {
    const T = this.T;
    const sub = await this.repo.findById(id);
    if (!sub) throw new NotFoundError('Subscription', id);
    if (sub.provider !== 'BANK_TRANSFER') throw new BusinessRuleError('This plan is not paid by transfer', 'NOT_TRANSFER_PLAN');
    if (sub.status === FINAL) throw new BusinessRuleError('This plan has already ended', 'NOT_ACTIVE');
    const payments = await T.repo.transferPaymentsOf([sub.id]);
    // An explicit admin action may also close a payment that is waiting for review; those are listed so finance can return the money.
    const closed = await this.closeOpenTransferPayments(sub.id, ['AWAITING_RECEIPT', 'AWAITING_REVIEW']);
    const closedPayments = closed.map((p) => ({ id: p.id, reference: p.reference, status: p.status, totalFils: p.totalFils, receiptUploaded: p.status === 'AWAITING_REVIEW' }));
    for (const p of closedPayments.filter((x) => x.receiptUploaded)) this.log(`admin cancel closed a payment with an uploaded receipt: ${p.reference} (${p.totalFils} fils) may need returning`, null);
    const ended = await this.repo.update(sub.id, { status: FINAL, cancelAtPeriodEnd: false });
    if (input.refund === 'FULL') {
      const last = payments.find((p) => p.status === 'PAID');
      if (last) await this.recordRefund(last, last.totalFils);
    }
    const [user, course] = await Promise.all([this.repo.findUser(sub.userId), this.repo.courseOf(sub.courseId)]);
    await this.notifyEnded(sub, course, user?.locale);
    return { ...this.summary(ended), closedPayments };
  }

  /**
   * `POST /admin/subscriptions/:id/cancel`. The plan ends now and the learner is told.
   * - STRIPE: an unfinished checkout's Session is expired first (409 `CHECKOUT_COMPLETED` when it was already paid).
   *   FULL refunds the last paid invoice first (a refusal changes nothing: 502 `REFUND_FAILED`), then the subscription
   *   is cancelled. If that cancel fails after the refund, the refund is recorded and `cancelPending: true` is returned.
   * - BANK_TRANSFER: `adminCancelTransfer`.
   * - APPLE: only the App Store can end it (422 `MANAGED_BY_APPLE`).
   */
  async adminCancel(id: string, input: { refund: 'NONE' | 'FULL' }, adminId: string) {
    const sub = await this.repo.findById(id);
    if (!sub) throw new NotFoundError('Subscription', id);
    if (sub.provider === 'APPLE') throw MANAGED_BY_APPLE();
    if (sub.provider === 'BANK_TRANSFER') return { ...(await this.adminCancelTransfer(id, input, adminId)), refundedFils: 0, cancelPending: false };
    if (sub.status === FINAL) throw new BusinessRuleError('This plan has already ended', 'NOT_ACTIVE');
    // An unfinished checkout: close its Session first, so the learner cannot pay on it after the row has ended.
    const openSession = sub.status === 'INCOMPLETE' ? storedSessionId(sub.stripeCheckoutSessionId) : null;
    if (openSession && (await this.gateway.expireCheckoutSession(openSession)) === 'completed') {
      throw new AppError('The learner has just paid for this plan; it will show as active shortly', 409, 'CHECKOUT_COMPLETED');
    }
    if (input.refund === 'FULL' && !this.admin) throw new AppError('Refunds are not available here', 503, 'METHOD_UNAVAILABLE');
    const last = input.refund === 'FULL' && this.admin ? await this.admin.lastPaidPayment(sub.id) : null;
    const remaining = last ? last.totalFils - last.refundedFils : 0;
    const refundable = !!last && remaining > 0 && !!last.providerPaymentId;
    if (last && remaining > 0 && !last.providerPaymentId) this.log(`admin cancel: payment ${last.id} has no invoice to refund`, null);
    // Money first: if Stripe refuses the refund nothing has changed and the admin can retry, or cancel without a refund.
    if (refundable) {
      try {
        await this.gateway.refundInvoice(last!.providerPaymentId!, remaining);
      } catch (e) {
        this.log(`refundInvoice(${last!.providerPaymentId}) failed; subscription ${sub.id} left as it was`, e);
        throw new AppError('Stripe could not refund the last payment, so nothing was changed. Try again, or cancel without a refund.', 502, 'REFUND_FAILED');
      }
    }
    let cancelPending = false;
    if (sub.providerSubscriptionId) {
      try {
        await this.gateway.cancelNow(sub.providerSubscriptionId);
      } catch (e) {
        // Only reachable after a refund (otherwise the error is the admin's to see). The refund stands; cancelling can be retried.
        if (!refundable) throw e;
        cancelPending = true;
        this.log(`URGENT: payment ${last!.id} was refunded but cancelNow(${sub.providerSubscriptionId}) failed; subscription ${sub.id} is still running in Stripe`, e);
      }
    }
    if (refundable) await this.recordRefund(last!, last!.totalFils);
    if (cancelPending) return { ...this.summary(sub), closedPayments: [], refundedFils: remaining, cancelPending };
    const ended = await this.repo.update(sub.id, { status: FINAL, cancelAtPeriodEnd: false });
    if (sub.status !== 'INCOMPLETE') {
      const [user, course] = await Promise.all([this.repo.findUser(sub.userId), this.repo.courseOf(sub.courseId)]);
      await this.notifyEnded(sub, course, user?.locale);
    }
    return { ...this.summary(ended), closedPayments: [], refundedFils: refundable ? remaining : 0, cancelPending };
  }

  /**
   * Writes down what has been returned on a payment (a cumulative amount) and takes it back from the teacher's earning.
   * REFUNDED once it is all returned. Idempotent: an amount that is not above what is recorded changes nothing.
   * Shared by refunds made in the Stripe dashboard and by the admin cancel.
   */
  private async recordRefund(payment: { id: string; totalFils: number; refundedFils: number }, cumulativeFils: number) {
    const refunded = Math.min(Math.max(cumulativeFils, 0), payment.totalFils);
    if (refunded <= payment.refundedFils) return false;
    await this.repo.refundPayment(payment.id, refunded, refunded >= payment.totalFils);
    try {
      await this.payouts.reverseSubscriptionPayment?.(payment.id, refunded);
    } catch (e) {
      this.log(`reverseSubscriptionPayment(${payment.id}) failed`, e);
    }
    return true;
  }

  /** `refund.succeeded` for a charge that paid a plan invoice (a refund made in the Stripe dashboard). Seat refunds carry no invoice and are not ours. */
  private async onChargeRefunded(evt: PaymentWebhookEvent) {
    if (!evt.invoiceId || evt.amountRefundedFils == null) return { handled: false };
    const payment = await this.repo.paymentByProviderId(evt.invoiceId);
    if (!payment) return { handled: false };
    const changed = await this.recordRefund(payment, evt.amountRefundedFils);
    return changed ? { handled: true } : { handled: true, duplicate: true };
  }

  // ───────── admin reads ─────────

  /** `GET /admin/subscriptions` */
  async adminList(f: { courseId?: string; status?: SubscriptionStatus; provider?: SubscriptionProvider; skip: number; take: number }) {
    if (!this.admin) throw new BusinessRuleError('Subscriptions are not available here', 'METHOD_UNAVAILABLE');
    return this.admin.listForAdmin(f);
  }

  /** `GET /teacher/courses/:id/subscribers` — the course's author or an admin. */
  async subscriberCounts(courseId: string, viewer: { id: string; role: Role }) {
    if (!this.admin) throw new BusinessRuleError('Subscriptions are not available here', 'METHOD_UNAVAILABLE');
    const counts = await this.admin.subscriberCounts(courseId);
    if (!counts) throw new NotFoundError('Course', courseId);
    if (viewer.role !== 'ADMIN' && counts.createdById !== viewer.id) throw new ForbiddenError('Only the course author can see its subscribers');
    const { createdById: _author, ...n } = counts;
    return { ...n, total: n.active + n.cancelling + n.pastDue };
  }

  // ───────── renewal reminders ─────────

  /**
   * Daily job. Once per period each learner hears that the plan is about to end or renew:
   * - STRIPE and APPLE: YEARLY plans that are ACTIVE (not CANCELLING) and end in `YEARLY_REMINDER_DAYS` days. Monthly plans get none.
   * - BANK_TRANSFER (no auto-renew), monthly and yearly: within that many days, and again on the end day (today, or ended within the last 24 h). A plan whose renewal
   *   receipt is already waiting for review is left alone.
   * The period end each reminder was sent for is remembered on the row, so a rerun sends nothing new.
   */
  private warnedNoReminders = false;

  async remindRenewals() {
    if (!this.admin) {
      if (!this.warnedNoReminders) this.log('remindRenewals: no admin repository is wired, so no renewal reminders are sent', null);
      this.warnedNoReminders = true;
      return { reminders: 0 };
    }
    const DAY = 86_400_000;
    const now = this.clock.now().getTime();
    const soonTo = now + YEARLY_REMINDER_DAYS * DAY;
    let reminders = 0;
    for (const c of await this.admin.endingBetween(new Date(now - DAY), new Date(soonTo))) {
      const end = c.currentPeriodEnd.getTime();
      const transfer = c.provider === 'BANK_TRANSFER';
      const kinds: Array<'SOON' | 'END_DAY'> = [];
      const endDay = transfer && end <= now + DAY; // ends today, or ended within the last 24 h
      // Anything inside the 7 days not yet reminded: a run that was late still sends it once (the dedupe columns stop repeats).
      if (!endDay && end > now && end <= soonTo && (transfer || c.plan === 'YEARLY') && c.reminderSentForPeriodEnd?.getTime() !== end) kinds.push('SOON');
      if (endDay && c.reminderEndDaySentFor?.getTime() !== end) kinds.push('END_DAY');
      if (!kinds.length) continue;
      try {
        if (transfer && this.transfers && hasPendingRenewalReceipt(c, await this.transfers.repo.transferPaymentsOf([c.id]))) continue;
        for (const kind of kinds) {
          if (!(await this.admin.claimReminder(c.id, kind, c.currentPeriodEnd))) continue;
          try {
            await this.sendRenewalReminder(c, kind);
          } catch (e) {
            // Give the claim back so tomorrow's run tries again.
            await this.admin.releaseReminder(c.id, kind, c.currentPeriodEnd, (kind === 'SOON' ? c.reminderSentForPeriodEnd : c.reminderEndDaySentFor) ?? null);
            throw e;
          }
          reminders++;
        }
      } catch (e) {
        this.log(`renewal reminder for subscription ${c.id} failed`, e);
      }
    }
    return { reminders };
  }

  private async sendRenewalReminder(c: ReminderCandidate, kind: 'SOON' | 'END_DAY') {
    const [user, course] = await Promise.all([this.repo.findUser(c.userId), this.repo.courseOf(c.courseId)]);
    const ar = user?.locale === 'ar';
    const name = (ar ? course?.titleAr : null) ?? course?.titleEn ?? '';
    const date = new Intl.DateTimeFormat(ar ? 'ar-AE-u-nu-latn' : 'en-GB', { timeZone: user?.timezone ?? 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' }).format(c.currentPeriodEnd);
    const transfer = c.provider === 'BANK_TRANSFER';
    const copy = transfer
      ? kind === 'END_DAY'
        ? ar
          ? { title: `آخر يوم في اشتراكك · ${name}`, body: `ينتهي اشتراكك اليوم، ${date}. جدّد بتحويل بنكي لتواصل التعلّم.`, label: 'جدّد بتحويل بنكي' }
          : { title: `Last day of your plan · ${name}`, body: `Your plan ends today, ${date}. Renew by transfer to keep learning.`, label: 'Renew by transfer' }
        : ar
          ? { title: `اشتراكك على وشك الانتهاء · ${name}`, body: `ينتهي اشتراكك في ${date}. جدّد بتحويل بنكي لتواصل التعلّم.`, label: 'جدّد بتحويل بنكي' }
          : { title: `Your plan ends soon · ${name}`, body: `Your plan ends on ${date}. Renew by transfer to keep learning.`, label: 'Renew by transfer' }
      : ar
        ? { title: `يتجدّد اشتراكك قريبًا · ${name}`, body: `يتجدّد اشتراكك السنوي في ${date}. يمكنك إدارته في أي وقت.`, label: 'إدارة اشتراكي' }
        : { title: `Your plan renews soon · ${name}`, body: `Your yearly plan renews on ${date}. You can manage it any time.`, label: 'Manage my plan' };
    const email = appEmails.subscriptionRenewsSoon(user?.name ?? '', copy.title, copy.body, `${this.webUrl}/plans`, copy.label);
    await this.notifier.notify([c.userId], {
      type: 'SUBSCRIPTION_RENEWS_SOON',
      title: copy.title,
      body: copy.body,
      data: { subscriptionId: c.id, ...(course && { courseSlug: course.slug }) },
      email: () => email,
    });
  }

  // ───────── Apple (StoreKit 2) ─────────

  /** `POST /courses/:id/subscribe` (iOS): an INCOMPLETE APPLE row with a fresh `appAccountToken` for StoreKit's purchase call. */
  private async subscribeApple(userId: string, courseIdOrSlug: string, plan: SubscriptionPlan) {
    const course = await this.repo.findCourse(courseIdOrSlug);
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course', courseIdOrSlug);
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Only recorded courses have plans', 'NOT_RECORDED');
    const productId = plan === 'YEARLY' ? course.appleYearlyProductId : course.appleMonthlyProductId;
    if (!productId) throw new BusinessRuleError('This plan is not available in the app yet', 'APPLE_PRODUCT_MISSING');
    const priceFils = plan === 'YEARLY' ? course.yearlyPriceFils : course.monthlyPriceFils;
    if (priceFils == null) throw new BusinessRuleError('This course is not open for plans yet', 'PRICE_NOT_READY');

    const existing = pickSubscription(await this.repo.forUserCourse(userId, course.id));
    if (existing) {
      if (existing.status !== 'INCOMPLETE' || existing.providerSubscriptionId) throw alreadySubscribed();
      if (existing.provider === 'APPLE') {
        // An unfinished (or reopened) checkout of this learner: the requested plan, with the row's own token so a StoreKit purchase
        // already in flight still matches. The write also marks the checkout as just started, which is what protects it from
        // being taken over while the purchase may be in flight.
        const token = existing.appleAppAccountToken ?? this.newToken().toLowerCase();
        try {
          const row = await this.repo.update(existing.id, { plan, priceFils, ...(!existing.appleAppAccountToken && { appleAppAccountToken: token }) });
          return { productId, appAccountToken: token, reference: row.id };
        } catch (e) {
          if (isUniqueViolation(e)) throw alreadySubscribed();
          throw e;
        }
      }
      if (existing.provider === 'BANK_TRANSFER') {
        // Only an unfinished transfer whose payments are all closed (expired or rejected) can be replaced.
        if (await this.hasOpenTransferPayment(existing.id)) throw alreadySubscribed();
        await this.repo.update(existing.id, { status: FINAL });
      } else {
        if (existing.provider !== 'STRIPE') throw alreadySubscribed();
        // An unfinished card checkout: close its Session (unless the learner already paid on it) and take over.
        const sessionId = storedSessionId(existing.stripeCheckoutSessionId);
        const outcome = sessionId ? await this.gateway.expireCheckoutSession(sessionId) : 'expired';
        if (outcome === 'completed') throw alreadySubscribed();
        await this.repo.update(existing.id, { status: FINAL });
      }
    }

    // Apple reuses one original transaction per group and Apple ID, so a lapsed learner coming back buys on the same
    // subscription: the ended row (which owns that id) is reopened rather than a second row created.
    const ended = (await this.repo.forUserCourse(userId, course.id))
      .filter((r) => r.provider === 'APPLE' && r.status === FINAL && r.appleOriginalTransactionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (ended) {
      try {
        const token = ended.appleAppAccountToken ?? this.newToken().toLowerCase();
        const row = await this.repo.update(ended.id, { status: 'INCOMPLETE', plan, priceFils, pendingPlan: null, cancelAtPeriodEnd: false, ...(!ended.appleAppAccountToken && { appleAppAccountToken: token }) });
        return { productId, appAccountToken: token, reference: row.id };
      } catch (e) {
        if (isUniqueViolation(e)) throw alreadySubscribed();
        throw e;
      }
    }
    const appAccountToken = this.newToken().toLowerCase();
    try {
      const row = await this.repo.create({ userId, courseId: course.id, plan, provider: 'APPLE', status: 'INCOMPLETE', priceFils, appleAppAccountToken: appAccountToken });
      return { productId, appAccountToken, reference: row.id };
    } catch (e) {
      if (isUniqueViolation(e)) throw alreadySubscribed();
      throw e;
    }
  }

  /** `POST /subscriptions/apple/verify`: the app hands over the StoreKit 2 signed transaction right after the purchase. */
  async verifyApple(userId: string, signedTransaction: string) {
    if (!this.apple) throw new BusinessRuleError('In-app purchase is not available', 'APPLE_UNAVAILABLE');
    const tx = await this.apple.verifyTransaction(signedTransaction);
    const row = await this.appleRowFor(tx);
    if (!row) throw new NotFoundError('Subscription');
    if (row.userId !== userId) throw new AppError('This purchase belongs to another account', 403, 'FOREIGN_SUBSCRIPTION', { finishTransaction: false });
    const course = await this.repo.courseOf(row.courseId);
    if (!course || !this.planOfProduct(course, tx.productId)) {
      throw new AppError('The purchased product does not match this course', 409, 'PRODUCT_MISMATCH', { finishTransaction: true });
    }
    if (tx.revocationDate) throw new AppError('Apple has revoked this purchase', 409, 'TRANSACTION_REVOKED', { finishTransaction: true });
    if (!tx.expiresDate) throw new AppError('This purchase is not a subscription', 409, 'NOT_A_SUBSCRIPTION', { finishTransaction: true });
    const result = await this.applyAppleTransaction(row, course, tx, 'verify');
    return { ...this.summary(result.row), status: result.row.status, reference: result.row.id };
  }

  /**
   * The Apple row a transaction belongs to: by the subscription's original transaction, else by the token we issued. An INCOMPLETE
   * row found by its token is accepted even when it holds another original id (the learner bought with a different Apple ID);
   * applying the transaction then overwrites that id. When another row already holds the transaction's original id the two
   * cannot be reconciled automatically, so it is refused (409) and logged.
   */
  private async appleRowFor(tx: AppleTransaction) {
    const byOriginal = await this.repo.findByAppleOriginalTransactionId(tx.originalTransactionId);
    const byToken = tx.appAccountToken ? await this.repo.findByAppleToken(tx.appAccountToken.toLowerCase()) : null;
    if (byOriginal && byToken && byOriginal.id !== byToken.id && byToken.status === 'INCOMPLETE') {
      this.log(`apple transaction ${tx.transactionId}: original id ${tx.originalTransactionId} belongs to subscription ${byOriginal.id}, token to ${byToken.id}`, null);
      throw new AppError('This purchase cannot be matched to your plan; please contact support', 409, 'APPLE_ACCOUNT_CONFLICT', { finishTransaction: false });
    }
    if (byOriginal) return byOriginal;
    if (!byToken) return null;
    const sameChain = !byToken.appleOriginalTransactionId || byToken.appleOriginalTransactionId === tx.originalTransactionId;
    return sameChain || byToken.status === 'INCOMPLETE' ? byToken : null;
  }

  /**
   * App Store Server Notifications V2 for a recorded-course product (routed here by `AppleIapService`). Every branch is safe to
   * replay: payments are keyed by the transaction id and status moves only forward.
   */
  async handleAppleNotification(n: AppleNotification): Promise<{ handled: boolean; duplicate?: boolean; type: string }> {
    const type = n.notificationType;
    const tx = n.transaction;
    if (!tx) return { handled: false, type };
    let row: SubscriptionRow | null;
    try {
      row = await this.appleRowFor(tx);
    } catch (e) {
      if (e instanceof AppError) return { handled: false, type }; // already logged; nothing safe to apply
      throw e;
    }
    if (!row) {
      this.log(`apple ${type}: no subscription for transaction ${tx.transactionId} (${tx.productId})`, null);
      return { handled: false, type };
    }
    const course = await this.repo.courseOf(row.courseId);
    if (!course) return { handled: false, type };
    const out = await this.dispatchApple(row, course, n, tx);
    return { ...out, type };
  }

  private async dispatchApple(row: SubscriptionRow, course: SubscribableCourse, n: AppleNotification, tx: AppleTransaction): Promise<{ handled: boolean; duplicate?: boolean }> {
    switch (n.notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW': {
        if (!this.planOfProduct(course, tx.productId) || !tx.expiresDate || tx.revocationDate) return { handled: false };
        const r = await this.applyAppleTransaction(row, course, tx, 'notification');
        return { handled: r.applied, ...(r.duplicate && { duplicate: true }) };
      }
      case 'DID_FAIL_TO_RENEW': {
        // A reopened checkout (INCOMPLETE) hears nothing from the old chain's billing until a new purchase is applied.
        if (row.status === 'INCOMPLETE') return { handled: true, duplicate: true };
        if (isOlderPeriod(row, tx)) return { handled: true, duplicate: true };
        // GRACE_PERIOD: Apple keeps retrying and the learner keeps access (the 16-day rule). Without it Apple is only retrying billing.
        if (row.status === FINAL || row.status === 'PAST_DUE') return { handled: true, duplicate: true };
        await this.repo.update(row.id, { status: 'PAST_DUE' });
        return { handled: true };
      }
      case 'GRACE_PERIOD_EXPIRED':
      case 'EXPIRED': {
        // A stale end of the old chain must not touch a reopened checkout (INCOMPLETE) or rewrite its period.
        if (row.status === 'INCOMPLETE') return { handled: true, duplicate: true };
        if (isOlderPeriod(row, tx)) return { handled: true, duplicate: true };
        if (row.status === FINAL) return { handled: true, duplicate: true };
        await this.repo.update(row.id, { status: FINAL, pendingPlan: null, ...(tx.expiresDate && { currentPeriodEnd: tx.expiresDate }) });
        return { handled: true };
      }
      case 'DID_CHANGE_RENEWAL_STATUS': {
        if (row.status === FINAL) return { handled: true, duplicate: true };
        const off = n.subtype === 'AUTO_RENEW_DISABLED';
        if (!off && n.subtype !== 'AUTO_RENEW_ENABLED') return { handled: false };
        const status = off ? (row.status === 'ACTIVE' ? 'CANCELLING' : row.status) : row.status === 'CANCELLING' ? 'ACTIVE' : row.status;
        if (status === row.status && row.cancelAtPeriodEnd === off) return { handled: true, duplicate: true };
        await this.repo.update(row.id, { cancelAtPeriodEnd: off, status });
        return { handled: true };
      }
      case 'DID_CHANGE_RENEWAL_PREF': {
        if (row.status === FINAL) return { handled: true, duplicate: true };
        // The notification names the product chosen for the next renewal.
        const chosen = n.renewalProductId ? this.planOfProduct(course, n.renewalProductId) : null;
        if (!chosen) return { handled: false }; // without the chosen product there is nothing safe to store
        const pendingPlan = chosen === row.plan ? null : chosen;
        if (pendingPlan === row.pendingPlan) return { handled: true, duplicate: true };
        await this.repo.update(row.id, { pendingPlan });
        return { handled: true };
      }
      case 'REFUND':
      case 'REVOKE':
        return this.onAppleRefund(row, course, tx);
      default:
        return { handled: false };
    }
  }

  /**
   * Records a paid Apple period (verify, SUBSCRIBED or DID_RENEW). The payment is the idempotency key: a replay changes nothing
   * but may still repair a row the first delivery did not finish.
   */
  private async applyAppleTransaction(row: SubscriptionRow, course: SubscribableCourse, tx: AppleTransaction, source: 'verify' | 'notification') {
    const expires = tx.expiresDate!;
    // A transaction Apple already refunded or revoked must never bring a plan back.
    if ((await this.repo.paymentByProviderId(tx.transactionId))?.status === 'REFUNDED') return { row, applied: false, duplicate: true };

    const productPlan = this.planOfProduct(course, tx.productId) ?? row.plan;
    // An ended plan comes back only through a fresh purchase, and only when the learner has no other plan for the course.
    if (row.status === FINAL) {
      const others = (await this.repo.forUserCourse(row.userId, row.courseId)).filter((r) => r.id !== row.id && r.status !== FINAL);
      if (others.length) {
        // Money was taken for a plan that cannot run: keep the record (idempotently) and flag it for a manual refund.
        const stray = await this.recordApplePayment(row, course, tx, productPlan, undefined, { reviewNote: 'MANUAL_REFUND_NEEDED' });
        if (stray.created) this.log(`manual refund needed: Apple payment on an expired row (subscription ${row.id}, transaction ${tx.transactionId})`, null);
        return { row, applied: false, duplicate: !stray.created };
      }
      if (expires.getTime() <= this.clock.now().getTime()) return { row, applied: false, duplicate: true };
    }

    const total = this.appleTotalFils(tx, course, productPlan, row);
    const payment = await this.recordApplePayment(row, course, tx, productPlan, total);

    const current = !row.currentPeriodEnd || expires.getTime() > row.currentPeriodEnd.getTime();
    // A replay of an old transaction must not undo a later PAST_DUE or roll the period back.
    const proves = current;
    const promoted = row.status === 'INCOMPLETE' || row.status === 'PAST_DUE' || row.status === FINAL;
    const status = proves && promoted ? (row.cancelAtPeriodEnd ? 'CANCELLING' : 'ACTIVE') : row.status;
    // The product Apple charged is the plan. A late older renewal records its payment but leaves the plan alone.
    const price = productPlan === 'YEARLY' ? course.yearlyPriceFils : course.monthlyPriceFils;
    const patch = {
      status,
      // An INCOMPLETE row takes the id of the purchase made for it (a different Apple ID gives a different one).
      ...((!row.appleOriginalTransactionId || (row.status === 'INCOMPLETE' && row.appleOriginalTransactionId !== tx.originalTransactionId)) && { appleOriginalTransactionId: tx.originalTransactionId }),
      ...(current && { currentPeriodEnd: expires }),
      ...(payment.created && current && {
        plan: productPlan,
        priceFils: productPlan === row.plan ? row.priceFils : (price ?? row.priceFils),
        ...(row.pendingPlan === productPlan && { pendingPlan: null }),
      }),
    };
    let updated: SubscriptionRow;
    try {
      updated = await this.repo.update(row.id, patch);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      this.log(`apple ${source}: transaction ${tx.transactionId} cannot be applied to subscription ${row.id}`, e);
      return { row, applied: false, duplicate: false };
    }
    await this.announceIfActivated(row, updated);
    if (!payment.created) return { row: updated, applied: true, duplicate: true };

    try {
      await this.payouts.accrueForSubscriptionPayment(payment.id);
    } catch (e) {
      this.log(`accrueForSubscriptionPayment(${payment.id}) failed`, e);
    }
    await this.sendReceipt(updated, course, total, tx.transactionId, expires);
    return { row: updated, applied: true, duplicate: false };
  }

  /** What Apple charged in AED when it says so (milliunits: 924000 = AED 924.00); else the course price of the plan, VAT included. */
  private appleTotalFils(tx: AppleTransaction, course: SubscribableCourse, plan: SubscriptionPlan, row: SubscriptionRow) {
    if (tx.currency === 'AED' && tx.priceMilliunits !== null) return Math.round(tx.priceMilliunits / 10);
    const price = plan === 'YEARLY' ? course.yearlyPriceFils : course.monthlyPriceFils;
    if (price == null) this.log(`apple transaction ${tx.transactionId}: course ${course.id} has no ${plan} price, using the price locked on subscription ${row.id}`, null);
    const total = this.prices.inclusive(price ?? row.priceFils);
    if (total <= 0) this.log(`apple transaction ${tx.transactionId}: recording a 0-fils payment for subscription ${row.id}`, null);
    return total;
  }

  private async recordApplePayment(row: SubscriptionRow, course: SubscribableCourse, tx: AppleTransaction, plan: SubscriptionPlan, total = this.appleTotalFils(tx, course, plan, row), extra: Partial<Pick<NewSubscriptionPayment, 'status' | 'refundedFils' | 'reviewNote'>> = {}) {
    return this.repo.upsertPayment({
      subscriptionId: row.id,
      userId: row.userId,
      reference: await this.newReference(),
      providerPaymentId: tx.transactionId,
      plan,
      periodStart: tx.purchaseDate ?? this.clock.now(),
      periodEnd: tx.expiresDate ?? this.clock.now(),
      ...this.prices.splitInclusive(total),
      totalFils: total,
      feeFils: 0, // Apple's commission is not recorded (as with seat purchases)
      status: 'PAID',
      paidAt: this.clock.now(),
      ...extra,
    });
  }

  /**
   * REFUND / REVOKE: the payment is REFUNDED in full and its earning reversed. The plan ends only when the refunded transaction
   * is the current period (an older renewal's refund leaves a later paid period running). A refund that arrives before we ever
   * recorded the payment stores it as an already REFUNDED payment (a tombstone keyed by the transaction id), so a later verify of
   * that same transaction finds it and cannot bring the plan back.
   */
  private async onAppleRefund(row: SubscriptionRow, course: SubscribableCourse, tx: AppleTransaction) {
    const payment = await this.repo.paymentByProviderId(tx.transactionId);
    if (payment?.status === 'REFUNDED') return { handled: true, duplicate: true };
    const periodEnd = payment?.periodEnd ?? tx.expiresDate ?? null;
    const older = !!periodEnd && !!row.currentPeriodEnd && periodEnd.getTime() < row.currentPeriodEnd.getTime();

    let refunded = payment;
    if (payment) {
      await this.repo.refundPayment(payment.id, payment.totalFils);
    } else {
      const plan = this.planOfProduct(course, tx.productId) ?? row.plan;
      const total = this.appleTotalFils(tx, course, plan, row);
      await this.recordApplePayment(row, course, tx, plan, total, { status: 'REFUNDED', refundedFils: total });
      refunded = null; // nothing was ever earned for it
    }
    if (!older && row.status !== FINAL) await this.repo.update(row.id, { status: FINAL, pendingPlan: null });
    if (refunded) {
      try {
        await this.payouts.reverseSubscriptionPayment?.(refunded.id, refunded.totalFils);
      } catch (e) {
        this.log(`reverseSubscriptionPayment(${refunded.id}) failed`, e);
      }
    }
    return { handled: true };
  }

  private planOfProduct(course: Pick<SubscribableCourse, 'appleMonthlyProductId' | 'appleYearlyProductId'>, productId: string): SubscriptionPlan | null {
    if (productId === course.appleYearlyProductId) return 'YEARLY';
    if (productId === course.appleMonthlyProductId) return 'MONTHLY';
    return null;
  }

  /** The hosted Checkout page for a row. Arguments depend only on the row, so a repeat call returns the same Session. */
  private startCheckout(row: SubscriptionRow, email: string, courseId: string, priceId: string) {
    const ref = encodeURIComponent(row.id);
    return this.gateway.createSubscriptionCheckout({
      priceId,
      customerEmail: email,
      reference: row.id,
      metadata: { subscriptionRef: row.id, userId: row.userId, courseId, plan: row.plan },
      successUrl: `${this.webUrl}/learn/recorded/return?ref=${ref}`,
      cancelUrl: `${this.webUrl}/learn/recorded/return?ref=${ref}&cancelled=1`,
      expiresAt: new Date(row.createdAt.getTime() + CHECKOUT_LIFETIME_MS),
    });
  }

  /** `GET /subscriptions/by-reference/:ref` — what the return page polls. The reference is the row id; only its owner can read it. */
  async byReference(reference: string, userId: string) {
    const row = await this.repo.findById(reference);
    if (!row || row.userId !== userId) throw new NotFoundError('Subscription');
    const course = await this.repo.courseOf(row.courseId);
    if (!course) throw new NotFoundError('Subscription');
    // After a switch to card the polled row is the closed transfer row; the card row that replaced it tells the story.
    const successor = row.provider === 'BANK_TRANSFER' && row.status === FINAL ? pickSubscription(await this.repo.forUserCourse(userId, row.courseId)) : null;
    return { status: successor?.status ?? row.status, courseSlug: course.slug, nextLessonId: await this.repo.nextLessonId(row.courseId, userId) };
  }

  /** `GET /me/subscriptions` — `{ items }`, like the other /me lists. */
  async mine(userId: string) {
    const rows = await this.repo.listForUser(userId);
    const now = this.clock.now();
    // The row that decides a course's access is the one `pickSubscription` prefers, as on the lesson routes.
    const deciding = new Map<string, string | undefined>();
    for (const courseId of new Set(rows.map((r) => r.courseId))) {
      deciding.set(courseId, pickSubscription(rows.filter((r) => r.courseId === courseId))?.id);
    }
    const transferIds = rows.filter((r) => r.provider === 'BANK_TRANSFER').map((r) => r.id);
    const payments = this.transfers && transferIds.length ? await this.transfers.repo.transferPaymentsOf(transferIds) : [];
    const accounts = new Map<string, BankAccountRecord | null>();
    for (const id of new Set(payments.map((p) => p.bankAccountId).filter((x): x is string => !!x))) {
      accounts.set(id, await this.transfers!.bankAccounts.findBankAccount(id));
    }
    const items = rows.map((r) => {
      const own = payments.filter((p) => p.subscriptionId === r.id); // newest first
      const pending = r.provider === 'BANK_TRANSFER' && r.status === 'ACTIVE' && hasPendingRenewalReceipt(r, own);
      // The newest transfer still in play; a rejection counts only until the next payment is made.
      const lastPaid = own.find((p) => p.status === 'PAID');
      const open = own.find((p) => p.status === 'AWAITING_RECEIPT' || p.status === 'AWAITING_REVIEW' || (p.status === 'REJECTED' && (!lastPaid || p.createdAt > lastPaid.createdAt)));
      return {
        id: r.id,
        course: { id: r.course.id, slug: r.course.slug, titleEn: r.course.titleEn, titleAr: r.course.titleAr, coverImageUrl: r.course.coverImageUrl },
        plan: r.plan,
        provider: r.provider,
        status: r.status,
        currentPeriodEnd: r.currentPeriodEnd,
        cancelAtPeriodEnd: r.cancelAtPeriodEnd,
        priceFils: r.priceFils,
        hasAccess: deciding.get(r.courseId) === r.id && canAccessRecorded(r, now, pending),
        pendingPayment: open
          ? {
              id: open.id,
              reference: open.reference,
              amountFils: open.totalFils,
              status: open.status,
              expiresAt: open.expiresAt,
              reviewNote: open.reviewNote,
              bankAccount: (open.bankAccountId && accounts.get(open.bankAccountId)) || null,
            }
          : null,
      };
    });
    return { items };
  }

  /** `POST /subscriptions/:id/cancel` — keeps access to the end of the paid period. */
  async cancel(id: string, userId: string) {
    const sub = await this.ownedCardPlan(id, userId);
    if (sub.cancelAtPeriodEnd) return this.summary(sub);
    this.assertLive(sub, ['ACTIVE', 'PAST_DUE']);
    await this.gateway.setCancelAtPeriodEnd(sub.providerSubscriptionId!, true);
    return this.summary(await this.repo.update(sub.id, { cancelAtPeriodEnd: true, ...(sub.status === 'ACTIVE' && { status: 'CANCELLING' as const }) }));
  }

  /** `POST /subscriptions/:id/resume` — undoes a cancel before the period ends. */
  async resume(id: string, userId: string) {
    const sub = await this.ownedCardPlan(id, userId);
    if (!sub.cancelAtPeriodEnd) return this.summary(sub);
    this.assertLive(sub, ['CANCELLING', 'PAST_DUE']);
    await this.gateway.setCancelAtPeriodEnd(sub.providerSubscriptionId!, false);
    return this.summary(await this.repo.update(sub.id, { cancelAtPeriodEnd: false, ...(sub.status === 'CANCELLING' && { status: 'ACTIVE' as const }) }));
  }

  /** `POST /subscriptions/:id/switch` — to the other plan, prorated by Stripe. */
  async switchPlan(id: string, userId: string, input: { plan: SubscriptionPlan }) {
    const sub = await this.ownedCardPlan(id, userId);
    this.assertLive(sub, ['ACTIVE', 'CANCELLING']);
    if (sub.plan === input.plan) throw new BusinessRuleError('You are already on this plan', 'SAME_PLAN');
    const course = await this.repo.courseOf(sub.courseId);
    const priceId = input.plan === 'YEARLY' ? course?.stripeYearlyPriceId : course?.stripeMonthlyPriceId;
    const priceFils = input.plan === 'YEARLY' ? course?.yearlyPriceFils : course?.monthlyPriceFils;
    if (!priceId || priceFils == null) throw new BusinessRuleError('That plan is not available', 'PRICE_NOT_READY');
    // Stripe resets the billing anchor on a switch, so the new period end can be earlier than the old one.
    const { currentPeriodEnd } = await this.gateway.switchPlan(sub.providerSubscriptionId!, priceId);
    return this.summary(await this.repo.update(sub.id, { plan: input.plan, priceFils, currentPeriodEnd }));
  }

  /** `POST /subscriptions/:id/portal` — Stripe's Customer Portal (card, invoices). */
  async portal(id: string, userId: string) {
    const sub = await this.owned(id, userId);
    if (sub.provider === 'APPLE') throw MANAGED_BY_APPLE();
    if (sub.provider !== 'STRIPE' || !sub.stripeCustomerId) throw new BusinessRuleError('This plan is not paid by card', 'NOT_CARD_PLAN');
    return { url: await this.gateway.customerPortalUrl(sub.stripeCustomerId, `${this.webUrl}/plans`) };
  }

  // ───────── Stripe webhook ─────────

  /** Called when the order checkout did not claim the event. Idempotent: replays are no-ops. */
  async handleStripeEvent(evt: PaymentWebhookEvent): Promise<{ handled: boolean; duplicate?: boolean }> {
    switch (evt.type) {
      case 'subscription.updated':
        return evt.subscription ? this.onSubscriptionUpdated(evt.subscription) : { handled: false };
      case 'invoice.paid':
        return evt.invoice ? this.onInvoicePaid(evt.invoice) : { handled: false };
      case 'invoice.failed':
        return evt.invoice ? this.onInvoiceFailed(evt.invoice) : { handled: false };
      case 'refund.succeeded':
        return this.onChargeRefunded(evt);
      default:
        return { handled: false };
    }
  }

  private async onSubscriptionUpdated(s: WebhookSubscription) {
    const row = await this.rowFor(s.id, s.metadata);
    if (!row) return { handled: false };
    const next = mapStripeStatus(s);
    const periodEnd = new Date(s.currentPeriodEnd);
    if (row.status === FINAL) {
      // A running Stripe subscription for a period the ended row never covered (a checkout paid after the row was closed)
      // would keep billing for a plan that gives no access: stop it.
      if (s.status === 'active' && this.isStrayOnEnded(row, periodEnd)) await this.cancelStray(s.id, [row.id], 'ended-row');
      return { handled: true, duplicate: true };
    }

    // A delayed snapshot from an earlier period must not roll the plan back; only the end of the plan may. A fresh read is
    // current by definition (a plan switch legitimately moves the period end earlier).
    const stale = !s.fresh && next !== 'EXPIRED' && row.currentPeriodEnd !== null && periodEnd.getTime() < row.currentPeriodEnd.getTime();
    if (stale) {
      if (!row.providerSubscriptionId) await this.repo.update(row.id, { providerSubscriptionId: s.id, stripeCustomerId: s.customerId });
      return { handled: true, duplicate: true };
    }
    // `incomplete` can be delivered after the plan is already running; it must not take access away.
    const status = next === 'INCOMPLETE' && row.status !== 'INCOMPLETE' ? row.status : next;
    const course = await this.repo.courseOf(row.courseId);
    const plan = this.planOfPrice(course, s.priceId);
    const updated = await this.repo.update(row.id, {
      status,
      providerSubscriptionId: row.providerSubscriptionId ?? s.id,
      stripeCustomerId: s.customerId,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      ...(plan && plan !== row.plan && { plan }),
    });
    await this.announceIfActivated(row, updated);
    return { handled: true };
  }

  private async onInvoicePaid(inv: WebhookInvoice) {
    const row = await this.rowFor(inv.subscriptionId, inv.metadata);
    if (!row) return { handled: false };

    const course = await this.repo.courseOf(row.courseId);
    const periodStart = new Date(inv.periodStart);
    const periodEnd = new Date(inv.periodEnd);
    // Charged for a plan that has already ended (a checkout paid after the row was closed): keep the record for a manual
    // refund, stop the Stripe subscription, and neither accrue nor send the "you're covered" receipt.
    const stray = row.status === FINAL && this.isStrayOnEnded(row, periodEnd);
    let payment: { id: string; created: boolean } | null = null;
    if (inv.amountPaidFils > 0) {
      payment = await this.repo.upsertPayment({
        subscriptionId: row.id,
        userId: row.userId,
        reference: await this.newReference(),
        providerPaymentId: inv.id,
        plan: row.plan, // kept in step with the Price by subscription.updated and by switchPlan
        periodStart,
        periodEnd,
        // Prices are VAT-inclusive, so the VAT is carved out with our own rule rather than read from Stripe.
        ...this.prices.splitInclusive(inv.amountPaidFils),
        totalFils: inv.amountPaidFils,
        feeFils: inv.feeFils,
        status: 'PAID',
        paidAt: this.clock.now(),
        ...(stray && { reviewNote: 'MANUAL_REFUND_NEEDED' }),
      });
    }
    if (stray) {
      if (!row.providerSubscriptionId && inv.subscriptionId) await this.repo.update(row.id, { providerSubscriptionId: inv.subscriptionId });
      if (payment?.created || !payment) {
        this.log(`URGENT: manual refund needed: Stripe invoice ${inv.id} (${inv.amountPaidFils} fils) was paid on ended subscription ${row.id}`, null);
        await this.cancelStray(inv.subscriptionId, [row.id], 'ended-row');
      }
      return { handled: true, ...(payment && !payment.created && { duplicate: true }) };
    }

    if (row.status !== FINAL) {
      // A paid invoice proves the plan runs, but a replay of an old one must not undo a later PAST_DUE: promote only for a
      // new payment, for one that reaches at least the current period, or for the $0 invoice that opens a trial.
      const current = !row.currentPeriodEnd || periodEnd.getTime() >= row.currentPeriodEnd.getTime();
      const proves = payment ? payment.created || current : inv.billingReason === 'subscription_create' && current;
      const promote = proves && (row.status === 'INCOMPLETE' || row.status === 'PAST_DUE');
      const patch = {
        ...(promote && { status: row.cancelAtPeriodEnd ? ('CANCELLING' as const) : ('ACTIVE' as const) }),
        ...(!row.providerSubscriptionId && inv.subscriptionId && { providerSubscriptionId: inv.subscriptionId }),
        // The subscription event is authoritative for the period; this only covers the case where it has not arrived yet.
        ...(!row.currentPeriodEnd && { currentPeriodEnd: periodEnd }),
      };
      if (Object.keys(patch).length) await this.announceIfActivated(row, await this.repo.update(row.id, patch));
    } else if (!row.providerSubscriptionId && inv.subscriptionId) {
      await this.repo.update(row.id, { providerSubscriptionId: inv.subscriptionId });
    }
    if (!payment) return { handled: true }; // trial: nothing was charged, so no payment and no earning
    if (!payment.created) return { handled: true, duplicate: true };

    try {
      await this.payouts.accrueForSubscriptionPayment(payment.id);
    } catch (e) {
      // Earnings can be rebuilt from the payment; a payout problem must never fail (and so retry) the webhook.
      this.log(`accrueForSubscriptionPayment(${payment.id}) failed`, e);
    }
    await this.sendReceipt(row, course, inv.amountPaidFils, inv.id, periodEnd);
    return { handled: true };
  }

  /** One notice per invoice id, remembered in the user's notifications (so it survives restarts and several instances). */
  private async onInvoiceFailed(inv: WebhookInvoice) {
    const row = await this.rowFor(inv.subscriptionId, inv.metadata);
    if (!row) return { handled: false };
    if (await this.repo.failureNoticeSent(row.userId, inv.id)) return { handled: true, duplicate: true };
    const user = await this.repo.findUser(row.userId);
    const course = await this.repo.courseOf(row.courseId);
    const ar = user?.locale === 'ar';
    const learnUrl = `${this.webUrl}/plans`;
    const email = appEmails.subscriptionPaymentFailed(user?.name ?? '', course?.titleEn ?? '', learnUrl);
    await this.notifier.notify([row.userId], {
      type: 'SUBSCRIPTION_PAYMENT_FAILED',
      title: ar ? 'تعذّرت عملية الدفع' : "Your payment didn't go through",
      body: ar ? 'لم تتم آخر عملية دفع. حدّث بطاقتك لتواصل التعلّم.' : "Your last payment didn't go through. Update your card to keep learning.",
      data: { subscriptionId: row.id, invoiceId: inv.id, ...(course && { courseSlug: course.slug }) },
      email: () => email,
    });
    return { handled: true };
  }

  // ───────── helpers ─────────

  /** By the Stripe id, falling back to the `subscriptionRef` we put in the metadata. */
  private async rowFor(stripeId: string | null, metadata: Record<string, string> | undefined) {
    const byStripe = stripeId ? await this.repo.findByProviderSubscriptionId(stripeId) : null;
    if (byStripe) return byStripe;
    const ref = metadata?.subscriptionRef;
    const byRef = ref ? await this.repo.findById(ref) : null;
    // A card checkout started from a transfer plan names the transfer row as its `subscriptionRef`; that row is not the card's.
    const transferId = metadata?.replacesSubscriptionId ?? (byRef?.provider === 'BANK_TRANSFER' ? byRef.id : undefined);
    if (transferId) return this.takeOverFromTransfer(transferId, metadata ?? {}, stripeId);
    // A row already tied to another Stripe subscription is not this event's.
    return byRef && (!byRef.providerSubscriptionId || byRef.providerSubscriptionId === stripeId) ? byRef : null;
  }

  /** An ended card row hearing about a period it never covered: the Stripe subscription is not one the row paid into. */
  private isStrayOnEnded(row: SubscriptionRow, periodEnd: Date) {
    return row.provider === 'STRIPE' && (!row.currentPeriodEnd || periodEnd.getTime() > row.currentPeriodEnd.getTime());
  }

  private planOfPrice(course: SubscribableCourse | null, priceId: string): SubscriptionPlan | null {
    if (course && priceId === course.stripeYearlyPriceId) return 'YEARLY';
    if (course && priceId === course.stripeMonthlyPriceId) return 'MONTHLY';
    return null;
  }

  private async announceIfActivated(before: SubscriptionRow, after: SubscriptionRow) {
    if (before.status !== 'INCOMPLETE' || after.status === 'INCOMPLETE' || after.status === FINAL) return;
    const [user, course] = await Promise.all([this.repo.findUser(after.userId), this.repo.courseOf(after.courseId)]);
    const ar = user?.locale === 'ar';
    const title = course ? (ar ? (course.titleAr ?? course.titleEn) : course.titleEn) : '';
    await this.notifier.notify([after.userId], {
      type: 'SUBSCRIPTION_ACTIVE',
      title: ar ? `أهلًا بك في ${title}` : `You're in · ${title}`,
      body: ar ? 'ابدأ متى شئت، وتعلّم على راحتك.' : 'Start any time. Learn at your pace.',
      data: { subscriptionId: after.id, ...(course && { courseSlug: course.slug }) },
    });
  }

  private async sendReceipt(row: SubscriptionRow, course: SubscribableCourse | null, amountFils: number, paymentRef: string, periodEnd: Date) {
    const user = await this.repo.findUser(row.userId);
    const amount = formatMoney(filsToAed(amountFils), 'AED');
    const until = periodEnd.toISOString().slice(0, 10);
    const email = appEmails.subscriptionReceipt(user?.name ?? '', course?.titleEn ?? '', amount, until, `${this.webUrl}/plans`);
    const ar = user?.locale === 'ar';
    const name = (ar ? course?.titleAr : null) ?? course?.titleEn;
    const notice: Notice = {
      type: 'SUBSCRIPTION_RECEIPT',
      title: ar ? `إيصال · ${name ?? 'اشتراكك'}` : `Receipt · ${name ?? 'Your plan'}`,
      body: ar ? `استلمنا ${amount}. وصولك مضمون حتى ${until}.` : `${amount} received. You're covered until ${until}.`,
      data: { subscriptionId: row.id, invoiceId: paymentRef },
      email: () => email,
    };
    await this.notifier.notify([row.userId], notice, { channels: ['in-app', 'email'] });
  }

  private async newReference() {
    for (let i = 0; i < 10; i++) {
      const ref = this.references.next('REC');
      if (!(await this.repo.paymentReferenceTaken(ref))) return ref;
    }
    throw new AppError('Could not allocate a payment reference', 500, 'REFERENCE');
  }

  private async owned(id: string, userId: string) {
    const sub = await this.repo.findById(id);
    if (!sub || sub.userId !== userId) throw new NotFoundError('Subscription', id);
    return sub;
  }

  /** The caller's own card plan: Apple plans are managed in the App Store, transfers do not renew. */
  private async ownedCardPlan(id: string, userId: string) {
    const sub = await this.owned(id, userId);
    if (sub.provider === 'APPLE') throw MANAGED_BY_APPLE();
    if (sub.provider !== 'STRIPE') throw new BusinessRuleError('This plan is not paid by card', 'NOT_CARD_PLAN');
    return sub;
  }

  private assertLive(sub: SubscriptionRow, allowed: SubscriptionStatus[]) {
    if (!sub.providerSubscriptionId || !allowed.includes(sub.status)) throw new BusinessRuleError('This plan is not active', 'NOT_ACTIVE');
  }

  private summary(s: SubscriptionRow) {
    return { id: s.id, plan: s.plan, status: s.status, currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd, priceFils: s.priceFils };
  }
}
