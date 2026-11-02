'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@azza/shared';
import { DirectionProvider } from '@/components/ui/direction';
import { LOCALE_COOKIE, dirOf } from './config';
import { fill, makeFormatters, type Formatters } from './format';
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
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Flip dir on <html> without a reload (i18n-00-system).
      document.documentElement.lang = next;
      document.documentElement.dir = dirOf(next);
      setLocaleState(next);
      router.refresh();
    },
    [router],
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
