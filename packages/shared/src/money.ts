import { BASE_CURRENCY, type DisplayCurrency } from './enums';

/** Amounts are integers in fils (1 AED = 100 fils) everywhere outside the UI. */
export type Fils = number;

export const aedToFils = (aed: number): Fils => Math.round(aed * 100);
export const filsToAed = (fils: Fils): number => fils / 100;

/** Fraction digits used when a currency's own `decimals` is not passed: 2 for AED, whole units for display currencies. */
export const defaultDecimals = (currency: DisplayCurrency): number => (currency === BASE_CURRENCY ? 2 : 0);

/** rate = units of `currency` per 1 AED. Rounded to `decimals` (the currency's own, from `GET /currencies`). */
export function convertFromAed(fils: Fils, currency: DisplayCurrency, rate: number, decimals?: number): number {
  if (currency === BASE_CURRENCY) return filsToAed(fils);
  const factor = 10 ** (decimals ?? defaultDecimals(currency));
  return Math.round(filsToAed(fils) * rate * factor) / factor;
}

/** `decimals` comes from the currency (`GET /currencies`); non-base currencies keep the "≈" prefix (display only). */
export function formatMoney(amount: number, currency: DisplayCurrency, locale: 'en' | 'ar' = 'en', decimals?: number): string {
  const approx = currency === BASE_CURRENCY ? '' : '≈ ';
  const digits = decimals ?? defaultDecimals(currency);
  const num = new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${approx}${currency} ${num}`;
}

/** Percentage helpers kept integer-safe. */
export const percentOf = (fils: Fils, percent: number): Fils => Math.round((fils * percent) / 100);
