/** Where a visitor came from: campaign tags, ad click ids, the referring site and the first page they landed on. */
export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ttclid',
  'sccid',
  'referrer',
  'landing',
  /** A referral code from an invite link (`?ref=CODE`). */
  'ref',
] as const;
export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

/** The name of the first-party cookie that remembers the first touch for 30 days. */
export const ATTRIBUTION_COOKIE = 'azza_attr';

const MAX_VALUE = 300;

/**
 * Pure: keeps only the known keys with non-empty string values (trimmed, capped at 300 characters).
 * Accepts an object or its JSON text; anything else gives null.
 */
export function cleanAttribution(raw: unknown): Attribution | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, MAX_VALUE);
  }
  return Object.keys(out).length ? out : null;
}
