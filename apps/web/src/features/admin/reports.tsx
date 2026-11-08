'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock, LoadingGrid } from '@/components/brand/states';
import { adminApi, ApiError, type AdminReport, type ReportKpis } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const TZ = 'Asia/Dubai';
const dayIn = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const spanDays = (from: string, to: string) => Math.round((+new Date(`${to}T00:00:00Z`) - +new Date(`${from}T00:00:00Z`)) / 86400_000) + 1;

const KPI_ORDER: Array<keyof ReportKpis> = ['revenueFils', 'newEnrollments', 'fillRate', 'attendanceRate', 'completionRate', 'refundsFils'];
const RATE_KEYS = new Set<keyof ReportKpis>(['fillRate', 'attendanceRate', 'completionRate']);
const MONEY_KEYS = new Set<keyof ReportKpis>(['revenueFils', 'refundsFils']);

export function AdminReports() {
  const { t, fill } = useI18n();
  const [range, setRange] = useState(() => {
    const to = dayIn(new Date());
    return { from: shiftDay(to, -29), to };
  });
  const [draft, setDraft] = useState(range);
  const [invalid, setInvalid] = useState(false);
  const q = useQuery({
    queryKey: qk.admin.reports(range.from, range.to),
    queryFn: () => adminApi.reports(range),
    placeholderData: keepPreviousData,
    retry: (n, e) => !(e instanceof ApiError && e.status === 422) && n < 2,
  });

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const ok = !!draft.from && !!draft.to && draft.from <= draft.to && spanDays(draft.from, draft.to) <= 366;
    setInvalid(!ok);
    if (ok) setRange(draft);
  };

  return (
    <>
      <PageTitle
        kicker={fill(t.reports.kicker, { tz: TZ })}
        title={t.reports.title}
        aside={
          <form onSubmit={apply} className="flex flex-wrap items-end gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-from">{t.reports.from}</Label>
              <Input id="rep-from" type="date" dir="ltr" className="h-11 w-44" value={draft.from} max={draft.to} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} aria-invalid={invalid} aria-describedby={invalid ? 'rep-err' : undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rep-to">{t.reports.to}</Label>
              <Input id="rep-to" type="date" dir="ltr" className="h-11 w-44" value={draft.to} min={draft.from} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} aria-invalid={invalid} aria-describedby={invalid ? 'rep-err' : undefined} />
            </div>
            <Button type="submit" variant="ink">
              {t.reports.apply}
            </Button>
            {invalid && (
              <span id="rep-err" role="alert" className="basis-full text-sm text-destructive">
                {t.reports.invalidRange}
              </span>
            )}
          </form>
        }
      />
      {q.isPending ? (
        <>
          <LoadingGrid count={6} height={140} />
          <LoadingBlock rows={3} height={160} />
        </>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ReportView r={q.data} stale={q.isFetching} />
      )}
    </>
  );
}

