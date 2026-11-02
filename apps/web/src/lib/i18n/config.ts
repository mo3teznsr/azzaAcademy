import type { Locale } from '@azza/shared';

export const LOCALE_COOKIE = 'azza_locale';
export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'ar';
export const dirOf = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr');
