'use client';

import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchStatusChip, Chip, PayoutStatusChip } from '@/components/brand/status-chip';
import { CurrencySwitcher } from '@/components/brand/switchers';
import { PageTitle, Panel, SectionHeader, StatTile } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock, LoadingGrid, QueryView } from '@/components/brand/states';
import { teacherApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { sessionCode } from '@/lib/i18n/format';
import { BankDetailsPanel } from './bank-details-panel';

export function EarningsPage() {
  const { t, f, fill, pick } = useI18n();
  const money = useMoney();
  const q = useQuery({ queryKey: qk.earnings, queryFn: teacherApi.earnings });
  const payouts = useQuery({ queryKey: qk.payouts, queryFn: teacherApi.payouts });
  const rate = money.rateOf(money.currency);

  return (
    <>
      <PageTitle
        kicker={fill(t.studio.earnings.cycle, { m: f.monthYear(new Date()) })}
        title={
          <>
            {t.studio.earnings.titleA} <span className="font-light">{t.studio.earnings.titleB}</span>
          </>
        }
        aside={<CurrencySwitcher />}
      />
      {money.currency !== 'AED' && rate && (
        <p className="text-sm text-muted-foreground">{fill(t.studio.earnings.viewing, { cur: money.currency, rate: f.number(rate, { maximumFractionDigits: 4 }) })}</p>
      )}
      {q.isPending ? (
        <LoadingGrid count={4} height={130} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <StatTile tone="ink" label={t.studio.earnings.earnedMonth} value={<span className="text-3xl">{money.display(q.data.summary.earnedThisMonthFils)}</span>} sub={money.currency !== 'AED' ? money.aed(q.data.summary.earnedThisMonthFils) : undefined} />
            <StatTile label={t.studio.earnings.scheduled} value={<span className="text-3xl">{money.display(q.data.summary.scheduledRestOfMonthFils)}</span>} />
            <StatTile
              label={t.studio.earnings.available}
              value={<span className="text-3xl">{money.display(q.data.summary.availableFils)}</span>}
              sub={fill(t.studio.earnings.nextPayout, { d: f.dayMonth(`${q.data.summary.nextPayout.expectedOn}T12:00:00Z`) })}
            />
            <StatTile label={t.studio.earnings.lifetime} value={<span className="text-3xl">{money.display(q.data.summary.lifetimePaidFils)}</span>} />
          </section>
          <Panel>
            <SectionHeader title={t.studio.earnings.howTitle} size="sm" />
            <p className="text-muted-foreground">{t.studio.earnings.howBody}</p>
            <ol className="grid gap-3 md:grid-cols-4">
              {t.studio.earnings.howSteps.map((s, i) => (
                <li key={s.k} className="rounded-xl border border-border bg-card p-4">
                  <span className="timecode text-sm text-muted-foreground">{f.number(i + 1)}</span>
                  <b className="mt-1 block">{s.k}</b>
                  <span className="text-sm text-muted-foreground">{s.v}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel>
            <SectionHeader title={t.studio.earnings.byBatch} aside={<span className="label-mono text-muted-foreground">{t.studio.earnings.allAed}</span>} />
            {q.data.batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.studio.earnings.noLedger}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.studio.earnings.colBatch}</TableHead>
                    <TableHead>{t.studio.earnings.colStudents}</TableHead>
                    <TableHead>{t.studio.earnings.colGross}</TableHead>
                    <TableHead>{t.studio.earnings.colRefunds}</TableHead>
                    <TableHead>{t.studio.earnings.colFees}</TableHead>
                    <TableHead>{t.studio.earnings.colNet}</TableHead>
                    <TableHead>{t.studio.earnings.colShare}</TableHead>
                    <TableHead>{t.studio.earnings.colDelivered}</TableHead>
                    <TableHead className="text-end">{t.studio.earnings.colEarned}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.batches.map((b) => (
                    <TableRow key={b.batchId}>
                      <TableCell>
                        <b dir="ltr">{b.code}</b> <span className="text-muted-foreground">{pick(b.course.titleEn, b.course.titleAr).text}</span> <BatchStatusChip status={b.status} />
                      </TableCell>
                      <TableCell>{f.number(b.activeStudents)}</TableCell>
                      <TableCell>{money.aed(b.grossFils)}</TableCell>
                      <TableCell>−{money.aed(b.refundsFils)}</TableCell>
                      <TableCell>−{money.aed(b.feesFils)}</TableCell>
                      <TableCell>{money.aed(b.netRevenueFils)}</TableCell>
                      <TableCell>{money.aed(b.projectedTotalFils)}</TableCell>
                      <TableCell>
                        {f.number(b.sessionsDelivered)}/{f.number(b.sessionCount)}
                      </TableCell>
                      <TableCell className="text-end font-semibold">{money.aed(b.earnedFils)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <Panel>
              <SectionHeader title={t.studio.earnings.ledger} size="sm" />
              {q.data.ledger.length === 0 ? (
                <EmptyState title={t.studio.earnings.noLedger} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {q.data.ledger.slice(0, 20).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-3.5">
                      <div className="min-w-0">
                        <b className="block truncate">
                          {l.session ? (
                            <>
                              <bdi dir="ltr">
                                {l.batch.code}·{sessionCode(l.session.number)}
                              </bdi> · {l.session.title}
                            </>
                          ) : (
                            (l.note ?? l.kind)
                          )}
                        </b>
                        <span className="text-[13px] text-muted-foreground">{f.dayMonth(l.createdAt)}</span>
                      </div>
                      <span className="flex items-center gap-2">
                        <Chip tone={l.status === 'AVAILABLE' ? 'sage' : l.status === 'PAID' ? 'outline' : l.status === 'REVERSED' ? 'danger' : 'dashed'}>{t.status.earning[l.status]}</Chip>
                        <b>{money.aed(l.amountFils)}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel>
                <SectionHeader title={t.studio.earnings.history} size="sm" />
                <QueryView query={payouts} loading={<LoadingBlock rows={2} />} empty={<p className="text-sm text-muted-foreground">{t.studio.earnings.noPayouts}</p>}>
                  {(list) => (
                    <ul className="flex flex-col gap-2">
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-3.5">
                          <span>
                            <b className="block">{p.paidAt ? f.dayMonth(p.paidAt) : '—'}</b>
                            {p.run && (
                              <span className="text-[13px] text-muted-foreground">
                                {f.dayMonth(p.run.periodStart)} → {f.dayMonth(p.run.periodEnd)}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <PayoutStatusChip status={p.status} />
                            <b>{money.aed(p.totalFils)}</b>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryView>
              </Panel>
              <BankDetailsPanel />
            </div>
          </div>
        </>
      )}
    </>
  );
}
