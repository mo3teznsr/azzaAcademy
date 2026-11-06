'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';

/** Five stars filled to `value` (0–5, halves rounded to the nearest half). Decorative; pair it with text. */
export function Stars({ value, className, size = 'size-4' }: { value: number; className?: string; size?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-sun-fg', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('relative inline-block', size)}>
          <Star className={cn('absolute inset-0 text-line-strong', size)} />
          {rounded >= i - 0.5 && (
            <span className={cn('absolute inset-y-0 start-0 overflow-hidden', rounded >= i ? 'w-full' : 'w-1/2')}>
              <Star className={cn('fill-current', size)} />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** "★★★★☆ 4.6 (128)" — hidden by callers when there are no ratings. */
export function RatingInline({ avg, count, className }: { avg: number; count: number; className?: string }) {
  const { t, f, fill } = useI18n();
  const label = `${fill(t.reviews.outOf, { avg: f.number(avg, { maximumFractionDigits: 1 }) })} · ${f.plural(count, t.reviews.count)}`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)} role="img" aria-label={label}>
      <Stars value={avg} size="size-3.5" />
      <b className="text-foreground">{f.number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
      <span className="text-muted-foreground">({f.number(count)})</span>
    </span>
  );
}
