'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingGrid } from '@/components/brand/states';
import { adminApi, type AdminGrowth as Growth } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { InvestorMetrics } from './investors';

const RANGES = [30, 90, 365] as const;

/**
 * `/admin/growth`: recurring revenue, churn, repeat buyers, retention by month, teacher concentration and sign-up sources;
 * the Investors tab adds margin, net revenue retention, CAC, LTV, payback and the marketing spend behind them.
 */
export function AdminGrowth() {
  const { t } = useI18n();
  const g = t.growth;
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const q = useQuery({ queryKey: qk.admin.growth(days), queryFn: () => adminApi.growth(days), placeholderData: keepPreviousData });
  return (
    <>
      <PageTitle kicker={g.kicker} title={g.title} />
      <Tabs defaultValue="overview" className="gap-6">
        <TabsList>
          <TabsTrigger value="overview">{t.investors.tabs.overview}</TabsTrigger>
          <TabsTrigger value="investors">{t.investors.tabs.investors}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="flex flex-col gap-6">
          <ToggleGroup type="single" value={String(days)} onValueChange={(v) => v && setDays(Number(v) as (typeof RANGES)[number])} aria-label={g.range} className="flex flex-wrap gap-2 self-start">
            {RANGES.map((d) => (
              <ToggleGroupItem key={d} value={String(d)} className="h-11 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {g.ranges[d]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {q.isPending ? <LoadingGrid count={4} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <Body data={q.data} />}
        </TabsContent>
        <TabsContent value="investors">
          <InvestorMetrics />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Body({ data }: { data: Growth }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const g = t.growth;
  const pct = (r: number | null) => (r === null ? '—' : f.percent(Math.round(r * 100)));
  const tiles: Array<{ label: string; value: string; note?: string }> = [
    { label: g.mrr, value: money.aed(data.plans.mrrFils), note: fill(g.arr, { amount: money.aed(data.plans.arrFils) }) },
    { label: g.livePlans, value: f.number(data.plans.live) },
    { label: g.churn, value: pct(data.plans.churn.rate), note: fill(g.churnNote, { ended: f.number(data.plans.churn.ended), atStart: f.number(data.plans.churn.atStart) }) },
    { label: g.repeat, value: pct(data.customers.repeat90.rate), note: fill(g.repeatNote, { n: f.number(data.customers.repeat90.eligible) }) },
    { label: g.customers, value: f.number(data.customers.total) },
    { label: g.signups, value: f.number(data.signups.total) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <dt className="label-mono text-muted-foreground">{tile.label}</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{tile.value}</dd>
            {tile.note && <dd className="text-xs text-muted-foreground">{tile.note}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="g-cohorts">
          <SectionHeader title={<span id="g-cohorts">{g.cohorts}</span>} />
          <p className="text-sm text-muted-foreground">{g.cohortsIntro}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{g.month}</TableHead>
                <TableHead className="text-end">{g.newCustomers}</TableHead>
                <TableHead className="text-end">{g.returned}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.customers.cohorts.map((c) => (
                <TableRow key={c.month}>
                  <TableCell dir="ltr" className="text-start tabular-nums">{c.month}</TableCell>
                  <TableCell className="text-end tabular-nums">{f.number(c.customers)}</TableCell>
                  <TableCell className="text-end tabular-nums">{pct(c.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel aria-labelledby="g-teachers">
          <SectionHeader title={<span id="g-teachers">{g.teachers}</span>} />
          <p className="text-sm text-muted-foreground">{data.teachers.topFiveShare === null ? g.noEarnings : fill(g.topFive, { share: pct(data.teachers.topFiveShare) })}</p>
          {data.teachers.teachers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{g.teacher}</TableHead>
                  <TableHead className="text-end">{g.earned}</TableHead>
                  <TableHead className="text-end">{g.share}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teachers.teachers.slice(0, 10).map((x) => (
                  <TableRow key={x.teacherId}>
                    <TableCell><bdi>{x.name}</bdi></TableCell>
                    <TableCell className="text-end tabular-nums">{money.aed(x.amountFils)}</TableCell>
                    <TableCell className="text-end tabular-nums">{pct(x.share)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel aria-labelledby="g-sources">
        <SectionHeader title={<span id="g-sources">{g.sources}</span>} />
        {data.signups.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{g.noSignups}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.signups.sources.map((s) => {
              const share = data.signups.total ? s.signups / data.signups.total : 0;
              return (
                <li key={s.source} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                  <bdi dir="ltr" className="truncate">{s.source === 'direct' ? g.direct : s.source}</bdi>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, share * 100)}%` }} />
                  </span>
                  <span className="tabular-nums">{f.number(s.signups)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
