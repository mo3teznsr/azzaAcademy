import { useSyncExternalStore } from 'react';

/**
 * Cookie consent for analytics and ad pixels (GA4, Meta, TikTok, Snap).
 *
 * The choice lives in a first-party cookie for 12 months. Until the visitor picks "Accept analytics" no
 * third-party script loads. First-party attribution capture (`captureAttribution` in `analytics.ts`) runs
 * regardless: it is needed to credit sign-ups and orders to the campaign that brought them, stays on our
 * domain and holds no third-party identifier.
 */

export type Consent = 'analytics' | 'necessary';

export const CONSENT_COOKIE = 'azza_consent';
const TWELVE_MONTHS = 60 * 60 * 24 * 365;
const OPEN_EVENT = 'azza:consent-open';
const CHANGE_EVENT = 'azza:consent-change';

/** First-party cookies the pixels set, removed when consent is withdrawn. */
const PIXEL_COOKIES = /^(_ga(_.*)?|_gid|_gat.*|_fbp|_fbc|_ttp|_tt_enable_cookie|_scid.*|_sctr)$/;

/** Pure: the stored choice in a `document.cookie` string, or null when none was made (or it is unreadable). */
export function consentFrom(cookie: string): Consent | null {
  const raw = cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1);
  return raw === 'analytics' || raw === 'necessary' ? raw : null;
}

export function readConsent(): Consent | null {
  return typeof document === 'undefined' ? null : consentFrom(document.cookie);
}

export function writeConsent(choice: Consent) {
  const before = readConsent();
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${TWELVE_MONTHS}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (before === 'analytics' && choice === 'necessary') {
    // Loaded scripts cannot be unloaded: clear what they stored and start a clean page without them.
    const host = location.hostname.split('.').slice(-2).join('.');
    for (const name of document.cookie.split('; ').map((c) => c.split('=')[0]!)) {
      if (!PIXEL_COOKIES.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${host}`;
    }
    location.reload();
  }
}

/** Reopens the banner (the footer's "Cookie settings"). */
export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentOpen(fn: () => void) {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}

function subscribe(fn: () => void) {
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

/**
 * The visitor's choice: `undefined` while rendering on the server (unknown, so nothing third-party renders and
 * the banner waits for the browser), `null` when no choice is stored yet.
 */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, readConsent, () => undefined);
}
