import Link from 'next/link';
import { cn } from '@/lib/utils';

export type SignalState = 'scheduled' | 'starting' | 'live' | 'ended';

// The -fg accents equal the raw accents on ink and darken on cream, so the mark stays visible in light mode.
const COLOR: Record<SignalState, string> = {
  scheduled: 'var(--sky-fg)',
  starting: 'var(--sun-fg)',
  live: 'var(--onair-fg)',
  ended: 'var(--muted-foreground)',
};

/** The "signal" motif: a dot with two arcs. Arcs pulse only while a room is live. */
export function SignalMark({ state = 'live', size = 24, className, title }: { state?: SignalState; size?: number; className?: string; title?: string }) {
  const color = COLOR[state];
  const arcs = state !== 'ended';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
      style={{ direction: 'ltr' }}
    >
      <circle cx="12" cy="12" r="3.2" fill={color} />
      {arcs && (
        <path
          d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          className={state === 'live' ? 'signal-arc-live' : undefined}
          opacity={state === 'scheduled' ? 0.6 : 1}
        />
      )}
    </svg>
  );
}

export function Logo({ href = '/', className, suffix }: { href?: string; className?: string; suffix?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 text-foreground no-underline', className)} aria-label="عازة Azza">
      <LogoMark className="h-9 light:text-ink" />
      {suffix && <span className="label-mono text-muted-foreground ms-auto">{suffix}</span>}
    </Link>
  );
}

/** The عازة logo, painted in the current text colour through a mask (ink #102018 on light grounds, cream #F1F1E9 on dark). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block aspect-[1210/767] bg-current', className)}
      style={{ maskImage: 'url(/brand/logo-mask.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }}
    />
  );
}
