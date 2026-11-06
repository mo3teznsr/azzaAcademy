'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTitle, Panel } from '@/components/brand/section';
import { SessionSlate } from '@/components/brand/session-slate';
import { SessionStatusChip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import type { ScheduleItem } from '@/lib/api/types';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { isoDay, minutesUntil, sessionState, type SessionDisplayState } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { useMySchedule } from '../learn/hooks';
import { CalendarSubscribe } from './calendar-subscribe';

const DOT: Record<SessionDisplayState, string> = {
  LIVE: 'bg-onair',
  SOON: 'bg-sun',
  SCHEDULED: 'bg-sky-fg',
  MOVED: 'bg-peach-fg',
  ENDED: 'bg-stone',
  CANCELLED: 'bg-line-strong',
};

function monthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // Sunday-first
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function SchedulePage() {
  const { t, f } = useI18n();
  const params = useSearchParams();
  const batchFilter = params.get('batch');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => isoDay(new Date()));
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const q = useMySchedule(days[0]!, new Date(days[41]!.getTime() + 86400_000));
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const items = useMemo(() => (q.data ?? []).filter((s) => !batchFilter || s.batch.id === batchFilter), [q.data, batchFilter]);
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const s of items) {
      const k = isoDay(new Date(s.startsAt));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [items]);
  const selectedItems = byDay.get(selected) ?? [];
  const move = (delta: number) => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1));

  return (
    <>
      <PageTitle kicker={`${t.schedule.title} · ${gmtOffset(tz)}`} title={f.monthYear(anchor)} aside={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="icon" aria-label={t.common.previous} onClick={() => move(-1)}>
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button variant="outline" onClick={() => (setAnchor(new Date()), setSelected(isoDay(new Date())))}>
            {t.schedule.today}
          </Button>
          <Button variant="secondary" size="icon" aria-label={t.common.next} onClick={() => move(1)}>
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      } />
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {(['LIVE', 'SCHEDULED', 'MOVED', 'CANCELLED', 'ENDED'] as const).map((k) => (
          <span key={k} className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', DOT[k])} aria-hidden /> {t.schedule.legend[k]}
          </span>
        ))}
      </div>
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      <Tabs defaultValue="month">
        <TabsList>
          <TabsTrigger value="month">{t.schedule.month}</TabsTrigger>
          <TabsTrigger value="agenda">{t.schedule.agenda}</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-4">
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={f.monthYear(anchor)}>
              {days.slice(0, 7).map((d) => (
                <span key={`h${d.getDay()}`} className="label-mono pb-1 text-center text-muted-foreground" role="columnheader">
                  {f.weekdayName(d.getDay())}
                </span>
              ))}
              {days.map((d) => {
                const key = isoDay(d);
                const list = byDay.get(key) ?? [];
                const inMonth = d.getMonth() === anchor.getMonth();
                const isSel = key === selected;
                const isToday = key === isoDay(new Date());
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-selected={isSel}
                    onClick={() => setSelected(key)}
                    className={cn(
                      'flex min-h-20 flex-col items-start gap-1 rounded-xl p-2 text-start transition-colors',
                      isSel ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                      !inMonth && 'opacity-40',
                    )}
                  >
                    <b className={cn('font-display text-lg', isToday && !isSel && 'text-sun-fg')}>{f.number(d.getDate())}</b>
                    <span className="flex flex-wrap gap-1">
                      {list.slice(0, 4).map((s) => (
                        <span key={s.id} className={cn('size-1.5 rounded-full', DOT[sessionState(s)])} />
                      ))}
                    </span>
                    {list[0] && <span className="hidden w-full truncate text-[11px] md:block">{list[0].batch.code} · {f.time(list[0].startsAt)}</span>}
                  </button>
                );
              })}
            </div>
            <Panel aria-labelledby="sel">
              <span className="label-mono text-muted-foreground">{t.schedule.selectedDay}</span>
              <h2 id="sel" className="font-display text-3xl font-extrabold">
                {f.date(new Date(`${selected}T12:00:00`))}
              </h2>
              {q.isPending ? (
                <LoadingBlock rows={2} />
              ) : selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.schedule.nothingThatDay}</p>
              ) : (
                selectedItems.map((s) => <DayDetail key={s.id} s={s} />)
              )}
              <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-card p-4">
                <b>{t.schedule.syncTitle}</b>
                <span className="text-sm text-muted-foreground">{t.schedule.syncBody}</span>
                <CalendarSubscribe />
              </div>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="agenda" className="mt-4">
          {q.isPending ? (
            <LoadingBlock rows={5} />
          ) : items.length === 0 ? (
            <EmptyState title={t.schedule.empty} action={{ label: t.learn.browse, href: '/#catalog' }} />
          ) : (
            <ol className="flex flex-col gap-2">
              {items.map((s) => {
                const state = sessionState(s);
                return (
                  <li key={s.id}>
                    <SessionSlate
                      code={`${s.batch.code}·${sessionCode(s.number)}`}
                      day={f.weekday(s.startsAt)}
                      title={s.title}
                      state={state}
                      sub={`${f.dayMonth(s.startsAt)} · ${f.time(s.startsAt)}–${f.time(s.endsAt)}`}
                      trailing={<SessionStatusChip state={state} minutes={minutesUntil(s.startsAt)} />}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function DayDetail({ s }: { s: ScheduleItem }) {
  const { t, f, fill, pick } = useI18n();
  const state = sessionState(s);
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl p-4', state === 'LIVE' ? 'bg-onair text-onair-ink' : 'bg-card')}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono" dir="ltr">
          {s.batch.code}·{sessionCode(s.number)} · {f.time(s.startsAt)}–{f.time(s.endsAt)}
        </span>
        <SessionStatusChip state={state} minutes={minutesUntil(s.startsAt)} />
      </div>
      <b className="font-display text-2xl">{s.title}</b>
      <span className="text-sm opacity-80">
        {pick(s.batch.course.titleEn, s.batch.course.titleAr).text}
        {s.batch.teacher ? ` · ${s.batch.teacher.name}` : ''}
      </span>
      {s.movedFrom && <span className="text-sm text-peach-fg">{fill(t.schedule.movedFrom, { d: f.dateTime(s.movedFrom) })}</span>}
      {(state === 'LIVE' || state === 'SOON') && (
        <Button asChild variant={state === 'LIVE' ? 'ink' : 'onair'}>
          <Link href={`/live/${s.id}`}>
            <Radio /> {t.schedule.joinLive}
          </Link>
        </Button>
      )}
      {state === 'ENDED' && s.recordingUrl && (
        <Button asChild variant="outline">
          <Link href={`/library/${s.id}`}>{t.schedule.watch}</Link>
        </Button>
      )}
    </div>
  );
}
