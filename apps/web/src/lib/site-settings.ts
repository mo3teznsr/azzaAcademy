'use client';

import { useQuery } from '@tanstack/react-query';
import { siteApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';

/** Public contact details and socials. Never blocks the page: callers hide whatever isn't set. */
export function useSiteSettings() {
  return useQuery({ queryKey: qk.siteSettings, queryFn: siteApi.settings, staleTime: 5 * 60_000, retry: 1 });
}

/** Digits only, country code included. Anything else is treated as "not set". */
export const WHATSAPP_RE = /^\d{8,15}$/;

export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  if (!number || !WHATSAPP_RE.test(number)) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
