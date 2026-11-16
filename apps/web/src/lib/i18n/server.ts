import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Locale } from '@azza/shared';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config';

/** Locale from cookie, else the first of Arabic or English in Accept-Language, else Arabic. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}

/** Pure: the first of `ar` or `en` the browser lists (by order, ignoring other languages), else the default. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? '').toLowerCase().split(',')) {
    const tag = part.trim().split(';')[0] ?? '';
    if (tag.startsWith('ar')) return 'ar';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}
