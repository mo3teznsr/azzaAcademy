import type { CourseStatus, CourseType, SubscriptionPaymentStatus, SubscriptionPlan, SubscriptionProvider, SubscriptionStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

/** What the service needs to sell a plan of a recorded course. */
export interface SubscribableCourse {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  coverImageUrl: string | null;
  type: CourseType;
  status: CourseStatus;
  monthlyPriceFils: number | null;
  yearlyPriceFils: number | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  appleMonthlyProductId: string | null;
  appleYearlyProductId: string | null;
}

export interface SubscriptionUser {
  id: string;
  name: string;
  email: string;
  locale: string;
  timezone?: string;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  courseId: string;
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  providerSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripeCheckoutSessionId: string | null;
  appleOriginalTransactionId: string | null;
  appleAppAccountToken: string | null;
  /** Apple: the plan chosen for the next renewal. */
  pendingPlan: SubscriptionPlan | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  priceFils: number;
  createdAt: Date;
  /** Touched by every write: for an INCOMPLETE Apple row, when its checkout was last started or refreshed. */
  updatedAt: Date;
}

export type SubscriptionPatch = Partial<
  Pick<SubscriptionRow, 'plan' | 'status' | 'providerSubscriptionId' | 'stripeCustomerId' | 'stripeCheckoutSessionId' | 'appleOriginalTransactionId' | 'appleAppAccountToken' | 'pendingPlan' | 'currentPeriodEnd' | 'cancelAtPeriodEnd' | 'priceFils'>
>;

export interface NewSubscription {
  userId: string;
  courseId: string;
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  priceFils: number;
  appleAppAccountToken?: string;
}

export interface NewSubscriptionPayment {
  subscriptionId: string;
  userId: string;
  reference: string;
  providerPaymentId: string;
  plan: SubscriptionPlan;
  periodStart: Date;
  periodEnd: Date;
  subtotalFils: number;
  vatFils: number;
  totalFils: number;
  feeFils: number;
  status: SubscriptionPaymentStatus;
  paidAt: Date;
  refundedFils?: number;
  /** Flags a payment for finance (e.g. MANUAL_REFUND_NEEDED). */
  reviewNote?: string;
}

export interface SubscriptionPaymentRow {
  id: string;
  subscriptionId: string;
  status: SubscriptionPaymentStatus;
  totalFils: number;
  refundedFils: number;
  periodEnd: Date;
}

/** Persistence port for subscriptions: services never see Prisma. */
export interface SubscriptionRepository {
  findCourse(idOrSlug: string): Promise<SubscribableCourse | null>;
  findUser(id: string): Promise<SubscriptionUser | null>;
  /** Every subscription of the user to the course, expired ones included. */
  forUserCourse(userId: string, courseId: string): Promise<SubscriptionRow[]>;
  /** Throws the database's unique violation (`code: 'P2002'`) when the user already has a live row for the course. */
  create(data: NewSubscription): Promise<SubscriptionRow>;
  findById(id: string): Promise<SubscriptionRow | null>;
  findByProviderSubscriptionId(id: string): Promise<SubscriptionRow | null>;
  update(id: string, patch: SubscriptionPatch): Promise<SubscriptionRow>;
  /** The user's subscriptions with their course, newest first. */
  listForUser(userId: string): Promise<Array<SubscriptionRow & { course: Pick<SubscribableCourse, 'id' | 'slug' | 'titleEn' | 'titleAr' | 'coverImageUrl'> }>>;
  /** The course of a subscription (for its price ids and slug). */
  courseOf(courseId: string): Promise<SubscribableCourse | null>;
  /** The first lesson in curriculum order the user has not completed; null when there are none or all are done. */
  nextLessonId(courseId: string, userId: string): Promise<string | null>;
  paymentReferenceTaken(reference: string): Promise<boolean>;
  /** Idempotent by `providerPaymentId`: `created` is false when the invoice was already recorded. */
  upsertPayment(data: NewSubscriptionPayment): Promise<{ id: string; created: boolean }>;
  /** The Apple row issued this `appAccountToken` (lower-case UUID). */
  findByAppleToken(token: string): Promise<SubscriptionRow | null>;
  findByAppleOriginalTransactionId(id: string): Promise<SubscriptionRow | null>;
  /** A payment by its provider id (Stripe invoice / Apple transaction). */
  paymentByProviderId(providerPaymentId: string): Promise<SubscriptionPaymentRow | null>;
  /** Records the cumulative amount returned; the payment becomes REFUNDED when `full` (the default), otherwise its status is kept. */
  refundPayment(id: string, refundedFils: number, full?: boolean): Promise<void>;
  /** A SUBSCRIPTION_PAYMENT_FAILED notice for this invoice was already sent to the user. */
  failureNoticeSent(userId: string, invoiceId: string): Promise<boolean>;
}

/** One row of the admin subscriptions list. */
export interface AdminSubscriptionItem {
  id: string;
  user: { id: string; name: string; email: string };
  course: { id: string; slug: string; titleEn: string; titleAr: string | null };
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  priceFils: number;
  lastPayment: { id: string; totalFils: number; status: SubscriptionPaymentStatus; paidAt: Date | null } | null;
  createdAt: Date;
}

/** An ACTIVE plan whose period ends soon, with what the reminder job needs to decide. */
export interface ReminderCandidate {
  id: string;
  userId: string;
  courseId: string;
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  currentPeriodEnd: Date;
  reminderSentForPeriodEnd: Date | null;
  reminderEndDaySentFor: Date | null;
}

/** Read and bookkeeping queries for the admin screens and the reminder job (kept apart from the learner-facing port). */
export interface SubscriptionAdminRepository {
  listForAdmin(f: { courseId?: string; status?: SubscriptionStatus; provider?: SubscriptionProvider; skip: number; take: number }): Promise<{ items: AdminSubscriptionItem[]; total: number }>;
  /** The newest PAID payment of the plan, with the provider's id (the Stripe invoice). */
  lastPaidPayment(subscriptionId: string): Promise<{ id: string; providerPaymentId: string | null; totalFils: number; refundedFils: number } | null>;
  /** The course's author and how many learners hold a plan; null when the course does not exist. */
  subscriberCounts(courseId: string): Promise<{ createdById: string | null; active: number; cancelling: number; pastDue: number } | null>;
  /** ACTIVE plans whose period ends in `(after, until]`. */
  endingBetween(after: Date, until: Date): Promise<ReminderCandidate[]>;
  /** Remembers a reminder for this period end; false when it was already remembered (another run got there first). */
  claimReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date): Promise<boolean>;
  /** Gives a claim back (sending failed): restores `previous` while the field still holds `periodEnd`. */
  releaseReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date, previous: Date | null): Promise<void>;
}

