'use client';

import type { LearnerProgress } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { noonUtc, weekDays } from './hooks';

/** Monday to Sunday: filled for a learning day, dashed for a day the weekly freeze covered. Follows the reading direction. */
export function WeekStrip({ progress }: { progress: LearnerProgress }) {
  const { t, f, fill } = useI18n();
  const learned = new Set(progress.week.days);
  const frozen = new Set(progress.streak.frozenDays);
  return (
    <ol aria-label={t.progress.weekLabel} className="grid grid-cols-7 gap-1.5">
      {weekDays(progress.week.start).map((day) => {
        const isToday = day === progress.today;
        const ahead = day > progress.today;
        const state = learned.has(day) ? 'learned' : frozen.has(day) ? 'frozen' : ahead || isToday ? 'ahead' : 'missed';
        const label = fill(
          state === 'learned' ? t.progress.dayLearned : state === 'frozen' ? t.progress.dayFrozen : state === 'ahead' ? t.progress.dayAhead : t.progress.dayMissed,
          { d: f.date(noonUtc(day), 'UTC') },
        );
        return (
          <li key={day} className="flex flex-col items-center gap-1.5" aria-label={label} aria-current={isToday ? 'date' : undefined}>
            <span className={cn('text-[11px] text-muted-foreground', isToday && 'font-semibold text-foreground')} aria-hidden>
              {f.weekday(noonUtc(day), 'UTC')}
            </span>
            <span
              aria-hidden
              className={cn(
                'size-7 rounded-full transition-colors',
                state === 'learned' && 'bg-sun',
                state === 'frozen' && 'border-2 border-dashed border-sun/60',
                state === 'missed' && 'bg-muted',
                state === 'ahead' && 'border border-border',
                isToday && 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-card',
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

/** Goal progress as segments (one per day or lesson) for small targets, a bar for larger ones. */
export function GoalMeter({ progress, target, label }: { progress: number; target: number; label: string }) {
  const done = Math.min(progress, target);
  if (target > 10) {
    const pct = Math.round((done / target) * 100);
    return (
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={target} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-sun transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={target} aria-valuenow={done} className="flex gap-1">
      {Array.from({ length: target }, (_, i) => (
        <span key={i} aria-hidden className={cn('h-2 flex-1 rounded-full transition-colors', i < done ? 'bg-sun' : 'bg-muted')} />
      ))}
    </div>
  );
}
