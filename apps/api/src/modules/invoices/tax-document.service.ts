import type { Clock } from '../../core/ports';
import { ForbiddenError, NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';
import { ALL_ACCESS_TITLE } from '../all-access/all-access-course';
import { creditNoteAmounts, organizationBuyer, seatPackDescription, taxDocumentNumber, vatPercentOf, type TaxBuyer, type TaxDocumentKind } from './tax-document-math';

export interface Supplier {
  legalName: string;
  address: string | null;
  trn: string;
}

interface Source {
  orderId?: string;
  subscriptionPaymentId?: string;
  seatPackId?: string;
  /** Null for an organization's seat pack (the buyer is the organization). */
  userId: string | null;
  buyer: TaxBuyer;
  description: string;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  refundedFils: number;
}

const PLAN_EN = { MONTHLY: 'monthly plan', YEARLY: 'yearly plan' } as const;

/**
 * UAE tax invoices and credit notes. A job issues what is missing: an invoice for every card or bank-transfer payment made
 * since invoicing started (App Store sales are invoiced by Apple, the merchant of record), an invoice to the organization
 * for every seat pack, and a credit note for every
 * refund not credited yet. Nothing is issued until the supplier's TRN is set in the admin settings.
 */
export class TaxDocumentService {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  private async supplier(): Promise<{ supplier: Supplier; from: Date } | null> {
    const s = await this.db.platformSettings.findUnique({
      where: { id: 'default' },
      select: { legalName: true, legalAddress: true, taxRegistrationNumber: true, invoicingFrom: true },
    });
    if (!s?.taxRegistrationNumber || !s.invoicingFrom) return null;
    return { supplier: { legalName: s.legalName ?? 'Azza', address: s.legalAddress, trn: s.taxRegistrationNumber }, from: s.invoicingFrom };
  }

  /** Job: issues missing invoices and credit notes. Safe to rerun: each payment gets one invoice; credit notes follow refunds. */
  async issuePending() {
    const setup = await this.supplier();
    if (!setup) return { invoices: 0, creditNotes: 0, skipped: 'NO_TRN' as const };
    let invoices = 0;
    let creditNotes = 0;
    for (const src of await this.sources(setup.from)) {
      let invoice = await this.db.taxDocument.findFirst({
        where: { kind: 'INVOICE', ...sourceKey(src) },
        include: { creditNotes: { select: { totalFils: true, vatFils: true } } },
      });
      if (!invoice) {
        const issued = await this.issue('INVOICE', setup.supplier, src, {
          subtotalFils: src.subtotalFils,
          discountFils: src.discountFils,
          vatFils: src.vatFils,
          totalFils: src.totalFils,
        });
        invoice = { ...issued, creditNotes: [] };
        invoices++;
      }
      const credited = invoice.creditNotes.reduce((a, c) => ({ totalFils: a.totalFils + c.totalFils, vatFils: a.vatFils + c.vatFils }), { totalFils: 0, vatFils: 0 });
      const owed = Math.min(src.refundedFils, invoice.totalFils) - credited.totalFils;
      if (owed > 0) {
        const amounts = creditNoteAmounts(invoice, credited, owed);
        await this.issue('CREDIT_NOTE', setup.supplier, { ...src, description: `Refund · ${src.description}` }, { ...amounts, discountFils: 0 }, invoice.id);
        creditNotes++;
      }
    }
    return { invoices, creditNotes };
  }

  /** Numbers the document inside the same transaction that writes it, so a series never skips a number. */
  private async issue(kind: TaxDocumentKind, supplier: Supplier, src: Source, money: { subtotalFils: number; discountFils: number; vatFils: number; totalFils: number }, invoiceId?: string) {
    return this.db.$transaction(async (tx) => {
      const counter = await tx.taxDocumentCounter.upsert({ where: { id: kind }, create: { id: kind, last: 1 }, update: { last: { increment: 1 } } });
      const taxable = money.subtotalFils - money.discountFils;
      return tx.taxDocument.create({
        data: {
          kind,
          seq: counter.last,
          number: taxDocumentNumber(kind, counter.last),
          invoiceId: invoiceId ?? null,
          orderId: src.orderId ?? null,
          subscriptionPaymentId: src.subscriptionPaymentId ?? null,
          seatPackId: src.seatPackId ?? null,
          userId: src.userId,
          description: src.description,
          ...money,
          vatPercent: vatPercentOf(kind === 'INVOICE' ? taxable : money.subtotalFils, money.vatFils),
          supplier: { ...supplier },
          buyer: { ...src.buyer },
          issuedAt: this.clock.now(),
        },
      });
    });
  }

  /** Card and bank-transfer payments since invoicing started, with what has been refunded on each. */
  private async sources(from: Date): Promise<Source[]> {
    const [orders, payments, packs] = await Promise.all([
      this.db.order.findMany({
        where: { status: { in: ['PAID', 'REFUNDED'] }, method: { not: 'APPLE_IAP' }, paidAt: { gte: from }, totalFils: { gt: 0 } },
        select: {
          id: true, userId: true, subtotalFils: true, discountFils: true, vatFils: true, totalFils: true, refundedFils: true,
          user: { select: { name: true, email: true } },
          enrollment: { select: { batch: { select: { code: true, course: { select: { titleEn: true } } } } } },
        },
        orderBy: { paidAt: 'asc' },
        take: 500,
      }),
      this.db.subscriptionPayment.findMany({
        where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { gte: from }, totalFils: { gt: 0 }, subscription: { provider: { not: 'APPLE' } } },
        select: {
          id: true, userId: true, subtotalFils: true, discountFils: true, vatFils: true, totalFils: true, refundedFils: true, plan: true, periodStart: true, periodEnd: true,
          user: { select: { name: true, email: true } },
          subscription: { select: { course: { select: { titleEn: true } } } },
        },
        orderBy: { paidAt: 'asc' },
        take: 500,
      }),
      // Seat packs are invoiced when the deal is recorded (companies pay against the invoice), cancelled ones included:
      // their credit note follows from refundedFils.
      this.db.seatPack.findMany({
        where: { invoicedAt: { gte: from }, totalFils: { gt: 0 } },
        select: {
          id: true, seats: true, subtotalFils: true, discountFils: true, vatFils: true, totalFils: true, refundedFils: true,
          organization: { select: { legalName: true, billingEmail: true, trn: true, address: true } },
          batch: { select: { code: true, course: { select: { titleEn: true } } } },
          course: { select: { titleEn: true } },
        },
        orderBy: { invoicedAt: 'asc' },
        take: 500,
      }),
    ]);
    const day = (d: Date) => d.toISOString().slice(0, 10);
    return [
      ...orders.map((o) => ({
        orderId: o.id,
        userId: o.userId,
        buyer: o.user,
        description: `${o.enrollment.batch.course.titleEn} · class ${o.enrollment.batch.code} (live class seat)`,
        subtotalFils: o.subtotalFils,
        discountFils: o.discountFils,
        vatFils: o.vatFils,
        totalFils: o.totalFils,
        refundedFils: o.refundedFils,
      })),
      ...payments.map((p) => ({
        subscriptionPaymentId: p.id,
        userId: p.userId,
        buyer: p.user,
        description: `${p.subscription.course?.titleEn ?? ALL_ACCESS_TITLE.en} · ${PLAN_EN[p.plan]} (${day(p.periodStart)} to ${day(p.periodEnd)})`,
        // A plan payment stores the taxable amount; a coupon (bank transfer, first payment) shows as the discount line.
        subtotalFils: p.subtotalFils + p.discountFils,
        discountFils: p.discountFils,
        vatFils: p.vatFils,
        totalFils: p.totalFils,
        refundedFils: p.refundedFils,
      })),
      ...packs.map((k) => ({
        seatPackId: k.id,
        userId: null,
        buyer: organizationBuyer(k.organization),
        description: seatPackDescription({ seats: k.seats, courseTitle: k.batch?.course.titleEn ?? k.course?.titleEn ?? '', batchCode: k.batch?.code ?? null }),
        subtotalFils: k.subtotalFils,
        discountFils: k.discountFils,
        vatFils: k.vatFils,
        totalFils: k.totalFils,
        refundedFils: k.refundedFils,
      })),
    ];
  }

  /** `GET /me/tax-documents` */
  mine(userId: string) {
    return this.db.taxDocument.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' }, select: listSelect });
  }

  /** `GET /tax-documents/:id` — its buyer, an admin, or (seat packs) a manager of the buying organization. */
  async get(id: string, viewer: { id: string; role: string }) {
    const doc = await this.db.taxDocument.findUnique({
      where: { id },
      include: { invoice: { select: { id: true, number: true } }, seatPack: { select: { organizationId: true } } },
    });
    if (!doc) throw new NotFoundError('Tax document', id);
    const { seatPack, ...rest } = doc;
    if (doc.userId === viewer.id || viewer.role === 'ADMIN') return rest;
    if (seatPack) {
      const manager = await this.db.organizationMember.findFirst({ where: { organizationId: seatPack.organizationId, userId: viewer.id, role: 'MANAGER' }, select: { id: true } });
      if (manager) return rest;
    }
    throw new ForbiddenError('This document belongs to another account');
  }

  /** `GET /org/:orgId/tax-documents` (after the caller checked the viewer manages the organization). */
  forOrganization(organizationId: string) {
    return this.db.taxDocument.findMany({ where: { seatPack: { organizationId } }, orderBy: { issuedAt: 'desc' }, select: listSelect });
  }

  /** `GET /admin/tax-documents?from&to` — for VAT returns. */
  forPeriod(from: Date, to: Date) {
    return this.db.taxDocument.findMany({ where: { issuedAt: { gte: from, lt: to } }, orderBy: [{ kind: 'asc' }, { seq: 'asc' }], select: listSelect });
  }

  /** The same list as CSV: one row per document, credit notes negative. */
  async csv(from: Date, to: Date) {
    const rows = await this.forPeriod(from, to);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const aed = (f: number, sign: number) => ((sign * f) / 100).toFixed(2);
    const header = ['number', 'kind', 'issued_at', 'buyer_name', 'buyer_email', 'description', 'taxable_aed', 'vat_percent', 'vat_aed', 'total_aed', 'credits_invoice'];
    const lines = rows.map((d) => {
      const sign = d.kind === 'CREDIT_NOTE' ? -1 : 1;
      const buyer = d.buyer as { name?: string; email?: string };
      return [d.number, d.kind, d.issuedAt.toISOString(), buyer.name, buyer.email, d.description, aed(d.totalFils - d.vatFils, sign), d.vatPercent, aed(d.vatFils, sign), aed(d.totalFils, sign), d.invoice?.number ?? '']
        .map(esc)
        .join(',');
    });
    return [header.join(','), ...lines].join('\n') + '\n';
  }
}

/** The invoice of a payment is found by what was paid: an order, a plan payment or a seat pack. */
function sourceKey(src: Source) {
  if (src.orderId) return { orderId: src.orderId };
  if (src.seatPackId) return { seatPackId: src.seatPackId };
  return { subscriptionPaymentId: src.subscriptionPaymentId };
}

const listSelect = {
  id: true,
  kind: true,
  number: true,
  description: true,
  subtotalFils: true,
  discountFils: true,
  vatPercent: true,
  vatFils: true,
  totalFils: true,
  buyer: true,
  issuedAt: true,
  orderId: true,
  subscriptionPaymentId: true,
  seatPackId: true,
  invoice: { select: { id: true, number: true } },
} as const;