/** A bank-transfer payment of a plan (`SubscriptionPayment` with no provider id). */
export interface TransferPaymentRow {
  id: string;
  subscriptionId: string;
  userId: string;
  reference: string;
  plan: SubscriptionPlan;
  status: SubscriptionPaymentStatus;
  periodStart: Date;
  periodEnd: Date;
  subtotalFils: number;
  vatFils: number;
  totalFils: number;
  refundedFils: number;
  paidAt: Date | null;
  bankAccountId: string | null;
  receiptUrl: string | null;
  expiresAt: Date | null;
  reviewNote: string | null;
  reviewedById: string | null;
  createdAt: Date;
  /** While a payment is AWAITING_REVIEW this is when its receipt was uploaded. */
  updatedAt: Date;
}

export interface NewTransferPayment {
  subscriptionId: string;
  userId: string;
  reference: string;
  plan: SubscriptionPlan;
  /** Placeholders until approval sets the real period. */
  periodStart: Date;
  periodEnd: Date;
  subtotalFils: number;
  vatFils: number;
  totalFils: number;
  bankAccountId: string;
  expiresAt: Date;
}

export type TransferPaymentPatch = Partial<
  Pick<TransferPaymentRow, 'status' | 'receiptUrl' | 'expiresAt' | 'reviewNote' | 'reviewedById' | 'paidAt' | 'periodStart' | 'periodEnd'>
