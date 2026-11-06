'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchStatusChip, Chip, SessionStatusChip } from '@/components/brand/status-chip';
import { SessionSlate } from '@/components/brand/session-slate';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { batchesApi, type ScheduleItem } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset, sessionCode, slate, timecode } from '@/lib/i18n/format';
import { describeRule, minutesUntil, sessionState } from '@/lib/schedule';
import { useNow } from '@/lib/use-now';
import { useMySchedule } from '../learn/hooks';

export function StudioHome() {
  const { t, f, fill, pick } = useI18n();
  const { user } = useAuth();
  const [range] = useState(() => ({ from: new Date(Date.now() - 7 * 86400_000), to: new Date(Date.now() + 14 * 86400_000) }));
  const schedule = useMySchedule(range.from, range.to);
  const p = { teacherId: user?.id, pageSize: 50 };
  const batches = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p), enabled: !!user });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useNow(30_000);
  const upcoming = useMemo(() => (schedule.data ?? []).filter((s) => s.status === 'LIVE' || (s.status === 'SCHEDULED' && new Date(s.endsAt).getTime() > now)), [schedule.data, now]);
  const ended = useMemo(() => (schedule.data ?? []).filter((s) => s.status === 'ENDED').reverse().slice(0, 4), [schedule.data]);
  const hour = new Date().getHours();
  const first = user?.name?.split(' ')[0] ?? '';

  return (
    <>
      <PageTitle
        kicker={`${f.dateLong(new Date())} · ${gmtOffset(tz)}`}
        title={fill(hour < 12 ? t.studio.greetingMorning : t.studio.greeting, { name: first }).replace(/[،,]\s*\./, '.')}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/studio/courses/new">
                <Plus /> {t.studio.proposeCourse}
              </Link>
            </Button>
            <Button asChild variant="ink">
              <Link href="/studio/batches/new">
                <Plus /> {t.studio.newBatch}
              </Link>
            </Button>
          </div>
        }
      />
      {schedule.isPending ? (
        <LoadingBlock rows={1} height={240} />
      ) : schedule.isError ? (
        <ErrorState error={schedule.error} onRetry={() => void schedule.refetch()} />
      ) : upcoming[0] ? (
        <NextTake s={upcoming[0]} />
      ) : (
        <EmptyState title={t.studio.noUpcoming} />
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel aria-labelledby="week">
          <SectionHeader title={<span id="week">{t.studio.thisWeek}</span>} />
          {schedule.isPending ? (
            <LoadingBlock rows={4} />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.studio.noUpcoming}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {upcoming.slice(0, 8).map((s) => {
                const st = sessionState(s);
                return (
                  <li key={s.id}>
                    <Link href={`/studio/sessions/${s.id}`} className="block no-underline text-foreground">
                      <SessionSlate
                        code={`${s.batch.code}·${sessionCode(s.number)}`}
                        day={f.weekday(s.startsAt)}
                        title={s.title}
                        state={st}
                        sub={`${f.dayMonth(s.startsAt)} · ${f.time(s.startsAt)}–${f.time(s.endsAt)}`}
                        trailing={<SessionStatusChip state={st} minutes={minutesUntil(s.startsAt)} />}
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
        <Panel aria-labelledby="reports">
          <SectionHeader title={<span id="reports">{t.studio.reports}</span>} />
          {ended.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.studio.reportPage.noAttendance}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ended.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-card p-3.5">
                  <div className="min-w-0">
                    <b className="block truncate text-[15px]">
                      <bdi dir="ltr">{slate(s.batch.code, s.number)}</bdi> · {s.title}
                    </b>
                    <span className="text-[13px] text-muted-foreground">{f.dateTime(s.startsAt)}</span>
                  </div>
                  <Link href={`/studio/sessions/${s.id}/report`} className="link-sun text-sm">
                    {t.studio.report}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <section aria-labelledby="mybatches" className="flex flex-col gap-4">
        <SectionHeader title={<span id="mybatches">{t.studio.myBatches}</span>} size="lg" />
        <QueryView query={batches} isEmpty={(d) => d.items.length === 0} loading={<LoadingBlock rows={2} height={160} />} empty={<EmptyState title={t.studio.noBatches} action={{ label: t.studio.newBatch, href: '/studio/batches/new' }} />}>
          {(d) => (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
              {d.items.map((b) => (
                <Link key={b.id} href={`/studio/batches/${b.id}`} className="flex flex-col gap-3 rounded-[20px] bg-card p-5 text-foreground no-underline hover:bg-accent">
                  <div className="flex items-center justify-between">
                    <b className="font-display text-3xl font-extrabold" dir="ltr">
                      {b.code}
                    </b>
                    <BatchStatusChip status={b.status} />
                  </div>
                  <b>{pick(b.course.titleEn, b.course.titleAr).text}</b>
                  <span className="text-[13px] text-muted-foreground">{describeRule(b, f)}</span>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="label-mono text-muted-foreground">{t.studio.seats}</dt>
                      <dd>
                        {f.number(b._count?.enrollments ?? 0)}/{f.number(b.capacity)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-mono text-muted-foreground">{t.studio.sessions}</dt>
                      <dd>{f.number(b._count?.sessions ?? b.schedule?.sessionCount ?? 0)}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </QueryView>
      </section>
    </>
  );
}

function NextTake({ s }: { s: ScheduleItem }) {
  const { t, f, fill, pick } = useI18n();
  const now = useNow();
  const secs = (new Date(s.startsAt).getTime() - now) / 1000;
  const live = s.status === 'LIVE';
  const lobbyOpen = live || secs <= 15 * 60;
  return (
    <section className="flex flex-wrap items-end justify-between gap-8 rounded-[28px] bg-sun p-[clamp(1.5rem,3vw,2.5rem)] text-ink">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
        <Chip tone="ink">{live ? t.status.session.LIVE : fill(t.studio.nextTake, { s: sessionCode(s.number) })}</Chip>
        <h2 className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.88]">{s.title}</h2>
        <span>
          {pick(s.batch.course.titleEn, s.batch.course.titleAr).text} · <bdi dir="ltr">{s.batch.code}</bdi> · {f.time(s.startsAt)}–{f.time(s.endsAt)}
        </span>
        <span className="text-sm">{t.studio.recordingNote}</span>
      </div>
      <div className="flex flex-col items-start gap-3">
        {!live && <span className="timecode text-5xl leading-none">{timecode(Math.max(0, secs))}</span>}
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="ink" size="lg" disabled={!lobbyOpen}>
            <Link href={`/studio/live/${s.id}`}>
              <Radio /> {t.studio.openLobby}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-ink text-ink hover:bg-ink/10">
            <Link href={`/studio/sessions/${s.id}`}>{t.studio.prep}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
