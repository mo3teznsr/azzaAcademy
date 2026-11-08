import type { SubscribeInput, SubscriptionPlan, SubscriptionStatus } from '@azza/shared';
import { http, items, request } from './client';
import type { BankAccount, ISODate, Items, MySubscription } from './types';

/** `POST /courses/:id/subscribe` with `method: 'STRIPE'`. */
export interface SubscribeCard {
  checkoutUrl: string;
  reference: string;
}

/** `POST /courses/:id/subscribe` with `method: 'BANK_TRANSFER'`: a prepaid month or year, no auto-renew. */
export interface SubscribeTransfer {
  bankAccount: BankAccount | null;
  reference: string;
  amountFils: number;
  expiresAt: ISODate | null;
  paymentId: string;
}

export type SubscribeResult = SubscribeCard | SubscribeTransfer;
export const isCardResult = (r: SubscribeResult): r is SubscribeCard => 'checkoutUrl' in r;

/** `GET /subscriptions/by-reference/:ref`, polled by the checkout return page. */
export interface SubscriptionByReference {
  status: SubscriptionStatus;
  courseSlug: string;
  nextLessonId: string | null;
}

/** Apple's provider value on subscription rows (the subscribe *method* is `APPLE_IAP`). */
export const isAppleProvider = (p: string): boolean => p === 'APPLE';

export const subscriptionsApi = {
  subscribe: (courseId: string, input: SubscribeInput) => http.post<SubscribeResult>(`/api/v1/courses/${courseId}/subscribe`, input),
  byReference: (ref: string) => http.get<SubscriptionByReference>(`/api/v1/subscriptions/by-reference/${encodeURIComponent(ref)}`),
  mine: () => items(http.get<Items<MySubscription>>('/api/v1/me/subscriptions')),
  /** Card plans: stop renewing; access runs to the end of the paid period. */
  cancel: (id: string) => http.post<unknown>(`/api/v1/subscriptions/${id}/cancel`),
  /** Card plans: move to the other billing period (prorated by Stripe). */
  switchPlan: (id: string, plan: SubscriptionPlan) => http.post<unknown>(`/api/v1/subscriptions/${id}/switch`, { plan }),
  /** Transfer plans: pay by card from the end of the paid period. */
  switchToCard: (id: string) => http.post<{ checkoutUrl: string }>(`/api/v1/subscriptions/${id}/switch-to-card`),
  /** Card plans: undo "cancel at period end". */
  resume: (id: string) => http.post<unknown>(`/api/v1/subscriptions/${id}/resume`),
  /** Card plans: Stripe's customer portal (update card, switch plan). */
  portal: (id: string) => http.post<{ url: string }>(`/api/v1/subscriptions/${id}/portal`),
  /** Multipart receipt (image/PDF) for a prepaid transfer; moves the payment to review. */
  uploadReceiptFile: (paymentId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<unknown>(`/api/v1/subscription-payments/${paymentId}/receipt`, { method: 'POST', form });
  },
};
