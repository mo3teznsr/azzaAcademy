'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { batchPriceFils, describeRule } from '@/lib/schedule';
import { gmtOffset } from '@/lib/i18n/format';
import type { BatchSummary } from '@/lib/api/types';
import { BatchStatusChip } from './status-chip';
import { InitialsAvatar } from './initials-avatar';

/** The core choice: one batch = one schedule, one teacher (Components.dc.html · Batch card). */
export function BatchCard({
  batch,
  seatsTaken,
  selected,
  onSelect,
  className,
}: {
  batch: BatchSummary;
  seatsTaken?: number;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const taken = seatsTaken ?? batch._count?.enrollments ?? 0;
  const pct = batch.capacity ? Math.min(100, Math.round((taken / batch.capacity) * 100)) : 0;
  const sessionsTotal = batch.schedule?.sessionCount ?? batch._count?.sessions ?? 0;
  const hours = batch.schedule ? (batch.schedule.sessionCount * batch.schedule.durationMin) / 60 : 0;
  const Comp = onSelect ? 'button' : 'div';
  return (
    <Comp
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={onSelect ? !!selected : undefined}
      className={cn(
        'flex w-full flex-col gap-3.5 rounded-2xl border bg-card p-5 text-start transition-colors duration-200',
        selected ? 'border-foreground' : 'border-transparent hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[34px] font-extrabold leading-none" dir="ltr">
          {batch.code}
        </span>
        <BatchStatusChip status={batch.status} taken={taken} capacity={batch.capacity} />
      </div>
      <div className="font-display text-[22px] font-medium leading-tight">{describeRule(batch, f)}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span>
          {f.dayMonth(batch.startsOn, batch.timezone)} → {f.dayMonth(batch.endsOn, batch.timezone)}
        </span>
        <span>{f.plural(sessionsTotal, t.common.sessions)}</span>
        {hours > 0 && <span>{fill(t.course.totalHours, { h: f.number(hours, { maximumFractionDigits: 1 }) })}</span>}
        <span>
          {t.status.sessionLanguage[batch.language]} · <bdi dir="ltr">{gmtOffset(batch.timezone)}</bdi>
        </span>
      </div>
      <div className="h-1 rounded bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={fill(t.course.seatsOf, { n: taken, c: batch.capacity })}>
        <div className="h-1 rounded bg-green" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm">
          <InitialsAvatar name={batch.teacher.name} size={32} />
          <bdi>{batch.teacher.name}</bdi>
        </span>
        <b className="text-lg">{money.display(batchPriceFils(batch))}</b>
      </div>
    </Comp>
  );
}
