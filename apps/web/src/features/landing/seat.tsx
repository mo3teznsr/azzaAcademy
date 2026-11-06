'use client';

import { cn } from '@/lib/utils';

/**
 * The seat: Azza's motif (docs/LANDING.md). A small rounded square: green = a taken / lit seat,
 * outline = an empty one, `pulse` = the live seat. Decorative; the meaning is always in text beside it.
 */
export function Seat({ state = 'lit', className }: { state?: 'lit' | 'empty' | 'pulse' | 'onair'; className?: string }) {
  return (
    <span
      aria-hidden
      data-seat={state}
      className={cn(
        'landing-seat relative inline-block size-[0.62em] shrink-0 rounded-[0.18em] align-[0.05em]',
        state === 'empty' ? 'border-[1.5px] border-current opacity-50' : state === 'onair' ? 'bg-onair' : 'bg-green',
        className,
      )}
    />
  );
}

/** A row of seats with one lit: the divider between programme items. */
export function SeatRule({ count = 9, lit = 4, className }: { count?: number; lit?: number; className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center gap-2 text-[14px] text-line-strong', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Seat key={i} state={i === lit ? 'pulse' : 'empty'} className={i === lit ? '' : 'opacity-100'} />
      ))}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Kicker line: a seat bullet, then the mono label. */
export function Kicker({ children, className, seat = 'lit' }: { children: React.ReactNode; className?: string; seat?: 'lit' | 'empty' | 'pulse' | 'onair' }) {
  return (
    <span className={cn('label-mono flex items-center gap-2', className)}>
      <Seat state={seat} className="text-[14px]" />
      {children}
    </span>
  );
}
