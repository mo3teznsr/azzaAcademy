'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ORDER_STATUSES, filsToAed, refundInput, type OrderStatus } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrderStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type Order } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { Pager } from './courses';

export function Payments() {
  const { t, f } = useI18n();
  const money = useMoney();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<Order | null>(null);
  const params = { status: status === 'all' ? undefined : status, page };
  const q = useQuery({ queryKey: qk.admin.orders(params), queryFn: () => adminApi.orders(params) });

  return (
    <>
      <PageTitle kicker={t.nav.admin.finance} title={t.admin.payments.title} />
      <p className="text-sm text-muted-foreground">{t.admin.payments.intro}</p>
      <Select value={status} onValueChange={(v) => (setStatus(v as OrderStatus | 'all'), setPage(1))}>
        <SelectTrigger className="w-60 rounded-full" aria-label={t.common.status}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t.common.status}: {t.common.all}
          </SelectItem>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t.status.order[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={6} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyState title={t.admin.payments.empty} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.payments.colOrder}</TableHead>
                  <TableHead>{t.admin.transfers.colStudent}</TableHead>
                  <TableHead>{t.admin.payments.colAmount}</TableHead>
                  <TableHead>{t.admin.payments.colMethod}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <span className="font-mono text-xs" dir="ltr">
                        {o.reference}
                      </span>
                      <span className="block text-xs text-muted-foreground">{f.dateTime(o.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <bdi>{o.user?.name ?? '—'}</bdi>
                      <span className="block text-xs text-muted-foreground" dir="ltr">
                        {o.enrollment?.batch.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      {money.aed(o.totalFils)}
                      {o.refundedFils > 0 && <span className="block text-xs text-muted-foreground">−{money.aed(o.refundedFils)}</span>}
                    </TableCell>
                    <TableCell>{t.status.method[o.method]}</TableCell>
                    <TableCell>
                      <OrderStatusChip status={o.status} />
                    </TableCell>
                    <TableCell className="text-end">
                      {o.status === 'PAID' && (
                        <Button size="xs" variant="outline" onClick={() => setRefunding(o)}>
                          {t.admin.payments.refund}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={q.data.page} pageCount={q.data.pageCount} onPage={setPage} />
          </>
        )}
      </Panel>
      <RefundDialog order={refunding} onClose={() => setRefunding(null)} />
    </>
  );
}

function RefundDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { t, fill } = useI18n();
  const qc = useQueryClient();
  const form = useForm<z.input<typeof refundInput>>({ resolver: zodResolver(refundInput), values: { amountAed: order ? filsToAed(order.totalFils - order.refundedFils) : 0, reason: '' } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof refundInput>) => adminApi.refund(order!.id, v),
    onSuccess: () => {
      toast.success(t.admin.payments.refunded);
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fill(t.admin.payments.refundTitle, { ref: order?.reference ?? '' })}</DialogTitle>
        </DialogHeader>
        <form id="refund-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">{t.admin.payments.amountAed}</Label>
            <Input id="amount" type="number" step="0.01" dir="ltr" {...form.register('amountAed', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-reason">{t.admin.payments.reason}</Label>
            <Textarea id="r-reason" rows={2} {...form.register('reason')} aria-invalid={!!form.formState.errors.reason} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="refund-form" variant="ink" disabled={m.isPending}>
            {t.admin.payments.refund}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
