'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { progressApi, type LearnerProgress, type UpdateLearningGoalInput } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { useI18n } from '@/lib/i18n/provider';
import { qk } from '@/lib/query-keys';

export function useProgress() {
  return useQuery({ queryKey: qk.progress, queryFn: progressApi.summary });
}

export function useBadges() {
  return useQuery({ queryKey: qk.badges, queryFn: progressApi.badges, select: (r) => r.items });
}

/** Save or remove the weekly goal; the response is the fresh summary. */
export function useGoalMutation() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const apiError = useApiError();
  return useMutation({
    mutationFn: (input: UpdateLearningGoalInput | null) => (input ? progressApi.setGoal(input) : progressApi.clearGoal()),
    onSuccess: (summary: LearnerProgress, input) => {
      qc.setQueryData(qk.progress, summary);
      toast.success(input ? t.progress.saved : t.progress.removed);
    },
    onError: (e) => toast.error(apiError(e)),
  });
}

/** Seven days of the week starting Monday (YYYY-MM-DD). */
export function weekDays(start: string): string[] {
  const [y, m, d] = start.split('-').map(Number) as [number, number, number];
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}

/** A YYYY-MM-DD day as an instant at noon UTC, so formatting in UTC never shifts the date. */
export const noonUtc = (day: string) => `${day}T12:00:00Z`;
