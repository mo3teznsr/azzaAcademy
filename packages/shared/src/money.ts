import { BASE_CURRENCY, type DisplayCurrency } from './enums';

/** Amounts are integers in fils (1 AED = 100 fils) everywhere outside the UI. */
export type Fils = number;

export const aedToFils = (aed: number): Fils => Math.round(aed * 100);
export const filsToAed = (fils: Fils): number => fils / 100;

/** rate = units of `currency` per 1 AED. */
export function convertFromAed(fils: Fils, currency: DisplayCurrency, rate: number): number {
  if (currency === BASE_CURRENCY) return filsToAed(fils);
  return Math.round(filsToAed(fils) * rate);
}

export function formatMoney(amount: number, currency: DisplayCurrency, locale: 'en' | 'ar' = 'en'): string {
  const approx = currency === BASE_CURRENCY ? '' : '≈ ';
  const digits = currency === BASE_CURRENCY ? 2 : 0;
  const num = new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${approx}${currency} ${num}`;
}

/** Percentage helpers kept integer-safe. */
export const percentOf = (fils: Fils, percent: number): Fils => Math.round((fils * percent) / 100);
