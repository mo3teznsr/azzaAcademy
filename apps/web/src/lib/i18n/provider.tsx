'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@azza/shared';
import { DirectionProvider } from '@/components/ui/direction';
import { LOCALE_COOKIE, dirOf } from './config';
import { fill, makeFormatters, type Formatters } from './format';
import { isLocalizedPath, localePath, localizeHref, splitLocale } from './routing';
import en, { type Dictionary } from './dictionaries/en';
import ar from './dictionaries/ar';

const DICTS: Record<Locale, Dictionary> = { en, ar };

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: Dictionary;
  f: Formatters;
  fill: typeof fill;
  setLocale: (l: Locale) => void;
  /** Pick the localised content field; falls back to English. */
  pick: (enValue: string | null | undefined, arValue: string | null | undefined) => { text: string; fallback: boolean };
  timeZone: string | undefined;
  setTimeZone: (tz: string | undefined) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [chosen, setChosen] = useState<Locale>(initialLocale);
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  // An `/ar` or `/en` URL decides the language (the server rendered it so); it also becomes the choice
  // for unprefixed pages visited next, as the proxy stored it in the cookie.
  const urlLocale = splitLocale(pathname).locale;
  if (urlLocale && urlLocale !== chosen) setChosen(urlLocale);
  const locale = urlLocale ?? chosen;

  // Keep <html lang/dir> and the cookie in step without a reload (i18n-00-system), including back/forward between language URLs.
  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const { locale: current, path } = splitLocale(pathname);
      // Public pages have a URL per language: load it. A full load, because the router treats `/ar/x` and
      // `/en/x` as one route and would keep the old language's server-rendered parts and metadata.
      if (current || isLocalizedPath(path)) {
        window.location.assign(localePath(next, path) + window.location.search + window.location.hash);
        return;
      }
      // Elsewhere: switch in place and re-render the server parts.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setChosen(next);
      router.refresh();
    },
    [pathname, router],
  );

  const value = useMemo<I18nValue>(() => {
    const t = DICTS[locale];
    return {
      locale,
      dir: dirOf(locale),
      t,
      f: makeFormatters(locale, timeZone),
      fill,
      setLocale,
      timeZone,
      setTimeZone,
      pick: (enValue, arValue) => {
        if (locale === 'ar' && arValue && arValue.trim()) return { text: arValue, fallback: false };
        return { text: enValue ?? '', fallback: locale === 'ar' };
      },
    };
  }, [locale, timeZone, setLocale]);

  return (
    <I18nContext value={value}>
      <DirectionProvider dir={value.dir}>{children}</DirectionProvider>
    </I18nContext>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Keeps links to public pages on the current `/ar` or `/en` prefix; returns hrefs unchanged on unprefixed URLs. */
export function useLocaleHref(): (href: string) => string {
  const pathname = usePathname();
  return useCallback((href: string) => localizeHref(pathname, href), [pathname]);
}
