'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filsToAed, reviewTransferInput } from '@azza/shared';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip, OrderStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type Paged, type TransferItem } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useNow } from '@/lib/use-now';

/** `needs` = the API's default review queue (VERIFYING + AMOUNT_MISMATCH); `all` = every bank-transfer order. */
const FILTERS = { needs: undefined, all: 'ALL', approved: 'PAID', rejected: 'REJECTED', expired: 'EXPIRED' } as const;

export function Transfers() {
  const { t, f, fill, pick } = useI18n();
  const money = useMoney();
  const [filter, setFilter] = useState<keyof typeof FILTERS>('needs');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const status = FILTERS[filter];
  const q = useQuery({
    queryKey: qk.admin.transfers(status),
    queryFn: (): Promise<Paged<TransferItem>> => (status === 'ALL' ? adminApi.orders({ method: 'BANK_TRANSFER', pageSize: 100 }) : adminApi.transfers({ status, pageSize: 100 })),
    select: (p) => p.items,
  });
  const now = useNow(60_000);
  const list = q.data ?? [];
  const selected = list.find((o) => o.id === selectedId) ?? null;

  return (
    <>
      <PageTitle kicker={t.nav.admin.finance} title={t.admin.transfers.title} />
      <p className="max-w-3xl text-sm text-muted-foreground">{t.admin.transfers.intro}</p>
      <Tabs value={filter} onValueChange={(v) => (setFilter(v as keyof typeof FILTERS), setSelectedId(null))}>
        <TabsList>
          <TabsTrigger value="needs">{t.admin.transfers.needsAction}</TabsTrigger>
          <TabsTrigger value="all">{t.common.all}</TabsTrigger>
          <TabsTrigger value="approved">{t.status.order.PAID}</TabsTrigger>
          <TabsTrigger value="rejected">{t.status.order.REJECTED}</TabsTrigger>
          <TabsTrigger value="expired">{t.status.order.EXPIRED}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-2">
          {q.isPending ? (
            <LoadingBlock rows={5} height={52} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState title={t.admin.transfers.empty} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.transfers.colReference}</TableHead>
                  <TableHead>{t.admin.transfers.colStudent}</TableHead>
                  <TableHead>{t.admin.transfers.colExpected}</TableHead>
                  <TableHead>{t.admin.transfers.colReceived}</TableHead>
                  <TableHead>{t.admin.transfers.colSaw}</TableHead>
                  <TableHead>{t.admin.transfers.colHold}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((o) => {
                  const hoursLeft = o.expiresAt ? Math.max(0, Math.round((+new Date(o.expiresAt) - now) / 3600_000)) : null;
                  return (
                    <TableRow key={o.id} onClick={() => setSelectedId(o.id)} data-state={o.id === selectedId ? 'selected' : undefined} className="cursor-pointer">
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {o.reference}
                      </TableCell>
                      <TableCell>
                        <bdi className="block font-medium">{o.user?.name ?? '—'}</bdi>
                        {o.kind === 'SUBSCRIPTION' ? (
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Chip tone="sky">{t.recordedOps.transfers.kindPlan}</Chip>
                            {o.course ? fill(t.recordedOps.transfers.planLabel, { course: pick(o.course.titleEn, o.course.titleAr).text, plan: o.plan ? t.recordedOps.subs.plan[o.plan] : '' }) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {o.enrollment?.batch.code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{money.aed(o.totalFils)}</TableCell>
                      <TableCell>{o.receivedFils != null ? money.aed(o.receivedFils) : '—'}</TableCell>
                      <TableCell className="text-xs">{o.displayCurrency !== 'AED' ? `${o.displayCurrency} · ${o.fxRate}` : 'AED'}</TableCell>
                      <TableCell className="timecode">{hoursLeft !== null ? `${hoursLeft}h` : '—'}</TableCell>
                      <TableCell>
                        <OrderStatusChip status={o.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel className="xl:sticky xl:top-6">
          {selected ? <Review key={selected.id} order={selected} onDone={() => setSelectedId(null)} /> : <p className="text-sm text-muted-foreground">{t.admin.transfers.selectOne}</p>}
          {selected && <span className="sr-only">{f.dateTime(selected.createdAt)}</span>}
        </Panel>
      </div>
    </>
  );
}

function Review({ order, onDone }: { order: TransferItem; onDone: () => void }) {
  const { t, f, fill, pick } = useI18n();
  const sub = order.kind === 'SUBSCRIPTION';
  const money = useMoney();
  const qc = useQueryClient();
  const [received, setReceived] = useState(String(filsToAed(order.receivedFils ?? order.totalFils)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (decision: 'APPROVE' | 'REJECT' | 'REQUEST_NEW_RECEIPT') => {
      const parsed = reviewTransferInput.safeParse(decision === 'APPROVE' ? { decision, receivedAed: Number(received) } : { decision, reason });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid');
      return adminApi.reviewTransfer(order.id, parsed.data);
    },
    onSuccess: () => {
      toast.success(t.admin.transfers.done);
      void qc.invalidateQueries({ queryKey: ['admin', 'transfers'] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });
  const reviewable = order.status === 'VERIFYING' || order.status === 'AMOUNT_MISMATCH' || order.status === 'AWAITING_RECEIPT';
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title={<span dir="ltr">{order.reference}</span>} size="sm" aside={<OrderStatusChip status={order.status} />} />
      <p className="text-sm text-muted-foreground">
        <bdi>{order.user?.name}</bdi> ·{' '}
        {sub ? (
          fill(t.recordedOps.transfers.planLabel, { course: order.course ? pick(order.course.titleEn, order.course.titleAr).text : '', plan: order.plan ? t.recordedOps.subs.plan[order.plan] : '' })
        ) : (
          <>
            {order.enrollment?.batch.course.titleEn} · <span dir="ltr">{order.enrollment?.batch.code}</span>
          </>
        )}
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="label-mono text-muted-foreground">{t.admin.transfers.colExpected}</dt>
          <dd className="font-semibold">{money.aed(order.totalFils)}</dd>
        </div>
        <div>
          <dt className="label-mono text-muted-foreground">{t.admin.transfers.colUploaded}</dt>
          <dd className="font-semibold">{order.receiptUploadedAt ? f.dateTime(order.receiptUploadedAt) : '—'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="label-mono text-muted-foreground">{t.admin.banks.bankName}</dt>
          <dd className="font-semibold">{order.bankAccount ? `${order.bankAccount.bankName} · ${order.bankAccount.iban.slice(-4)}` : '—'}</dd>
        </div>
      </dl>
      {order.receiptUrl ? (
        <Button asChild variant="outline" className="self-start">
          <a href={order.receiptUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> {t.admin.transfers.openReceipt}
          </a>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t.admin.transfers.noReceipt}</p>
      )}
      {reviewable && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="received">{t.admin.transfers.receivedAed}</Label>
            <Input id="received" type="number" step="0.01" dir="ltr" value={received} onChange={(e) => setReceived(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">{t.admin.transfers.reason}</Label>
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="text-[13px] text-muted-foreground">{fill(sub ? t.recordedOps.transfers.approvePlanNote : t.admin.transfers.approveNote, { amount: `AED ${received}`, ref: order.reference })}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="ink" disabled={m.isPending} onClick={() => m.mutate('APPROVE')}>
              {sub ? t.recordedOps.transfers.approvePlan : t.admin.transfers.approve}
            </Button>
            <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate('REQUEST_NEW_RECEIPT')}>
              {t.admin.transfers.requestNew}
            </Button>
            <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate('REJECT')}>
              {t.admin.transfers.reject}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
