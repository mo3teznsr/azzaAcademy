import { COUNTRIES, type Country } from './countries';

/** E.164 shape: + then 7–15 digits, no leading 0. */
export const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function countryByIso2(iso2: string): Country | undefined {
  const code = iso2.toUpperCase();
  return COUNTRIES.find((c) => c.iso2 === code);
}

/** The countries whose calling code starts the number (calling codes are prefix-free, so they all share one code). */
export function countriesForPhone(e164: string): Country[] {
  if (!E164_PATTERN.test(e164)) return [];
  const digits = e164.slice(1);
  for (let len = 3; len >= 1; len--) {
    if (digits.length <= len) continue;
    const code = digits.slice(0, len);
    const matches = COUNTRIES.filter((c) => c.dialCode === code);
    if (matches.length) return matches;
  }
  return [];
}

/** Valid when it matches ^\+[1-9]\d{6,14}$, the calling code is a known country's, and the national digit count fits that country. */
export function isValidPhone(e164: string): boolean {
  const matches = countriesForPhone(e164);
  if (!matches.length) return false;
  const national = e164.length - 1 - matches[0]!.dialCode.length;
  return matches.some((c) => national >= c.minLen && national <= c.maxLen);
}

/**
 * The national input as E.164 for `iso2`: strips spaces, dashes, dots, parentheses and one leading 0 (trunk prefix).
 * An input that already starts with `+` (or `00`) is taken as international. Validate the result with `isValidPhone`.
 */
export function toE164(iso2: string, nationalInput: string): string {
  const digits = nationalInput.trim().replace(/[\s\-().]/g, '').replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\+/g, '')}`;
  if (digits.startsWith('00')) return `+${digits.slice(2).replace(/\+/g, '')}`;
  const national = digits.replace(/\+/g, '').replace(/^0/, '');
  return `+${countryByIso2(iso2)?.dialCode ?? ''}${national}`;
}
