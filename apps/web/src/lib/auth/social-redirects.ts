import { safeNext } from './roles';

/**
 * Absolute return URLs for Google/Apple sign-in. The provider sends the browser back through the API, so these must be full
 * URLs on this site (and this origin must be in the API's TRUSTED_ORIGINS). `/auth/continue` then applies `landingFor`.
 */
export function socialCallbackURLs(origin: string, next: string | null | undefined, from: '/sign-in' | '/sign-up') {
  const safe = safeNext(next);
  const q = safe ? `?next=${encodeURIComponent(safe)}` : '';
  return { callbackURL: `${origin}/auth/continue${q}`, errorCallbackURL: `${origin}${from}${q}` };
}

/** better-auth puts `?error=<code>` on the return URL when a provider sign-in fails; `/auth/continue` uses `no_session`. */
export function socialErrorKind(code: string | null | undefined): 'linkRefused' | 'failed' | null {
  const c = (code ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!c) return null;
  return c === 'account_not_linked' ? 'linkRefused' : 'failed';
}
