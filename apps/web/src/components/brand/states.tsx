'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { UseQueryResult } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { SignalMark } from './signal-mark';

export function LoadingBlock({ rows = 3, className, height = 64 }: { rows?: number; className?: string; height?: number }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-live="polite">
      <span className="sr-only">{t.common.loading}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full rounded-[14px] bg-muted" style={{ height }} />
      ))}
    </div>
  );
}

export function LoadingGrid({ count = 6, height = 260, className }: { count?: number; height?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4', className)} role="status">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="rounded-2xl bg-muted" style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-2 p-7 text-center in-data-[theme=cream]:border-cream-line', className)}>
      <SignalMark state="ended" size={36} />
      <b className="font-display text-2xl">{title}</b>
      {body && <span className="max-w-md text-sm text-muted-foreground">{body}</span>}
      {action &&
        (action.href ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, compact }: { error: unknown; onRetry?: () => void; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const apiErr = error instanceof ApiError ? error : null;
  const message = apiErr?.isNetwork ? t.common.networkError : apiErr?.isForbidden ? t.common.forbiddenBody : (apiErr?.message ?? t.common.errorBody);
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-danger-line bg-danger-bg p-4 text-danger-fg',
        !compact && 'items-start p-5',
        className,
      )}
    >
      {!compact && <b className="font-display text-xl text-ivory">{apiErr?.isNotFound ? t.common.notFoundTitle : t.common.errorTitle}</b>}
      <span className="text-sm">{message}</span>
      {apiErr && apiErr.code && !apiErr.isNetwork && <span className="label-mono opacity-70">{apiErr.code}</span>}
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry} className="mt-1">
          <RotateCw /> {t.common.retry}
        </Button>
      )}
    </div>
  );
}

/** Renders loading / error / empty / data for a query — every page uses it. */
export function QueryView<T>({
  query,
  loading,
  empty,
  isEmpty,
  children,
}: {
  query: Pick<UseQueryResult<T>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch'>;
  loading?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <LoadingBlock />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data as T;
  if (empty && (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0)) return <>{empty}</>;
  return <>{children(data)}</>;
}
