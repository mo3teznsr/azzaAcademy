import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Locale } from '@azza/shared';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config';

/** Locale from cookie, else Accept-Language, else English. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get('accept-language') ?? '';
  return accept.toLowerCase().startsWith('ar') ? 'ar' : DEFAULT_LOCALE;
}
