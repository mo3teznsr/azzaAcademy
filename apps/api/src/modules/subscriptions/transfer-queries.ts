import type { OrderStatus, SubscriptionPaymentStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

/** The inbox speaks the seat-order vocabulary, so one review panel serves both kinds. */
const INBOX_STATUS: Record<SubscriptionPaymentStatus, OrderStatus> = {
  AWAITING_RECEIPT: 'AWAITING_RECEIPT',
  AWAITING_REVIEW: 'VERIFYING',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
};
export const inboxStatus = (status: SubscriptionPaymentStatus): OrderStatus => INBOX_STATUS[status];

/** Order statuses an inbox filter can ask for → the payment statuses they cover. */
export function paymentStatusesFor(statuses: OrderStatus[]): SubscriptionPaymentStatus[] {
  return (Object.keys(INBOX_STATUS) as SubscriptionPaymentStatus[]).filter((p) => statuses.includes(INBOX_STATUS[p]));
}

const listInclude = {
  user: { select: { id: true, name: true, email: true } },
  bankAccount: { select: { id: true, bankName: true, iban: true } },
  reviewedBy: { select: { id: true, name: true } },
  subscription: { select: { id: true, course: { select: { id: true, slug: true, titleEn: true, titleAr: true } } } },
} as const;

interface InboxRow {
  id: string;
  reference: string;
  plan: string;
  status: SubscriptionPaymentStatus;
  subtotalFils: number;
  vatFils: number;
  totalFils: number;
  refundedFils: number;
  displayCurrency: string;
  fxRate: { toNumber(): number };
  paidAt: Date | null;
  receiptUrl: string | null;
  expiresAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; email: string };
  bankAccount: { id: string; bankName: string; iban: string } | null;
  reviewedBy: { id: string; name: string } | null;
  subscription: { id: string; course: { id: string; slug: string; titleEn: string; titleAr: string | null } };
}

/** A subscription payment shaped like a seat order so the inbox renders both, plus `kind`, `course` and `plan`. */
export function toInboxItem(p: InboxRow) {
  return {
    kind: 'SUBSCRIPTION' as const,
    id: p.id,
    reference: p.reference,
    method: 'BANK_TRANSFER' as const,
    status: inboxStatus(p.status),
    paymentStatus: p.status,
    plan: p.plan,
    course: { id: p.subscription.course.id, slug: p.subscription.course.slug, titleEn: p.subscription.course.titleEn, titleAr: p.subscription.course.titleAr },
    subscriptionId: p.subscription.id,
    subtotalFils: p.subtotalFils,
    vatFils: p.vatFils,
    totalFils: p.totalFils,
    refundedFils: p.refundedFils,
    displayCurrency: p.displayCurrency,
    fxRate: p.fxRate.toNumber(),
    receiptUrl: p.receiptUrl,
    receiptUploadedAt: p.receiptUrl ? p.updatedAt : null,
    expiresAt: p.expiresAt,
    rejectionReason: p.reviewNote,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
    user: p.user,
    bankAccount: p.bankAccount,
    verifiedBy: p.reviewedBy,
  };
}

/** Read model: plan payments by bank transfer, for the admin transfers inbox. */
export class SubscriptionTransferQueries {
  constructor(private readonly db: Db) {}

  async list(f: { statuses?: OrderStatus[]; q?: string; skip: number; take: number }) {
    const statuses = f.statuses && paymentStatusesFor(f.statuses);
    const where = {
      subscription: { provider: 'BANK_TRANSFER' as const },
      ...(statuses && { status: { in: statuses } }),
      ...(f.q && {
        OR: [
          { reference: { contains: f.q, mode: 'insensitive' as const } },
          { user: { name: { contains: f.q, mode: 'insensitive' as const } } },
          { user: { email: { contains: f.q, mode: 'insensitive' as const } } },
        ],
      }),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.subscriptionPayment.findMany({ where, include: listInclude, orderBy: [{ updatedAt: 'asc' }], skip: f.skip, take: f.take }),
      this.db.subscriptionPayment.count({ where }),
    ]);
    return { items: rows.map(toInboxItem), total };
  }
}
