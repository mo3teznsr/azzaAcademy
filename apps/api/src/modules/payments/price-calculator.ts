import { BASE_CURRENCY, convertFromAed, percentOf, type DisplayCurrency } from '@azza/shared';
import type { CouponRules } from './coupon-eligibility';

export interface CouponTerms {
  code: string;
  percentOff: number | null;
  amountOffFils: number | null;
}

export interface CouponState extends CouponTerms, CouponRules {}

export interface Quote {
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  couponCode: string | null;
  display: { currency: DisplayCurrency; amount: number; rate: number };
}

/** A fixed VAT percent, or a getter read at every quote (the admin-editable rule; see SiteSettingsService.ruleSnapshot). */
export type VatSource = number | (() => number);

/** Pure pricing in fils: base price → coupon → VAT. Display currency is informational only. */
export class PriceCalculator {
  constructor(private readonly vat: VatSource) {}

  /** The VAT percent in effect now. */
  get vatPercent(): number {
    return typeof this.vat === 'function' ? this.vat() : this.vat;
  }

  /** A batch can override its course's price. */
  static basePrice(batchPriceFils: number | null, coursePriceFils: number): number {
    return batchPriceFils ?? coursePriceFils;
  }

  /** The VAT-inclusive amount charged for a pre-VAT price (what a Stripe Price for a plan holds). */
  inclusive(priceFils: number): number {
    return this.quote({ priceFils }).totalFils;
  }

  /** Splits a VAT-inclusive total back into its pre-VAT part and VAT, the inverse of `quote` (exact whenever the total came from `quote`). */
  splitInclusive(totalFils: number): { subtotalFils: number; vatFils: number } {
    const vat = this.vatPercent;
    const fixed = new PriceCalculator(vat); // one VAT value for the whole split
    const guess = Math.round((totalFils * 100) / (100 + vat));
    const subtotalFils = [guess, guess - 1, guess + 1].find((s) => s >= 0 && fixed.inclusive(s) === totalFils) ?? guess;
    return { subtotalFils, vatFils: totalFils - subtotalFils };
  }

  quote(args: { priceFils: number; coupon?: CouponTerms | null; displayCurrency?: DisplayCurrency; fxRate?: number; displayDecimals?: number }): Quote {
    const subtotalFils = Math.max(0, Math.round(args.priceFils));
    const c = args.coupon;
    let discountFils = 0;
    if (c?.percentOff) discountFils = percentOf(subtotalFils, c.percentOff);
    else if (c?.amountOffFils) discountFils = c.amountOffFils;
    discountFils = Math.min(Math.max(0, discountFils), subtotalFils);

    const taxable = subtotalFils - discountFils;
    const vatFils = percentOf(taxable, this.vatPercent);
    const totalFils = taxable + vatFils;

    const currency = args.displayCurrency ?? BASE_CURRENCY;
    const rate = currency === BASE_CURRENCY ? 1 : (args.fxRate ?? 1);
    return {
      subtotalFils,
      discountFils,
      vatFils,
      totalFils,
      couponCode: c ? c.code : null,
      display: { currency, amount: convertFromAed(totalFils, currency, rate, args.displayDecimals), rate },
    };
  }
}
