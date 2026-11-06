'use client';

import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { ApiError, type StudentQuizStatus } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

type QuizErrorCode = keyof ReturnType<typeof useI18n>['t']['learning']['quizzes']['errors'];

/** API error → a sentence in the reader's language (falls back to the server message). */
export function useQuizError() {
  const { t } = useI18n();
  return (e: unknown): string => {
    if (e instanceof ApiError && e.code in t.learning.quizzes.errors) return t.learning.quizzes.errors[e.code as QuizErrorCode];
    return e instanceof Error ? e.message : String(e);
  };
}

const STATUS_TONE: Record<StudentQuizStatus, ChipTone> = { OPEN: 'sun', IN_PROGRESS: 'sky', SUBMITTED: 'sage', MISSED: 'danger' };

export function QuizStatusChip({ status }: { status: StudentQuizStatus }) {
  const { t } = useI18n();
  return <Chip tone={STATUS_TONE[status]}>{t.learning.quizzes.status[status]}</Chip>;
}

/** Points with at most 2 decimals (partial credit), in the reader's digits. */
export function usePoints() {
  const { f } = useI18n();
  return (n: number | null | undefined) => f.number(n ?? 0, { maximumFractionDigits: 2 });
}

/** mm:ss (or h:mm:ss) countdown text, always Western digits and LTR. */
export function clock(secs: number) {
  const s = Math.max(0, Math.ceil(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
