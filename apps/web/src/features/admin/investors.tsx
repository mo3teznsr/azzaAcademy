'use client';

import { useId, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aedToFils, MARKETING_CHANNELS, type MarketingChannel } from '@azza/shared';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock, LoadingGrid } from '@/components/brand/states';
import { adminApi } from '@/lib/api';
import type { AdminInvestors, MarketingSpend } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const MONTHS = [6, 12, 24] as const;
const TOGGLE_ITEM = 'h-11 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';

/** The investor tab of `/admin/growth`: margin, retention, unit economics, acquisition mix, CSV, and the spend that feeds CAC. */
export function InvestorMetrics() {
  const { t } = useI18n();
  const i = t.investors;
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(12);
  const q = useQuery({ queryKey: qk.admin.investors(months), queryFn: () => adminApi.investors(months), placeholderData: keepPreviousData });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">{i.intro}</p>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={String(months)} onValueChange={(v) => v && setMonths(Number(v) as (typeof MONTHS)[number])} aria-label={i.months} className="flex flex-wrap gap-2">
            {MONTHS.map((m) => (
              <ToggleGroupItem key={m} value={String(m)} className={TOGGLE_ITEM}>
                {i.monthsOptions[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button asChild variant="outline">
            <a href={adminApi.investorsCsvUrl(months)}>
              <Download aria-hidden /> {i.csv}
            </a>
          </Button>
        </div>
      </div>
      {q.isPending ? <LoadingGrid count={6} /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <Body data={q.data} />}
      <SpendPanel />
    </div>
  );
}

function useFormats() {
  const { f, fill, t } = useI18n();
  const money = useMoney();
  const i = t.investors;
  const dash = '—';
  return {
    pct: (r: number | null) => (r === null ? dash : f.percent(Math.round(r * 100))),
    aed: (fils: number | null) => (fils === null ? dash : money.aed(fils)),
    ratio: (r: number | null) => (r === null ? dash : `${f.number(r, { maximumFractionDigits: 1 })}×`),
    months: (n: number | null) => (n === null ? dash : fill(i.monthsValue, { n: f.number(n, { maximumFractionDigits: 1 }) })),
    num: (n: number) => f.number(n),
  };
}

function Body({ data }: { data: AdminInvestors }) {
  const { t, fill } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  const u = data.unitEconomics;
  const lastComplete = [...data.monthly].reverse().find((m) => !m.partial) ?? null;
  const nrr = data.nrr.overall;
  const nrrBest = nrr.m12 !== null ? { k: 12, v: nrr.m12 } : nrr.m6 !== null ? { k: 6, v: nrr.m6 } : nrr.m3 !== null ? { k: 3, v: nrr.m3 } : null;
  const tiles: Array<{ label: string; value: string; note?: string }> = [
    {
      label: i.tiles.margin,
      value: fm.pct(lastComplete?.grossMarginRate ?? null),
      note: lastComplete ? fill(i.tiles.marginNote, { amount: fm.aed(lastComplete.grossMarginFils), month: lastComplete.month }) : undefined,
    },
    { label: i.tiles.nrr, value: nrrBest ? fm.pct(nrrBest.v) : '—', note: nrrBest ? fill(i.tiles.nrrNote, { k: fm.num(nrrBest.k) }) : i.tiles.nrrEmpty },
    { label: i.tiles.ltv, value: fm.aed(u.projectedLtvFils), note: fill(i.tiles.ltvNote, { amount: fm.aed(u.historicalLtvFils) }) },
    { label: i.tiles.cac, value: fm.aed(u.paidCacFils), note: fill(i.tiles.cacNote, { amount: fm.aed(u.blendedCacFils) }) },
    { label: i.tiles.ltvCac, value: fm.ratio(u.ltvCac) },
    { label: i.tiles.payback, value: fm.months(u.paybackMonths), note: fill(i.tiles.paybackNote, { amount: fm.aed(u.monthlyMarginPerActiveFils) }) },
  ];
  return (
    <>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <dt className="label-mono text-muted-foreground">{tile.label}</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{tile.value}</dd>
            {tile.note && <dd className="text-xs text-muted-foreground">{tile.note}</dd>}
          </div>
        ))}
      </dl>
      <MonthlyTable data={data} />
      <div className="grid gap-6 lg:grid-cols-2">
        <NrrTable data={data} />
        <ChannelPanel data={data} />
      </div>
      <Formulas churn={u.monthlyChurn} lifetime={u.expectedLifetimeMonths} />
    </>
  );
}

function MonthlyTable({ data }: { data: AdminInvestors }) {
  const { t } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  return (
    <Panel aria-labelledby="inv-monthly">
      <SectionHeader title={<span id="inv-monthly">{i.monthly}</span>} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.growth.month}</TableHead>
            <TableHead className="text-end">{i.col.net}</TableHead>
            <TableHead className="text-end">{i.col.fees}</TableHead>
            <TableHead className="text-end">{i.col.teachers}</TableHead>
            <TableHead className="text-end">{i.col.margin}</TableHead>
            <TableHead className="text-end">{i.col.marginRate}</TableHead>
            <TableHead className="text-end">{i.col.active}</TableHead>
            <TableHead className="text-end">{i.col.new}</TableHead>
            <TableHead className="text-end">{i.col.spend}</TableHead>
            <TableHead className="text-end">{i.col.blendedCac}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...data.monthly].reverse().map((m) => (
            <TableRow key={m.month}>
              <TableCell className="whitespace-nowrap">
                <bdi dir="ltr" className="tabular-nums">{m.month}</bdi>
                {m.partial && <span className="ms-2 text-xs text-muted-foreground">{i.partial}</span>}
              </TableCell>
              <TableCell className="text-end tabular-nums">{fm.aed(m.netRevenueFils)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.aed(m.feesFils)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.aed(m.teacherFils)}</TableCell>
              <TableCell className="text-end tabular-nums font-semibold">{fm.aed(m.grossMarginFils)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.pct(m.grossMarginRate)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.num(m.activeCustomers)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.num(m.newCustomers)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.aed(m.spendFils)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.aed(m.blendedCacFils)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

function NrrTable({ data }: { data: AdminInvestors }) {
  const { t } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  const rows = [...data.nrr.cohorts].reverse();
  return (
    <Panel aria-labelledby="inv-nrr">
      <SectionHeader title={<span id="inv-nrr">{i.nrr}</span>} />
      <p className="text-sm text-muted-foreground">{i.nrrIntro}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{i.noCustomers}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{i.cohort}</TableHead>
              <TableHead className="text-end">{i.col.customers}</TableHead>
              <TableHead className="text-end">{i.col.base}</TableHead>
              <TableHead className="text-end">{i.after.m3}</TableHead>
              <TableHead className="text-end">{i.after.m6}</TableHead>
              <TableHead className="text-end">{i.after.m12}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.month}>
                <TableCell dir="ltr" className="text-start tabular-nums">{c.month}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.num(c.customers)}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.aed(c.baseFils)}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.pct(c.m3)}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.pct(c.m6)}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.pct(c.m12)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell colSpan={3}>{i.weighted}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.pct(data.nrr.overall.m3)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.pct(data.nrr.overall.m6)}</TableCell>
              <TableCell className="text-end tabular-nums">{fm.pct(data.nrr.overall.m12)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function ChannelPanel({ data }: { data: AdminInvestors }) {
  const { t } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  return (
    <Panel aria-labelledby="inv-channels">
      <SectionHeader title={<span id="inv-channels">{i.channels}</span>} />
      <p className="text-sm text-muted-foreground">{i.channelsIntro}</p>
      {data.channels.length === 0 ? (
        <p className="text-sm text-muted-foreground">{i.noCustomers}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2" aria-label={i.mix}>
            {data.channels
              .filter((c) => c.newCustomers > 0)
              .sort((a, b) => b.newCustomers - a.newCustomers)
              .map((c) => (
                <li key={c.channel} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate">{i.channel[c.channel]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
                    <span className={c.paid ? 'block h-full rounded-full bg-primary' : 'block h-full rounded-full bg-muted-foreground/50'} style={{ width: `${Math.max(2, c.share * 100)}%` }} />
                  </span>
                  <span className="tabular-nums">
                    {fm.num(c.newCustomers)} · {fm.pct(c.share)}
                  </span>
                </li>
              ))}
          </ul>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i.col.channel}</TableHead>
                <TableHead className="text-end">{i.col.spend}</TableHead>
                <TableHead className="text-end">{i.col.cac}</TableHead>
                <TableHead className="text-end">{i.col.ltvSoFar}</TableHead>
                <TableHead className="text-end">{i.col.ltvCac}</TableHead>
                <TableHead className="text-end">{i.col.payback}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.channels.map((c) => (
                <TableRow key={c.channel}>
                  <TableCell>{i.channel[c.channel]}</TableCell>
                  <TableCell className="text-end tabular-nums">{c.paid ? fm.aed(c.spendFils) : '—'}</TableCell>
                  <TableCell className="text-end tabular-nums">{fm.aed(c.cacFils)}</TableCell>
                  <TableCell className="text-end tabular-nums">{fm.aed(c.historicalLtvFils)}</TableCell>
                  <TableCell className="text-end tabular-nums">{fm.ratio(c.ltvCac)}</TableCell>
                  <TableCell className="text-end tabular-nums">{fm.months(c.paybackMonths)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Panel>
  );
}

function Formulas({ churn, lifetime }: { churn: number | null; lifetime: number | null }) {
  const { t, fill } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  const items: Array<[string, string]> = [
    [i.how.marginTitle, i.how.margin],
    [i.how.nrrTitle, i.how.nrr],
    [i.how.cacTitle, i.how.cac],
    [i.how.ltvTitle, `${i.how.ltv} ${fill(i.how.ltvNow, { churn: fm.pct(churn), lifetime: fm.months(lifetime) })}`],
    [i.how.paybackTitle, i.how.payback],
    [i.how.channelTitle, i.how.channel],
  ];
  return (
    <Panel aria-labelledby="inv-how">
      <SectionHeader size="sm" title={<span id="inv-how">{i.how.title}</span>} />
      <Accordion type="multiple">
        {items.map(([title, body]) => (
          <AccordionItem key={title} value={title}>
            <AccordionTrigger>{title}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Panel>
  );
}

/** Current month as `YYYY-MM`, for the month picker's default. */
const thisMonth = () => new Date().toISOString().slice(0, 7);

function SpendPanel() {
  const { t, fill } = useI18n();
  const i = t.investors;
  const fm = useFormats();
  const qc = useQueryClient();
  const id = useId();
  const q = useQuery({ queryKey: qk.admin.marketingSpend, queryFn: () => adminApi.marketingSpend(24) });
  const [month, setMonth] = useState(thisMonth);
  const [channel, setChannel] = useState<MarketingChannel>('instagram');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.admin.marketingSpend });
    void qc.invalidateQueries({ queryKey: ['admin', 'investors'] });
  };
  const save = useMutation({
    mutationFn: () => adminApi.saveMarketingSpend({ month, channel, amountFils: aedToFils(Number(amount)), note: note.trim() || null }),
    onSuccess: (row) => {
      toast.success(fill(i.spend.saved, { channel: i.channel[row.channel], month: row.month }));
      setAmount('');
      setNote('');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (row: MarketingSpend) => adminApi.deleteMarketingSpend(row.id),
    onSuccess: () => {
      toast.success(i.spend.deleted);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const edit = (row: MarketingSpend) => {
    setMonth(row.month);
    setChannel(row.channel);
    setAmount(String(row.amountFils / 100));
    setNote(row.note ?? '');
  };
  const amountOk = amount.trim() !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0;
  const monthOk = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

  return (
    <Panel aria-labelledby={`${id}-t`}>
      <SectionHeader title={<span id={`${id}-t`}>{i.spend.title}</span>} />
      <p className="text-sm text-muted-foreground">{i.spend.intro}</p>
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_12rem_10rem_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (amountOk && monthOk) save.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-m`}>{t.growth.month}</Label>
          <Input id={`${id}-m`} type="month" dir="ltr" className="h-11" value={month} onChange={(e) => setMonth(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-c`}>{i.col.channel}</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as MarketingChannel)}>
            <SelectTrigger id={`${id}-c`} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {i.channel[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-a`}>{i.spend.amount}</Label>
          <Input id={`${id}-a`} type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-n`}>{i.spend.note}</Label>
          <Input id={`${id}-n`} className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button type="submit" className="h-11" disabled={!amountOk || !monthOk || save.isPending}>
          {i.spend.save}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{i.spend.replaceHint}</p>
      {q.isPending ? (
        <LoadingBlock rows={3} height={44} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{i.spend.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.growth.month}</TableHead>
              <TableHead>{i.col.channel}</TableHead>
              <TableHead className="text-end">{i.spend.amount}</TableHead>
              <TableHead>{i.spend.note}</TableHead>
              <TableHead className="text-end">
                <span className="sr-only">{i.spend.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell dir="ltr" className="text-start tabular-nums">{row.month}</TableCell>
                <TableCell>{i.channel[row.channel]}</TableCell>
                <TableCell className="text-end tabular-nums">{fm.aed(row.amountFils)}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">{row.note ? <bdi>{row.note}</bdi> : '—'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label={fill(i.spend.editRow, { channel: i.channel[row.channel], month: row.month })} onClick={() => edit(row)}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={fill(i.spend.deleteRow, { channel: i.channel[row.channel], month: row.month })}
                      disabled={remove.isPending && remove.variables?.id === row.id}
                      onClick={() => remove.mutate(row)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