>;

/** Persistence for plans paid by bank transfer. Kept apart from `SubscriptionRepository` so card and Apple code never sees it. */
export interface SubscriptionTransferRepository {
  createTransferPayment(data: NewTransferPayment): Promise<TransferPaymentRow>;
  transferPayment(id: string): Promise<TransferPaymentRow | null>;
  updateTransferPayment(id: string, patch: TransferPaymentPatch): Promise<TransferPaymentRow>;
  /**
   * Atomic review: claims the payment only while it is AWAITING_REVIEW (`patch` is applied to it) and, in the same transaction,
   * applies `sub` to the subscription. Returns null, changing nothing, when another review got there first.
   */
  reviewTransferPayment(id: string, patch: TransferPaymentPatch, sub?: { id: string; patch: SubscriptionPatch }): Promise<TransferPaymentRow | null>;
  /** Expires the subscription's payments that are in one of `statuses` (guarded: a payment that moved on is left alone). Returns what it closed. */
  expireTransferPayments(subscriptionId: string, statuses: SubscriptionPaymentStatus[]): Promise<TransferPaymentRow[]>;
  /** Sets `stripeCheckoutSessionId` to `value` only while it still equals `expected`; false when another call got there first. */
  claimCheckoutSlot(subscriptionId: string, expected: string | null, value: string): Promise<boolean>;
  /** Every payment of the given subscriptions, newest first. */
  transferPaymentsOf(subscriptionIds: string[]): Promise<TransferPaymentRow[]>;
  /** AWAITING_RECEIPT payments whose hold lapsed. */
  staleTransferPayments(now: Date): Promise<TransferPaymentRow[]>;
  /** BANK_TRANSFER rows still ACTIVE (or CANCELLING / PAST_DUE) whose period has ended. */
  endedTransferSubscriptions(now: Date): Promise<SubscriptionRow[]>;
}

const subscriptionSelect = {
  id: true,
  userId: true,
  courseId: true,
  plan: true,
  provider: true,
  status: true,
  providerSubscriptionId: true,
  stripeCustomerId: true,
  stripeCheckoutSessionId: true,
  appleOriginalTransactionId: true,
  appleAppAccountToken: true,
  pendingPlan: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  priceFils: true,
  createdAt: true,
  updatedAt: true,
} as const;

const courseSelect = {
  id: true,
  slug: true,
  titleEn: true,
  titleAr: true,
  coverImageUrl: true,
  type: true,
  status: true,
  monthlyPriceFils: true,
  yearlyPriceFils: true,
  stripeMonthlyPriceId: true,
  stripeYearlyPriceId: true,
  appleMonthlyProductId: true,
  appleYearlyProductId: true,
} as const;

const transferSelect = {
  id: true, subscriptionId: true, userId: true, reference: true, plan: true, status: true, periodStart: true, periodEnd: true,
  subtotalFils: true, vatFils: true, totalFils: true, refundedFils: true, paidAt: true, bankAccountId: true, receiptUrl: true,
  expiresAt: true, reviewNote: true, reviewedById: true, createdAt: true, updatedAt: true,
} as const;

export class PrismaSubscriptionRepository implements SubscriptionRepository, SubscriptionTransferRepository, SubscriptionAdminRepository {
  constructor(private readonly db: Db) {}

