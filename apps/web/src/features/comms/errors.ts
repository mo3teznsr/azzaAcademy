'use client';

import { ApiError } from '@/lib/api';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { useI18n } from '@/lib/i18n/provider';

type CommsErrorCode = Exclude<keyof Dictionary['comms']['errors'], 'generic'>;

/** Chat / announcement / support API errors → a friendly sentence in the reader's language. */
export function useCommsError() {
  const { t } = useI18n();
  return (e: unknown): string => {
    if (e instanceof ApiError) {
      if (e.isNetwork) return t.common.networkError;
      if (e.code in t.comms.errors) return t.comms.errors[e.code as CommsErrorCode];
      if (e.status === 429) return t.comms.errors.RATE_LIMITED;
      if (e.isForbidden) return t.comms.errors.FORBIDDEN;
      if (e.isNotFound) return t.comms.errors.NOT_FOUND;
      return t.comms.errors.generic;
    }
    return t.comms.errors.generic;
  };
}

/** Day bucket label for a thread: Today / Yesterday / a short date. */
export function useDayLabel() {
  const { t, f } = useI18n();
  return (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t.comms.chat.today;
    if (d.toDateString() === y.toDateString()) return t.comms.chat.yesterday;
    return f.date(d);
  };
}
