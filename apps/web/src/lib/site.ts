import type { Locale } from '@azza/shared';
import { localePath } from '@/lib/i18n/routing';

/** The public web address, for absolute links in metadata, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://azza.academy').replace(/\/$/, '');

/** A JSON-LD object as a string that is safe inside a <script> tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

/** Absolute URL of a public page in one language: `pageUrl('ar', '/teachers')` → `https://azza.academy/ar/teachers`. */
export const pageUrl = (locale: Locale, path: string) => `${SITE_URL}${localePath(locale, path)}`;

/** The `ar`, `en` and `x-default` (Arabic) URLs of a public page, for hreflang links and the sitemap. */
export const languageUrls = (path: string) => ({ ar: pageUrl('ar', path), en: pageUrl('en', path), 'x-default': pageUrl('ar', path) });

/** `alternates` for a public page's metadata: canonical in the page language, plus every language version. */
export const pageAlternates = (locale: Locale, path: string) => ({ canonical: pageUrl(locale, path), languages: languageUrls(path) });

/** Open Graph locale for the page language. */
export const ogLocale = (locale: Locale) => (locale === 'ar' ? 'ar_AE' : 'en_AE');
