'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fxRateInput } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, checkoutApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

const CODES = ['SAR', 'QAR', 'USD'] as const;

export function Currencies() {
  const { t, f, fill } = useI18n();
  const q = useQuery({ queryKey: qk.fxRates, queryFn: checkoutApi.fxRates });
  return (
    <>
      <PageTitle kicker={t.admin.currencies.sub} title={t.admin.currencies.title} />
      <Panel className="bg-ink text-ivory in-data-[theme=cream]:bg-ink">
        <div className="flex items-center justify-between">
          <span className="label-mono text-stone">{t.admin.currencies.base}</span>
          <Chip tone="ivory">{t.admin.currencies.locked}</Chip>
        </div>
        <b className="font-display text-6xl font-extrabold">AED</b>
        <p className="max-w-2xl text-sm text-stone">{t.admin.currencies.baseNote}</p>
      </Panel>
      {q.isPending ? (
        <LoadingBlock rows={3} height={140} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{fill(t.admin.currencies.updated, { d: f.dateTime(q.data.updatedAt) })}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {CODES.map((c) => (
              <RateCard key={c} code={c} rate={q.data.rates[c]} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function RateCard({ code, rate }: { code: (typeof CODES)[number]; rate?: number }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const form = useForm<z.input<typeof fxRateInput>>({ resolver: zodResolver(fxRateInput), values: { currency: code, ratePerAed: rate ?? 0 } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof fxRateInput>) => adminApi.setFxRate(v),
    onSuccess: () => {
      toast.success(t.admin.currencies.saved);
      void qc.invalidateQueries({ queryKey: qk.fxRates });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Panel>
      <SectionHeader title={code} size="sm" />
      <p className="text-sm">{rate ? fill(t.admin.currencies.rate, { r: f.number(rate, { maximumFractionDigits: 4 }), c: code }) : t.admin.currencies.unavailable}</p>
      {rate && <p className="text-[13px] text-muted-foreground">{fill(t.admin.currencies.example, { v: money.in(88000, code) })}</p>}
      <form className="flex items-end gap-2" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={`rate-${code}`} className="text-[13px] text-muted-foreground">
            {t.admin.currencies.override}
          </Label>
          <Input id={`rate-${code}`} type="number" step="0.0001" dir="ltr" {...form.register('ratePerAed', { valueAsNumber: true })} />
        </div>
        <Button type="submit" variant="ink" disabled={m.isPending}>
          {t.common.save}
        </Button>
      </form>
    </Panel>
  );
}
