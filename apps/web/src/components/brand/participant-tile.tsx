import { MicOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InitialsAvatar } from './initials-avatar';

/** Presentational participant tile (speaking ring · muted · hand · weak network). Video slot optional. */
export function ParticipantTileFrame({
  name,
  label,
  speaking,
  muted,
  hand,
  weak,
  children,
  className,
}: {
  name: string;
  label?: string;
  speaking?: boolean;
  muted?: boolean;
  hand?: string;
  weak?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl bg-ink-3 transition-shadow duration-300',
        speaking && 'shadow-[inset_0_0_0_3px_var(--sun)]',
        className,
      )}
    >
      {children ?? <InitialsAvatar name={name} size={64} className={cn(weak && 'opacity-55')} />}
      {hand && <span className="absolute end-2.5 top-2.5 rounded-full bg-sun px-2 py-1 text-xs font-bold text-ink">{hand}</span>}
      {weak && (
        <span className="absolute start-2.5 top-2.5 flex items-end gap-0.5" aria-hidden>
          <span className="h-1.5 w-1 bg-onair" />
          <span className="h-2.5 w-1 bg-line-2" />
          <span className="h-3.5 w-1 bg-line-2" />
        </span>
      )}
      <span className="absolute bottom-2.5 start-2.5 flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs text-ivory">
        {muted && <MicOff className="size-3.5" aria-label="muted" />}
        <bdi>{label ?? name}</bdi>
      </span>
    </div>
  );
}
