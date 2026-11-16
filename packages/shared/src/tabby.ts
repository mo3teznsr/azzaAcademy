/**
 * Tabby "pay in 4" (UAE). Tabby recommends against hard-coded amount limits (theirs are dynamic per merchant and
 * customer, answered by the background pre-scoring call), so availability comes from the API's eligibility check.
 */

/** Tabby pre-scoring / session `rejection_reason` values (docs.tabby.ai › Checkout flow). */
export const TABBY_REJECTION_REASONS = ['not_available', 'order_amount_too_high', 'order_amount_too_low'] as const;
export type TabbyRejectionReason = (typeof TABBY_REJECTION_REASONS)[number];

/** Why the Tabby option is hidden, as `GET /payments/tabby/eligibility` answers it. */
export type TabbyUnavailableReason = 'NOT_CONFIGURED' | 'PHONE_REQUIRED' | TabbyRejectionReason;

export interface TabbyEligibility {
  available: boolean;
  reason: TabbyUnavailableReason | null;
  /** The monthly amount Tabby's checkout copy shows ("4 payments of …"), in fils. */
  installmentFils: number;
  /** Tabby's "Learn more" pop-up with the payment schedule (needs the public key), else null. */
  learnMoreUrl: string | null;
}

/** Tabby's hosted "Learn more" pop-up for a price (docs.tabby.ai › On-site messaging › custom snippets, UAE). */
export function tabbyLearnMoreUrl(args: { totalFils: number; lang: 'ar' | 'en'; merchantCode: string; publicKey: string }): string {
  const q = new URLSearchParams({ price: filsToTabbyAmount(args.totalFils), currency: 'AED', merchant_code: args.merchantCode, public_key: args.publicKey });
  return `https://checkout.tabby.ai/promos/product-page/installments/${args.lang}/?${q.toString()}`;
}

/**
 * The "4 payments of XX.XX" figure from Tabby's checkout guidelines: order total × 1.015 / 4, rounded to the fils.
 * The 1.5% uplift is Tabby's own published formula (it covers the plan's fee/profit); change it here if Tabby does.
 */
export function tabbyInstallmentFils(totalFils: number): number {
  return Math.round((totalFils * 1015) / 4000); // integer maths: 1.015 in floating point rounds half-fils down
}

/** Fils → Tabby's amount format: a decimal string in major units with 2 decimals ("880.00"). */
export function filsToTabbyAmount(fils: number): string {
  if (!Number.isInteger(fils) || fils < 0) throw new Error(`Invalid fils amount: ${fils}`);
  return `${Math.floor(fils / 100)}.${String(fils % 100).padStart(2, '0')}`;
}

/** Tabby's decimal string ("880", "880.5", "880.00") → fils; NaN when it is not a non-negative amount. */
export function tabbyAmountToFils(amount: string | number | null | undefined): number {
  const s = String(amount ?? '').trim();
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return Number.NaN;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Math.round(Number(`0.${frac || '0'}`) * 100);
}
