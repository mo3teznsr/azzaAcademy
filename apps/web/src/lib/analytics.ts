import { ATTRIBUTION_COOKIE, ATTRIBUTION_KEYS, cleanAttribution, type Attribution } from '@azza/shared';

/** Funnel events, named as GA4 recommends. */
export type AnalyticsEvent = 'sign_up' | 'view_item' | 'begin_checkout' | 'purchase' | 'subscribe';

export interface EventParams {
  /** Course id or slug. */
  item_id?: string;
  item_name?: string;
  /** In AED (not fils). */
  value?: number;
  currency?: 'AED';
  transaction_id?: string;
  method?: string;
}

type Fn = (...args: unknown[]) => void;
type PixelWindow = Window & { gtag?: Fn; fbq?: Fn; ttq?: { track: Fn; page: Fn }; snaptr?: Fn };

const META_EVENTS: Record<AnalyticsEvent, string> = {
  sign_up: 'CompleteRegistration',
  view_item: 'ViewContent',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  subscribe: 'Subscribe',
};
const TIKTOK_EVENTS: Record<AnalyticsEvent, string> = {
  sign_up: 'CompleteRegistration',
  view_item: 'ViewContent',
  begin_checkout: 'InitiateCheckout',
  purchase: 'CompletePayment',
  subscribe: 'Subscribe',
};
const SNAP_EVENTS: Record<AnalyticsEvent, string> = {
  sign_up: 'SIGN_UP',
  view_item: 'VIEW_CONTENT',
  begin_checkout: 'START_CHECKOUT',
  purchase: 'PURCHASE',
  subscribe: 'SUBSCRIBE',
};

/** Sends a funnel event to every pixel that is loaded (none in development unless their ids are set). Never throws. */
export function track(event: AnalyticsEvent, params: EventParams = {}) {
  if (typeof window === 'undefined') return;
  const w = window as PixelWindow;
  try {
    w.gtag?.('event', event, params);
    w.fbq?.('track', META_EVENTS[event], { content_ids: params.item_id ? [params.item_id] : undefined, content_name: params.item_name, value: params.value, currency: params.currency });
    w.ttq?.track(TIKTOK_EVENTS[event], { content_id: params.item_id, content_name: params.item_name, value: params.value, currency: params.currency });
    w.snaptr?.('track', SNAP_EVENTS[event], { item_ids: params.item_id ? [params.item_id] : undefined, price: params.value, currency: params.currency, transaction_id: params.transaction_id });
  } catch {
    // A broken pixel must never break the page.
  }
}

/** A page view for single-page navigations (the pixels count the first load themselves). */
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  const w = window as PixelWindow;
  try {
    w.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href });
    w.fbq?.('track', 'PageView');
    w.ttq?.page();
    w.snaptr?.('track', 'PAGE_VIEW');
  } catch {
    // ignore
  }
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

/** Pure: the attribution in a landing URL and referrer, or null when the visit carries none (direct or internal). */
export function attributionFrom(url: string, referrer: string): Attribution | null {
  const u = new URL(url);
  const raw: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = u.searchParams.get(key);
    if (v) raw[key] = v;
  }
  const external = referrer && (() => {
    try {
      return new URL(referrer).host !== u.host;
    } catch {
      return false;
    }
  })();
  if (external) raw.referrer = referrer;
  if (!Object.keys(raw).length) return null;
  raw.landing = u.pathname;
  return cleanAttribution(raw);
}

/** First touch wins: remembers where this visitor first came from, for 30 days, unless already remembered. */
export function captureAttribution() {
  if (typeof document === 'undefined' || readAttribution()) return;
  const found = attributionFrom(window.location.href, document.referrer);
  if (!found) return;
  document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(found))}; Max-Age=${THIRTY_DAYS}; Path=/; SameSite=Lax`;
}

/** The remembered first touch, or null. */
export function readAttribution(): Attribution | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
  if (!hit) return null;
  try {
    return cleanAttribution(decodeURIComponent(hit.slice(ATTRIBUTION_COOKIE.length + 1)));
  } catch {
    return null;
  }
}
