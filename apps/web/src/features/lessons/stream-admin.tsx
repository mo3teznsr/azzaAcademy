'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { streamingApi } from '@/lib/api/streaming';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : String(e));

/**
 * Admins only: the adaptive-streaming state of a saved lesson's uploaded video, with "Prepare for streaming". Hidden when
 * the video service is not configured (the API answers 503) or for anyone else.
 */
export function LessonStreamStatus({ lessonId }: { lessonId: string }) {
  const { role } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const key = ['lesson-stream', lessonId];
  const admin = role === 'ADMIN';
  const q = useQuery({
    queryKey: key,
    queryFn: () => streamingApi.status(lessonId),
    enabled: admin,
    retry: false,
    // Poll while encoding.
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 15_000 : false),
  });
  const prepare = useMutation({
    mutationFn: () => streamingApi.prepare(lessonId),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
      toast.success(t.video.prepareStarted);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const refresh = useMutation({
    mutationFn: () => streamingApi.refresh(lessonId),
    onSuccess: (data) => qc.setQueryData(key, data),
    onError: (e) => toast.error(errorText(e)),
  });
  if (!admin || !q.data) return null;
  const s = q.data;
  const label =
    s.status === 'READY'
      ? t.video.streamReady
      : s.status === 'PROCESSING'
        ? t.video.streamPreparing
        : s.status === 'FAILED'
          ? t.video.streamFailed
          : t.video.streamNone;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm" role="status">
      <span className={cn('size-2 rounded-full', s.status === 'READY' ? 'bg-green' : s.status === 'FAILED' ? 'bg-destructive' : s.status === 'PROCESSING' ? 'animate-pulse bg-peach-fg' : 'bg-muted-foreground')} aria-hidden />
      <span className="me-auto">{label}</span>
      {s.status === 'PROCESSING' && (
        <Button type="button" size="sm" variant="ghost" onClick={() => refresh.mutate()} disabled={refresh.isPending} aria-label={t.video.refresh}>
          <RefreshCw className={cn('size-4', refresh.isPending && 'animate-spin')} aria-hidden />
        </Button>
      )}
      {(s.status === null || s.status === 'FAILED') && (
        <Button type="button" size="sm" variant="outline" onClick={() => prepare.mutate()} disabled={prepare.isPending}>
          {s.status === 'FAILED' ? t.video.prepareAgain : t.video.prepare}
        </Button>
      )}
    </div>
  );
}
