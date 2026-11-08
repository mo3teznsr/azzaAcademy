'use client';

import { useI18n } from '@/lib/i18n/provider';

/** Turns known server error codes into localised copy; anything else keeps the server's own message. */
export function useApiError() {
  const { t } = useI18n();
  return (e: unknown, fallback?: string): string => {
    const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
    if (typeof code === 'string' && code in t.apiErrors) return t.apiErrors[code as keyof typeof t.apiErrors];
    const message = typeof e === 'object' && e !== null ? (e as { message?: unknown }).message : undefined;
    return typeof message === 'string' && message ? message : (fallback ?? t.auth.errors.generic);
  };
}
