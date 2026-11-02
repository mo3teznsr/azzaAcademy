'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SessionDisplayState } from '@/lib/schedule';

/** Session row as a film slate: S05 / day, title, sub-line, trailing action (Components.dc.html). */
export function SessionSlate({
  code,
  day,
  title,
  sub,
  state = 'SCHEDULED',
  trailing,
  className,
}: {
  code: string;
  day: string;
  title: ReactNode;
  sub?: ReactNode;
  state?: SessionDisplayState;
  trailing?: ReactNode;
  className?: string;
}) {
  const live = state === 'LIVE';
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-[14px] p-3.5',
        live ? 'bg-onair text-ink' : 'bg-card',
        state === 'MOVED' && 'border border-dashed border-peach bg-transparent',
        state === 'CANCELLED' && 'opacity-60',
        className,
      )}
    >
      <div className="flex w-16 shrink-0 flex-col">
        <span className={cn('label-mono', live ? 'text-ink' : 'text-muted-foreground')} dir="ltr">
          {code}
        </span>
        <b className="font-display text-xl leading-tight">{day}</b>
      </div>
      <div className="min-w-0 flex-1">
        <b className={cn('block truncate text-[15px]', state === 'CANCELLED' && 'line-through')}>{title}</b>
        {sub && <div className={cn('text-[13px]', live ? 'text-ink' : state === 'MOVED' ? 'text-peach' : 'text-muted-foreground')}>{sub}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
