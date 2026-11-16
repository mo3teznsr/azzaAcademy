import { API_URL, http } from './client';

export interface TaxDocumentSummary {
  id: string;
  kind: 'INVOICE' | 'CREDIT_NOTE';
  number: string;
  description: string;
  subtotalFils: number;
  discountFils: number;
  vatPercent: number;
  vatFils: number;
  totalFils: number;
  buyer: { name?: string; email?: string };
  issuedAt: string;
  orderId: string | null;
  subscriptionPaymentId: string | null;
  invoice: { id: string; number: string } | null;
}

export interface TaxDocument extends TaxDocumentSummary {
  supplier: { legalName: string; address: string | null; trn: string };
}

export const taxDocumentsApi = {
  mine: () => http.get<{ items: TaxDocumentSummary[] }>('/api/v1/me/tax-documents').then((r) => r.items),
  get: (id: string) => http.get<TaxDocument>(`/api/v1/tax-documents/${encodeURIComponent(id)}`),
  /** Admin: documents issued from `from` to `to` (inclusive days). */
  forPeriod: (from: string, to: string) => http.get<{ items: TaxDocumentSummary[] }>('/api/v1/admin/tax-documents', { from, to }).then((r) => r.items),
  csvUrl: (from: string, to: string) => `${API_URL}/api/v1/admin/tax-documents?from=${from}&to=${to}&format=csv`,
};
