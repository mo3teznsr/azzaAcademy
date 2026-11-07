'use client';

import { ApiError } from '@/lib/api';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { useI18n } from '@/lib/i18n/provider';

type InstructorErrorCode = keyof Dictionary['instructors']['errors'];

/** Maps the instructor-application business-rule codes to translated copy; anything else keeps the API's message. */
export function useInstructorError() {
  const { t } = useI18n();
  return (e: unknown): string => {
    if (e instanceof ApiError && e.code in t.instructors.errors) return t.instructors.errors[e.code as InstructorErrorCode];
    return e instanceof Error ? e.message : String(e);
  };
}
