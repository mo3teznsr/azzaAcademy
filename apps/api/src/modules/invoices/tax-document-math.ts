/** Pure rules for UAE tax invoices and credit notes. Money in fils of AED. */

export type TaxDocumentKind = 'INVOICE' | 'CREDIT_NOTE';

/** `INV-000123` / `CN-000045`: each series is numbered on its own, without gaps. */
export function taxDocumentNumber(kind: TaxDocumentKind, seq: number): string {
  return `${kind === 'INVOICE' ? 'INV' : 'CN'}-${String(seq).padStart(6, '0')}`;
}

/** The VAT rate shown on a document, from its own amounts (what was charged, not today's setting). */
export function vatPercentOf(taxableFils: number, vatFils: number): number {
  return taxableFils > 0 ? Math.round((vatFils * 100) / taxableFils) : 0;
}

/**
 * A credit note for `refundFils` of an invoice: the VAT is the same share of the refund as of the invoice total, so the
 * credit notes of a fully refunded invoice add up to it exactly (the last one takes the remainder).
 */
export function creditNoteAmounts(
  invoice: { totalFils: number; vatFils: number },
  credited: { totalFils: number; vatFils: number },
  refundFils: number,
): { totalFils: number; vatFils: number; subtotalFils: number } {
  const totalFils = Math.min(refundFils, invoice.totalFils - credited.totalFils);
  const last = credited.totalFils + totalFils >= invoice.totalFils;
  const vatFils = last ? invoice.vatFils - credited.vatFils : invoice.totalFils > 0 ? Math.round((totalFils * invoice.vatFils) / invoice.totalFils) : 0;
  return { totalFils, vatFils, subtotalFils: totalFils - vatFils };
}

/** Who a tax document is made out to (a snapshot taken at issue). `trn` and `address` only for VAT-registered businesses. */
export interface TaxBuyer {
  name: string;
  email: string;
  trn?: string;
  address?: string;
}

/** A seat pack is invoiced to the organization: its legal name, billing email and, when registered, its TRN and address. */
export function organizationBuyer(org: { legalName: string; billingEmail: string; trn: string | null; address: string | null }): TaxBuyer {
  return { name: org.legalName, email: org.billingEmail, ...(org.trn && { trn: org.trn }), ...(org.address && { address: org.address }) };
}

/** Invoice line for a seat pack, e.g. `12 seats · Spoken Arabic · class B3 (live class seats)`. */
export function seatPackDescription(pack: { seats: number; courseTitle: string; batchCode: string | null }): string {
  const seats = `${pack.seats} seat${pack.seats === 1 ? '' : 's'}`;
  return pack.batchCode
    ? `${seats} · ${pack.courseTitle} · class ${pack.batchCode} (live class seats)`
    : `${seats} · ${pack.courseTitle} (recorded course access)`;
}
