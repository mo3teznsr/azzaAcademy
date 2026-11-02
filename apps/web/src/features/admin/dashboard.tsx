'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Chip, SessionStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader, StatTile } from '@/components/brand/section';
import { ErrorState, LoadingBlock, LoadingGrid } from '@/components/brand/states';
import { adminApi, type DashboardAlertType } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { gmtOffset, slate, timecode } from '@/lib/i18n/format';
import { minutesUntil, sessionState } from '@/lib/schedule';
import { useNow } from '@/lib/use-now';

const ALERT_HREF: Record<DashboardAlertType, string> = {
  TRANSFERS_TO_VERIFY: '/admin/transfers',
  SEAT_HOLDS_EXPIRING: '/admin/payments',
  TEACHER_BANK_UNVERIFIED: '/admin/payouts',
  PAYOUTS_HELD: '/admin/payouts',
};

export function AdminDashboard() {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const { user } = useAuth();
  const q = useQuery({ queryKey: qk.admin.dashboard, queryFn: adminApi.dashboard, refetchInterval: 60_000 });
  const live = useQuery({ queryKey: qk.admin.liveRooms, queryFn: adminApi.liveRooms, refetchInterval: 30_000 });
  const now = useNow(1000);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = q.data;
  const liveRooms = live.data?.items ?? [];
  const peopleInRooms = liveRooms.reduce((n, r) => n + r.participants, 0);
  const pendingTransfers = d?.alerts.find((a) => a.type === 'TRANSFERS_TO_VERIFY')?.count ?? 0;
  const otherAlerts = d?.alerts.filter((a) => a.type !== 'TRANSFERS_TO_VERIFY') ?? [];

  return (
    <>
      <div className="flex justify-end">
        <Button asChild variant="ink">
          <Link href="/admin/batches/new">{t.admin.createBatch}</Link>
        </Button>
      </div>
      <PageTitle
        kicker={`${f.dateLong(new Date())} · ${gmtOffset(tz)}`}
        title={fill(t.admin.greeting, { name: user?.name?.split(' ')[0] ?? '' }).replace(/[،,]\s*\./, '.')}
        aside={d ? <p className="max-w-sm text-[15px] text-muted-foreground">{fill(t.admin.summary, { live: f.number(d.liveRooms), alerts: f.number(d.alerts.length) })}</p> : undefined}
      />
      {q.isPending ? (
        <LoadingGrid count={5} height={130} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <StatTile tone="live" label={t.admin.dashboard.liveNow} value={f.number(d!.liveRooms)} sub={fill(t.admin.dashboard.rooms, { n: f.number(peopleInRooms) })} />
          <StatTile label={t.admin.dashboard.sessionsToday} value={f.number(d!.sessionsToday.count)} />
          <StatTile label={t.admin.dashboard.activeBatches} value={f.number(d!.activeBatches)} />
          <StatTile label={t.admin.dashboard.seatsFilled} value={f.percent(d!.seats.filledPercent)} />
          <StatTile label={t.admin.dashboard.revenue} value={<span className="text-3xl">{money.aed(d!.revenueMonth.netFils)}</span>} />
        </section>
      )}
      <Panel>
        <SectionHeader title={t.admin.dashboard.onAir} href="/admin/live" linkLabel={t.admin.dashboard.openMonitor} />
        {live.isPending ? (
          <LoadingGrid count={3} height={120} />
        ) : live.isError ? (
          <ErrorState compact error={live.error} onRetry={() => void live.refetch()} />
        ) : liveRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.admin.dashboard.noLive}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {liveRooms.map(({ session: r, participants }) => (
              <article key={r.id} className="flex flex-col gap-2.5 rounded-2xl bg-ink p-4 text-ivory">
                <div className="flex items-center justify-between">
                  <Chip tone="onair" dot>
                    {t.status.session.LIVE} <span className="timecode">{r.startedAt ? timecode((now - +new Date(r.startedAt)) / 1000) : ''}</span>
                  </Chip>
                  <span className="label-mono text-stone" dir="ltr">
                    {slate(r.batch.code, r.number)}
                  </span>
                </div>
                <b className="text-[15px] leading-snug">{r.title}</b>
                <div className="flex justify-between text-[13px] text-stone">
                  <bdi>{r.batch.teacher.name}</bdi>
                  <span>{fill(t.common.inRoom, { n: f.number(participants) })}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeader title={t.admin.dashboard.callSheet} aside={d ? <span className="label-mono text-muted-foreground">{f.plural(d.sessionsToday.count, t.common.sessions)}</span> : undefined} />
          {q.isPending ? (
            <LoadingBlock rows={4} height={44} />
          ) : !d?.sessionsToday.items.length ? (
            <p className="text-sm text-muted-foreground">{t.admin.dashboard.noToday}</p>
          ) : (
            <ol className="flex flex-col">
              {d.sessionsToday.items.map((s) => {
                const st = sessionState(s);
                return (
                  <li key={s.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3.5 border-t border-border py-3">
                    <span className="timecode text-sm">{f.time(s.startsAt)}</span>
                    <div className="min-w-0">
                      <b className="block truncate text-sm">{s.title}</b>
                      <span className="text-[13px] text-muted-foreground">
                        <span dir="ltr">{slate(s.batch.code, s.number)}</span> · <bdi>{s.batch.teacher.name}</bdi>
                      </span>
                    </div>
                    <SessionStatusChip state={st} minutes={minutesUntil(s.startsAt)} />
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
        <Panel>
          <SectionHeader title={t.admin.dashboard.needsAttention} />
          {pendingTransfers ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-sun p-4 text-ink">
              <span>
                <b>{f.number(pendingTransfers)}</b> {t.admin.dashboard.pendingTransfers}
              </span>
              <Button asChild size="sm" variant="ink">
                <Link href="/admin/transfers">{t.admin.dashboard.review}</Link>
              </Button>
            </div>
          ) : null}
          {q.isPending ? (
            <LoadingBlock rows={3} height={52} />
          ) : !d?.alerts.length ? (
            <p className="text-sm text-muted-foreground">{t.admin.dashboard.noAlerts}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {otherAlerts.map((a) => (
                <li key={a.type} className="flex items-center justify-between gap-3 rounded-[14px] border border-border p-3.5">
                  <span className="min-w-0 text-sm">
                    <b>{f.number(a.count)}</b> {t.admin.dashboard.alerts[a.type]}
                  </span>
                  <Link href={ALERT_HREF[a.type]} className="link-sun text-sm">
                    {t.common.open}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