function ReportView({ r, stale }: { r: AdminReport; stale: boolean }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const maxRevenue = Math.max(1, ...r.revenueByCourse.map((c) => c.revenueFils));
  return (
    <div className={cn('flex flex-col gap-5 transition-opacity', stale && 'opacity-60')} aria-busy={stale}>
      <p className="text-sm text-muted-foreground">{fill(t.reports.comparedWith, { from: f.dayMonth(`${r.previousRange.from}T12:00:00Z`), to: f.dayMonth(`${r.previousRange.to}T12:00:00Z`) })}</p>
      <section aria-label={t.reports.title} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {KPI_ORDER.map((k) => (
          <KpiTile key={k} k={k} cur={r.kpis[k]} prev={r.previous[k]} />
        ))}
      </section>

      {r.recorded && <RecordedLine r={r.recorded} />}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel aria-labelledby="rev-course">
          <SectionHeader title={<span id="rev-course">{t.reports.revenueByCourse}</span>} />
          {r.revenueByCourse.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.reports.noRevenue}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {r.revenueByCourse.map((c) => (
                <li key={c.courseId} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{c.title}</span>
                    <b className="shrink-0 tabular-nums">{money.aed(c.revenueFils)}</b>
                  </div>
                  <div className="h-3 rounded-full bg-muted" aria-hidden>
                    <div className="h-3 rounded-full bg-ink" style={{ width: `${(c.revenueFils / maxRevenue) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel aria-labelledby="att-session">
          <SectionHeader
            title={<span id="att-session">{t.reports.attendanceBySession}</span>}
            aside={r.attendanceBatch && <span className="label-mono text-muted-foreground">{fill(t.reports.attendanceFor, { code: r.attendanceBatch.code, course: r.attendanceBatch.courseTitle })}</span>}
          />
          {r.attendanceBySession.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.reports.noAttendance}</p>
          ) : (
            <ol className="flex h-56 items-end gap-2 overflow-x-auto pt-6">
              {r.attendanceBySession.map((s) => {
                const pct = Math.round(s.rate * 100);
                return (
                  <li key={s.number} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold tabular-nums">{f.percent(pct)}</span>
                    <div className="w-full max-w-12 rounded-t-lg bg-ink" style={{ height: `${Math.max(2, pct)}%` }} aria-hidden />
                    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                      S{String(s.number).padStart(2, '0')}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>

      <Panel aria-labelledby="fill" className="p-2 sm:p-4">
        <div className="px-2 pt-2">
          <SectionHeader title={<span id="fill">{t.reports.batchFill}</span>} />
        </div>
        {r.batches.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-muted-foreground">{t.reports.noBatches}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.reports.batch}</TableHead>
                <TableHead>{t.reports.teacher}</TableHead>
                <TableHead className="min-w-48">{t.reports.seats}</TableHead>
                <TableHead className="text-end">{t.reports.waitlist}</TableHead>
                <TableHead>{t.reports.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...r.batches]
                .sort((a, b) => b.seatsHeld / Math.max(1, b.capacity) - a.seatsHeld / Math.max(1, a.capacity))
                .map((b) => {
                  const pct = Math.min(100, (b.seatsHeld / Math.max(1, b.capacity)) * 100);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link href={`/admin/batches/${b.id}`} className="no-underline">
                          <b dir="ltr">{b.code}</b> · {b.courseTitle}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <bdi>{b.teacherName}</bdi>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                            <div className="h-2 rounded-full bg-ink" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="shrink-0 text-sm tabular-nums">
                            {f.number(b.seatsHeld)}/{f.number(b.capacity)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{b.waitlistCount ? f.number(b.waitlistCount) : '—'}</TableCell>
                      <TableCell>
                        <BatchStatusChip status={b.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel aria-labelledby="teachers" className="p-2 sm:p-4">
        <div className="px-2 pt-2">
          <SectionHeader title={<span id="teachers">{t.reports.teachers}</span>} />
        </div>
        {r.teachers.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-muted-foreground">{t.reports.noTeachers}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.reports.teacher}</TableHead>
                <TableHead className="text-end">{t.reports.sessionsRun}</TableHead>
                <TableHead className="text-end">{t.reports.avgAttendance}</TableHead>
                <TableHead className="text-end">{t.reports.onTime}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.teachers.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>
                    <bdi>{x.name}</bdi>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{f.number(x.sessionsRun)}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.percent(Math.round(x.avgAttendance * 100))}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.percent(Math.round(x.onTimeStartRate * 100))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function KpiTile({ k, cur, prev }: { k: keyof ReportKpis; cur: number; prev: number }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const isRate = RATE_KEYS.has(k);
  const value = isRate ? f.percent(Math.round(cur * 100)) : MONEY_KEYS.has(k) ? money.aed(cur) : f.number(cur);
  // Rates compare in percentage points; amounts and counts as a relative change.
  let dir: 'up' | 'down' | 'flat' | 'none';
  let deltaText = '';
  if (isRate) {
    const pts = Math.round((cur - prev) * 100);
    dir = pts > 0 ? 'up' : pts < 0 ? 'down' : 'flat';
    deltaText = fill(t.reports.points, { n: f.number(Math.abs(pts)) });
  } else if (prev === 0) {
    dir = cur === 0 ? 'flat' : 'none';
  } else {
    const pct = Math.round(((cur - prev) / prev) * 100);
    dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    deltaText = f.percent(Math.abs(pct));
  }
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const label = dir === 'up' ? fill(t.reports.up, { v: deltaText }) : dir === 'down' ? fill(t.reports.down, { v: deltaText }) : dir === 'flat' ? t.reports.flat : t.reports.noBaseline;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="label-mono text-muted-foreground">{t.reports.kpi[k]}</span>
      <div className={cn('font-display leading-none font-extrabold', MONEY_KEYS.has(k) ? 'text-3xl' : 'text-[44px]')}>{value}</div>
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </span>
    </div>
  );
}

function RecordedLine({ r }: { r: NonNullable<AdminReport['recorded']> }) {
  const { t } = useI18n();
  const money = useMoney();
  const c = t.recordedOps.reports;
  const rows: Array<[string, number, boolean?]> = [
    [c.gross, r.grossFils],
    [c.refunds, -r.refundsFils],
    [c.fees, -r.feesFils],
    [c.vat, -r.vatFils],
    [c.net, r.netFils, true],
  ];
  const empty = r.grossFils === 0 && r.refundsFils === 0;
  return (
    <Panel aria-labelledby="rec-line">
      <SectionHeader title={<span id="rec-line">{c.title}</span>} />
      {empty ? (
        <p className="text-sm text-muted-foreground">{c.none}</p>
      ) : (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {rows.map(([label, v, strong]) => (
            <div key={label} className={cn('flex flex-col gap-1 rounded-xl border border-border p-4', strong && 'bg-ink text-ivory')}>
              <dt className="label-mono opacity-70">{label}</dt>
              <dd className="font-display text-2xl font-extrabold tabular-nums" dir="ltr">
                {money.aed(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
