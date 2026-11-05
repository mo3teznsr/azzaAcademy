'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { THEME_COOKIE_MAX_AGE, THEME_KEY, isThemePreference, type ResolvedTheme, type ThemePreference } from './config';

const LIGHT_QUERY = '(prefers-color-scheme: light)';
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (isThemePreference(v)) return v;
  } catch {}
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_KEY}=([^;]*)`));
  const c = m ? decodeURIComponent(m[1]) : null;
  return isThemePreference(c) ? c : 'system';
}

function subscribePreference(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(LIGHT_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

const systemIsLight = () => window.matchMedia(LIGHT_QUERY).matches;
const resolve = (p: ThemePreference, light: boolean): ResolvedTheme => (p === 'system' ? (light ? 'light' : 'dark') : p);

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  setForced: (t: ResolvedTheme | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** System / Light / Dark preference, persisted in localStorage + a cookie. The inline THEME_SCRIPT applies it before paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribePreference, readPreference, () => 'system' as const);
  const light = useSyncExternalStore(subscribeSystem, systemIsLight, () => false);
  const [forced, setForced] = useState<ResolvedTheme | null>(null);
  const resolved = forced ?? resolve(preference, light);

  // Re-apply on every change — and after React's dev remount, which resets <html> attributes it doesn't own.
  // Reads the live sources so the hydration pass (server snapshot) never applies a stale value.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', forced ?? resolve(readPreference(), systemIsLight()));
  }, [forced, preference, light]);

  const setPreference = useCallback((p: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_KEY, p);
    } catch {}
    document.cookie = `${THEME_KEY}=${encodeURIComponent(p)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
    listeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference, setForced }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Pins the page to one theme while mounted (the live room stays dark). */
export function useForcedTheme(theme: ResolvedTheme) {
  const { setForced } = useTheme();
  useLayoutEffect(() => {
    setForced(theme);
    return () => setForced(null);
  }, [theme, setForced]);
}
