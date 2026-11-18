import type { AppleTransaction } from '../../../core/ports';
import type { OrderPatch, OrderRecord } from '../payments.repository';

/** Why a verified Apple transaction cannot pay its order. */
export type AppleRejection =
  | 'ORDER_NOT_FOUND'
  | 'FOREIGN_ORDER'
  | 'NOT_APPLE_ORDER'
  | 'PRODUCT_MISMATCH'
  | 'TOKEN_MISMATCH'
  | 'TRANSACTION_REVOKED'
  | 'ORDER_ALREADY_PAID'
  | 'ORDER_REFUNDED';

export const APPLE_REJECTION_MESSAGES: Record<AppleRejection, string> = {
  ORDER_NOT_FOUND: 'No order matches this purchase',
  FOREIGN_ORDER: 'This purchase belongs to another account',
  NOT_APPLE_ORDER: 'This order is not paid through the App Store',
  PRODUCT_MISMATCH: 'The purchased product does not match the order',
  TOKEN_MISMATCH: 'The purchase was made for a different order',
  TRANSACTION_REVOKED: 'Apple has revoked this purchase',
  ORDER_ALREADY_PAID: 'This order was already paid by another purchase',
  ORDER_REFUNDED: 'This order was refunded',
};

/**
 * Whether the app should still `finish` the StoreKit transaction after this rejection. Retrying can never
 * succeed for these, and an unfinished consumable blocks buying the same price point again — so they are
 * finished and left to Apple's refund flow (reportaproblem.apple.com). A purchase made on this device by
 * another account is kept until that account signs in.
 */
export const APPLE_REJECTION_IS_FINAL: Record<AppleRejection, boolean> = {
  ORDER_NOT_FOUND: true,
  FOREIGN_ORDER: false,
  NOT_APPLE_ORDER: true,
  PRODUCT_MISMATCH: true,
  TOKEN_MISMATCH: true,
  TRANSACTION_REVOKED: true,
  ORDER_ALREADY_PAID: true,
  ORDER_REFUNDED: true,
};

export type ApplePurchaseDecision = { kind: 'pay'; patch: OrderPatch } | { kind: 'duplicate' } | { kind: 'reject'; reason: AppleRejection };

/** Pure: may this verified transaction pay this order (for this student)? */
export function decideApplePurchase(order: OrderRecord, tx: AppleTransaction, userId: string): ApplePurchaseDecision {
  if (order.userId !== userId) return { kind: 'reject', reason: 'FOREIGN_ORDER' };
  if (order.appleTransactionId === tx.transactionId) return { kind: 'duplicate' };
  if (order.method !== 'APPLE_IAP') return { kind: 'reject', reason: 'NOT_APPLE_ORDER' };
  if (order.appleProductId !== tx.productId) return { kind: 'reject', reason: 'PRODUCT_MISMATCH' };
  if (order.appleAppAccountToken && tx.appAccountToken && order.appleAppAccountToken !== tx.appAccountToken.toLowerCase()) {
    return { kind: 'reject', reason: 'TOKEN_MISMATCH' };
  }
  if (tx.revocationDate) return { kind: 'reject', reason: 'TRANSACTION_REVOKED' };
  if (order.status === 'REFUNDED') return { kind: 'reject', reason: 'ORDER_REFUNDED' };
  if (order.status === 'PAID' || order.appleTransactionId) return { kind: 'reject', reason: 'ORDER_ALREADY_PAID' };
  // AWAITING_PAYMENT, or a late purchase on a FAILED/EXPIRED order (Ask to Buy approvals) — same as a late Stripe success.
  return {
    kind: 'pay',
    patch: {
      appleTransactionId: tx.transactionId,
      appleOriginalTransactionId: tx.originalTransactionId,
      appleEnvironment: tx.environment,
      receivedFils: receivedFils(order, tx),
    },
  };
}

/** What Apple charged, when it was in AED (price is in milliunits: 924000 = AED 924.00); else the order total. */
export function receivedFils(order: Pick<OrderRecord, 'totalFils'>, tx: Pick<AppleTransaction, 'priceMilliunits' | 'currency'>): number {
  return tx.currency === 'AED' && tx.priceMilliunits !== null ? Math.round(tx.priceMilliunits / 10) : order.totalFils;
}

/**
 * Apple's commission on an in-app purchase, in fils: `percent` of the price before VAT (Apple charges its cut on the
 * VAT-exclusive price and remits the VAT itself). Used as `feeFils` where the payment's total is what Apple charged
 * (recorded-course plans): the App Store price is grossed up by `appStorePreVatFils`, so the net after this fee is
 * the web price and the teacher's share is not reduced by Apple.
 */
export function appleCommissionFils(totalFils: number, vatFils: number, percent: number): number {
  return Math.max(0, Math.round(((totalFils - vatFils) * percent) / 100));
}

/**
 * The App Store price before VAT for a web price before VAT: grossed up so that what is left after Apple's commission
 * is the web price. The learner who buys in the app pays Apple's cut; the teacher and the platform get the same as on
 * the web. 500 AED at 30% → 714.29 AED (rounded up to the fil; App Store price points round further).
 */
export function appStorePreVatFils(webPreVatFils: number, percent: number): number {
  const p = Math.min(Math.max(percent, 0), 99);
  return Math.ceil((webPreVatFils * 100) / (100 - p));
}

/**
 * `feeFils` of a seat bought in the app. The order keeps the web price (its quote), while Apple charged the grossed-up
 * App Store price; the fee is whatever Apple's payout falls short of the web price before VAT (only App Store price-point
 * rounding), never Apple's whole commission. With no AED price on the transaction (another storefront), Apple is taken
 * to have charged the grossed-up price.
 */
export function appleSeatFeeFils(
  order: Pick<OrderRecord, 'totalFils' | 'vatFils'>,
  tx: Pick<AppleTransaction, 'priceMilliunits' | 'currency'>,
  percent: number,
): number {
  const preVat = order.totalFils - order.vatFils;
  const actual = tx.currency === 'AED' && tx.priceMilliunits !== null && order.totalFils > 0;
  const grossPreVat = actual ? Math.round((receivedFils(order, tx) * preVat) / order.totalFils) : appStorePreVatFils(preVat, percent);
  const payout = Math.floor((grossPreVat * (100 - Math.min(Math.max(percent, 0), 99))) / 100);
  return Math.max(0, preVat - payout);
}

/** App Store Server Notifications V2 we act on: a refunded or revoked (Family Sharing) purchase gives the seat back. */
export function appleNotificationAction(notificationType: string): 'refund' | 'ignore' {
  return notificationType === 'REFUND' || notificationType === 'REVOKE' ? 'refund' : 'ignore';
}

/** Product ids of the recorded-course subscription groups (`appleRecordedProductId`); everything else is a seat purchase. */
export const APPLE_RECORDED_PREFIX = 'com.futuretech.azza.rec.';
export const isRecordedPlanProduct = (productId: string): boolean => productId.startsWith(APPLE_RECORDED_PREFIX);
