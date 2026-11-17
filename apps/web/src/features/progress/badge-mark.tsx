import { Award, BookOpen, CalendarCheck, CalendarRange, CircleCheckBig, Layers, Library, Lock, Radio, type LucideIcon } from 'lucide-react';
import type { BadgeId } from '@/lib/api';
import { cn } from '@/lib/utils';

const ICONS: Record<BadgeId, LucideIcon> = {
  FIRST_LESSON: BookOpen,
  FIRST_LIVE_CLASS: Radio,
  LESSONS_10: Layers,
  PERFECT_QUIZ: CircleCheckBig,
  STREAK_7: CalendarCheck,
  FIRST_CERTIFICATE: Award,
  LESSONS_50: Library,
  STREAK_30: CalendarRange,
};

/** A quiet round mark for a badge: filled when earned, outlined with a lock while not yet. */
export function BadgeMark({ id, earned, size = 'md' }: { id: BadgeId; earned: boolean; size?: 'sm' | 'md' }) {
  const Icon = ICONS[id];
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-9' : 'size-12',
        earned ? 'bg-sage text-sage-fg' : 'border border-dashed border-line-strong text-muted-foreground',
      )}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} strokeWidth={1.75} />
      {!earned && (
        <span className="absolute -bottom-0.5 -end-0.5 inline-flex size-4 items-center justify-center rounded-full border border-border bg-card">
          <Lock className="size-2.5" />
        </span>
      )}
    </span>
  );
}
