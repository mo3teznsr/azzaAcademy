import type { CheckoutInput } from '@azza/shared';
import { http, items, request } from './client';
import type { BankAccount, CheckoutResult, Items, Order, CurrencyList, Quote } from './types';

type Started = Exclude<CheckoutResult, { waitlisted: true }>;

export const checkoutApi = {
  /** Public: the enabled display currencies with their rates and decimals. */
  currencies: () => http.get<CurrencyList>('/api/v1/currencies'),
  bankAccounts: () => items(http.get<Items<BankAccount>>('/api/v1/bank-accounts')),
  quote: (input: CheckoutInput) => http.post<Quote>('/api/v1/checkout/quote', input),
  checkout: (input: CheckoutInput) => http.post<CheckoutResult>('/api/v1/checkout', input),
  order: (id: string) => http.get<Order>(`/api/v1/orders/${id}`),
  /** Owner/admin: the order behind a Stripe Checkout return URL (`?ref=`). */
  orderByReference: (ref: string) => http.get<Order>(`/api/v1/orders/by-reference/${encodeURIComponent(ref)}`),
  uploadReceipt: (id: string, receiptUrl: string) => http.post<Order>(`/api/v1/orders/${id}/receipt`, { receiptUrl }),
  /** Multipart upload of the receipt file (image/PDF ≤ 10 MB); the API stores it and moves the order to VERIFYING. */
  uploadReceiptFile: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Order>(`/api/v1/orders/${id}/receipt/file`, { method: 'POST', form });
  },
};

export const isWaitlisted = (r: CheckoutResult): r is Extract<CheckoutResult, { waitlisted: true }> => r.waitlisted;
export const isStripeResult = (r: CheckoutResult): r is Extract<Started, { checkoutUrl: string }> => !r.waitlisted && 'checkoutUrl' in r;