  findCourse(idOrSlug: string) {
    return this.db.course.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: courseSelect });
  }

  courseOf(courseId: string) {
    return this.db.course.findUnique({ where: { id: courseId }, select: courseSelect });
  }

  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, locale: true, timezone: true } });
  }

  forUserCourse(userId: string, courseId: string) {
    return this.db.subscription.findMany({ where: { userId, courseId }, select: subscriptionSelect });
  }

  create(data: NewSubscription) {
    return this.db.subscription.create({ data, select: subscriptionSelect });
  }

  findById(id: string) {
    return this.db.subscription.findUnique({ where: { id }, select: subscriptionSelect });
  }

  findByProviderSubscriptionId(id: string) {
    return this.db.subscription.findUnique({ where: { providerSubscriptionId: id }, select: subscriptionSelect });
  }

  update(id: string, patch: SubscriptionPatch) {
    return this.db.subscription.update({ where: { id }, data: patch, select: subscriptionSelect });
  }

  listForUser(userId: string) {
    return this.db.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { ...subscriptionSelect, course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverImageUrl: true } } },
    });
  }

  async nextLessonId(courseId: string, userId: string) {
    const modules = await this.db.courseModule.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { lessons: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], select: { id: true } } },
    });
    const ids = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (!ids.length) return null;
    const done = new Set((await this.db.lessonProgress.findMany({ where: { userId, lessonId: { in: ids } }, select: { lessonId: true } })).map((r) => r.lessonId));
    return ids.find((id) => !done.has(id)) ?? null;
  }

  async paymentReferenceTaken(reference: string) {
    return (await this.db.subscriptionPayment.count({ where: { reference } })) > 0;
  }

  async upsertPayment(data: NewSubscriptionPayment) {
    const existing = await this.db.subscriptionPayment.findUnique({ where: { providerPaymentId: data.providerPaymentId }, select: { id: true } });
    if (existing) return { id: existing.id, created: false };
    try {
      return { id: (await this.db.subscriptionPayment.create({ data, select: { id: true } })).id, created: true };
    } catch (e) {
      // Two deliveries of the same invoice raced: the unique key makes the loser a no-op.
      if ((e as { code?: string }).code !== 'P2002') throw e;
      const row = await this.db.subscriptionPayment.findUnique({ where: { providerPaymentId: data.providerPaymentId }, select: { id: true } });
      if (!row) throw e;
      return { id: row.id, created: false };
    }
  }

  findByAppleToken(token: string) {
    return this.db.subscription.findUnique({ where: { appleAppAccountToken: token }, select: subscriptionSelect });
  }

  findByAppleOriginalTransactionId(id: string) {
    return this.db.subscription.findUnique({ where: { appleOriginalTransactionId: id }, select: subscriptionSelect });
  }

  paymentByProviderId(providerPaymentId: string) {
    return this.db.subscriptionPayment.findUnique({
      where: { providerPaymentId },
      select: { id: true, subscriptionId: true, status: true, totalFils: true, refundedFils: true, periodEnd: true },
    });
  }

  async refundPayment(id: string, refundedFils: number, full = true) {
    await this.db.subscriptionPayment.update({ where: { id }, data: { refundedFils, ...(full && { status: 'REFUNDED' as const }) } });
  }

  async failureNoticeSent(userId: string, invoiceId: string) {
    const count = await this.db.notification.count({
      where: { userId, type: 'SUBSCRIPTION_PAYMENT_FAILED', data: { path: ['invoiceId'], equals: invoiceId } },
    });
    return count > 0;
  }

  createTransferPayment(data: NewTransferPayment) {
    return this.db.subscriptionPayment.create({ data: { ...data, status: 'AWAITING_RECEIPT' }, select: transferSelect });
  }

  transferPayment(id: string) {
    return this.db.subscriptionPayment.findUnique({ where: { id }, select: transferSelect });
  }

  updateTransferPayment(id: string, patch: TransferPaymentPatch) {
    return this.db.subscriptionPayment.update({ where: { id }, data: patch, select: transferSelect });
  }

  transferPaymentsOf(subscriptionIds: string[]) {
    return this.db.subscriptionPayment.findMany({ where: { subscriptionId: { in: subscriptionIds } }, orderBy: { createdAt: 'desc' }, select: transferSelect });
  }

  reviewTransferPayment(id: string, patch: TransferPaymentPatch, sub?: { id: string; patch: SubscriptionPatch }) {
    return this.db.$transaction(async (tx) => {
      const claimed = await tx.subscriptionPayment.updateMany({ where: { id, status: 'AWAITING_REVIEW' }, data: patch });
      if (claimed.count !== 1) return null;
      if (sub) await tx.subscription.update({ where: { id: sub.id }, data: sub.patch });
      return tx.subscriptionPayment.findUniqueOrThrow({ where: { id }, select: transferSelect });
    });
  }

  expireTransferPayments(subscriptionId: string, statuses: SubscriptionPaymentStatus[]) {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.subscriptionPayment.findMany({ where: { subscriptionId, status: { in: statuses } }, select: transferSelect });
      if (rows.length) await tx.subscriptionPayment.updateMany({ where: { id: { in: rows.map((r) => r.id) }, status: { in: statuses } }, data: { status: 'EXPIRED' } });
      return rows;
    });
  }

  async claimCheckoutSlot(subscriptionId: string, expected: string | null, value: string) {
    const r = await this.db.subscription.updateMany({ where: { id: subscriptionId, stripeCheckoutSessionId: expected }, data: { stripeCheckoutSessionId: value } });
    return r.count === 1;
  }

  staleTransferPayments(now: Date) {
    return this.db.subscriptionPayment.findMany({
      where: { status: 'AWAITING_RECEIPT', expiresAt: { lt: now }, subscription: { provider: 'BANK_TRANSFER' } },
      select: transferSelect,
    });
  }

  endedTransferSubscriptions(now: Date) {
    return this.db.subscription.findMany({
      where: { provider: 'BANK_TRANSFER', status: { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] }, currentPeriodEnd: { lte: now } },
      select: subscriptionSelect,
    });
  }
  // ───────── admin and reminders ─────────

  async listForAdmin(f: { courseId?: string; status?: SubscriptionStatus; provider?: SubscriptionProvider; skip: number; take: number }) {
    const where = { ...(f.courseId && { courseId: f.courseId }), ...(f.status && { status: f.status }), ...(f.provider && { provider: f.provider }) };
    const [rows, total] = await this.db.$transaction([
      this.db.subscription.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: f.skip,
        take: f.take,
        select: {
          ...subscriptionSelect,
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, slug: true, titleEn: true, titleAr: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, totalFils: true, status: true, paidAt: true } },
        },
      }),
      this.db.subscription.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        user: r.user,
        course: r.course,
        plan: r.plan,
        provider: r.provider,
        status: r.status,
        currentPeriodEnd: r.currentPeriodEnd,
        cancelAtPeriodEnd: r.cancelAtPeriodEnd,
        priceFils: r.priceFils,
        lastPayment: r.payments[0] ?? null,
        createdAt: r.createdAt,
      })),
      total,
    };
  }

  lastPaidPayment(subscriptionId: string) {
    return this.db.subscriptionPayment.findFirst({
      where: { subscriptionId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, providerPaymentId: true, totalFils: true, refundedFils: true },
    });
  }

  async subscriberCounts(courseId: string) {
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { createdById: true } });
    if (!course) return null;
    const groups = await this.db.subscription.groupBy({ by: ['status'], where: { courseId, status: { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] } }, _count: { _all: true } });
    const n = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
    return { createdById: course.createdById, active: n('ACTIVE'), cancelling: n('CANCELLING'), pastDue: n('PAST_DUE') };
  }

  endingBetween(after: Date, until: Date) {
    return this.db.subscription.findMany({
      where: { status: 'ACTIVE', currentPeriodEnd: { gt: after, lte: until } },
      select: { id: true, userId: true, courseId: true, plan: true, provider: true, currentPeriodEnd: true, reminderSentForPeriodEnd: true, reminderEndDaySentFor: true },
    }) as Promise<ReminderCandidate[]>;
  }

  async releaseReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date, previous: Date | null) {
    const field = kind === 'SOON' ? 'reminderSentForPeriodEnd' : 'reminderEndDaySentFor';
    await this.db.subscription.updateMany({ where: { id, [field]: periodEnd }, data: { [field]: previous } });
  }

  async claimReminder(id: string, kind: 'SOON' | 'END_DAY', periodEnd: Date) {
    const field = kind === 'SOON' ? 'reminderSentForPeriodEnd' : 'reminderEndDaySentFor';
    const r = await this.db.subscription.updateMany({
      where: { id, currentPeriodEnd: periodEnd, OR: [{ [field]: null }, { [field]: { not: periodEnd } }] },
      data: { [field]: periodEnd },
    });
    return r.count === 1;
  }
}
