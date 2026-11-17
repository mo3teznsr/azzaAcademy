import type { Locale } from '@azza/shared';
import { isLocale } from './config';

/**
 * Language URLs for the public pages: `/ar/...` and `/en/...` are the same pages as the unprefixed ones.
 * The proxy strips the prefix, rewrites to the real page and passes the language in this request header.
 */
export const LOCALE_HEADER = 'x-azza-locale';
export const LOCALES: readonly Locale[] = ['ar', 'en'];

/** Public pages that have an Arabic and an English URL (and hreflang links). */
const LOCALIZED = [/^\/$/, /^\/blog$/, /^\/blog\/[^/]+$/, /^\/teachers$/, /^\/teachers\/[^/]+$/, /^\/teach$/, /^\/courses\/[^/]+$/, /^\/categories\/[^/]+$/];

export const isLocalizedPath = (path: string) => LOCALIZED.some((re) => re.test(path));

/** `/ar/courses/x` → `{ locale: 'ar', path: '/courses/x' }`; unprefixed paths give `locale: null`. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const m = /^\/(ar|en)(\/.*)?$/.exec(pathname);
  if (!m || !isLocale(m[1])) return { locale: null, path: pathname };
  return { locale: m[1], path: m[2] || '/' };
}

/** `/courses/x?batch=1#plan` → `/ar/courses/x?batch=1#plan`; `/` → `/ar`, `/#catalog` → `/ar#catalog`. */
export function localePath(locale: Locale, href: string): string {
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? '' : href.slice(cut);
  return `/${locale}${path === '/' ? '' : path}${rest}`;
}

/**
 * The href to use from the current page: when the visitor is on an `/ar` or `/en` URL, links to other
 * public pages keep that prefix (so crawlers and people stay in one language); otherwise they are unchanged.
 */
export function localizeHref(currentPathname: string, href: string): string {
  const { locale } = splitLocale(currentPathname);
  if (!locale || !href.startsWith('/')) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  return isLocalizedPath(path) ? localePath(locale, href) : href;
}
