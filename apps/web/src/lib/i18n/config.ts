import type { Locale } from '@azza/shared';

export const LOCALE_COOKIE = 'azza_locale';
/** Azza is Arabic first: visitors get Arabic unless their browser asks for English (crawlers send no language, so they see Arabic). */
export const DEFAULT_LOCALE: Locale = 'ar';
export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'ar';
export const dirOf = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr');
