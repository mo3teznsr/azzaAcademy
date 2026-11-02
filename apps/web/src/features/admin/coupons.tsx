'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { couponInput } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const optNum = (v: string) => (v === '' || v == null ? undefined : Number(v));

export function Coupons() {
  const { t, f } = useI18n();
  const money = useMoney();
  const q = useQuery({ queryKey: qk.admin.coupons, queryFn: adminApi.coupons });
  return (
    <>
      <PageTitle kicker={t.nav.admin.finance} title={t.admin.coupons.title} aside={<NewCoupon />} />
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={4} height={48} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.length === 0 ? (
          <EmptyState title={t.admin.coupons.empty} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.coupons.code}</TableHead>
                <TableHead>{t.checkout.discount}</TableHead>
                <TableHead>{t.admin.coupons.used}</TableHead>
                <TableHead>{t.admin.coupons.expires}</TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold" dir="ltr">
                    {c.code}
                  </TableCell>
                  <TableCell>{c.percentOff ? `${f.number(c.percentOff)}%` : c.amountOffFils ? money.aed(c.amountOffFils) : '—'}</TableCell>
                  <TableCell>
                    {f.number(c.redemptions)}
                    {c.maxRedemptions ? ` / ${f.number(c.maxRedemptions)}` : ''}
                  </TableCell>
                  <TableCell>{c.expiresOn ? f.dayMonth(c.expiresOn) : '—'}</TableCell>
                  <TableCell>{c.active ? <Chip tone="sage">{t.admin.coupons.active}</Chip> : <Chip>{t.admin.coupons.inactive}</Chip>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function NewCoupon() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof couponInput>>({ resolver: zodResolver(couponInput), defaultValues: { code: '' } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof couponInput>) => adminApi.createCoupon(v),
    onSuccess: () => {
      toast.success(t.admin.coupons.created);
      void qc.invalidateQueries({ queryKey: qk.admin.coupons });
      setOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ink">{t.admin.coupons.new}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.coupons.new}</DialogTitle>
        </DialogHeader>
        <form id="coupon-form" className="grid grid-cols-2 gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="c-code">{t.admin.coupons.code}</Label>
            <Input id="c-code" dir="ltr" className="uppercase" {...form.register('code', { setValueAs: (v: string) => v.toUpperCase() })} aria-invalid={!!err.code} />
            {err.code && <span className="text-[13px] text-destructive">{err.code.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-pct">{t.admin.coupons.percentOff}</Label>
            <Input id="c-pct" type="number" min={1} max={100} {...form.register('percentOff', { setValueAs: optNum })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-amt">{t.admin.coupons.amountOff}</Label>
            <Input id="c-amt" type="number" step="0.01" {...form.register('amountOffAed', { setValueAs: optNum })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-max">{t.admin.coupons.max}</Label>
            <Input id="c-max" type="number" min={1} {...form.register('maxRedemptions', { setValueAs: optNum })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-exp">{t.admin.coupons.expires}</Label>
            <Input id="c-exp" type="date" dir="ltr" {...form.register('expiresOn', { setValueAs: (v: string) => v || undefined })} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="coupon-form" variant="ink" disabled={m.isPending}>
            {t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
