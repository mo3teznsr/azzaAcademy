'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPayoutRunInput, markPayoutPaidInput, payoutAdjustmentInput } from '@azza/shared';
import type { z } from 'zod';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Chip, PayoutStatusChip, RunStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type PayoutRunDetail, type RunPayout } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

export function Payouts() {
  const { t, f } = useI18n();
  const money = useMoney();
  const runs = useQuery({ queryKey: qk.admin.payoutRuns, queryFn: () => adminApi.payoutRuns({ pageSize: 50 }), select: (p) => p.items });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ?? runs.data?.[0]?.id ?? null;

  return (
    <>
      <PageTitle kicker={t.nav.admin.finance} title={t.admin.payouts.title} aside={<NewRun />} />
      <Panel>
        <SectionHeader title={t.admin.payouts.policyTitle} size="sm" />
        <ul className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground md:grid-cols-2">
          {t.admin.payouts.policy.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      </Panel>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_2fr]">
        <Panel className="p-2">
          <SectionHeader title={<span className="px-2">{t.admin.payouts.runs}</span>} size="sm" />
          {runs.isPending ? (
            <LoadingBlock rows={3} height={48} />
          ) : runs.isError ? (
            <ErrorState error={runs.error} onRetry={() => void runs.refetch()} />
          ) : runs.data.length === 0 ? (
            <EmptyState title={t.admin.payouts.empty} />
          ) : (
            <ul className="flex flex-col gap-1">
              {runs.data.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    aria-pressed={r.id === selected}
                    className="flex w-full items-center justify-between gap-2 rounded-xl p-3 text-start hover:bg-muted aria-pressed:bg-ink aria-pressed:text-ivory"
                  >
                    <span>
                      <b className="block">
                        {f.dayMonth(r.periodStart)} → {f.dayMonth(r.periodEnd)}
                      </b>
                      <span className="text-xs opacity-70">{money.aed(r.totalFils)}
                        {r.heldCount ? ` · ${f.number(r.heldCount)} ${t.status.payout.HELD}` : ''}</span>
                    </span>
                    <RunStatusChip status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {selected ? <RunDetail id={selected} /> : <Panel><p className="text-sm text-muted-foreground">{t.admin.payouts.selectRun}</p></Panel>}
      </div>
    </>
  );
}

function RunDetail({ id }: { id: string }) {
  const { t, f } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.admin.payoutRun(id), queryFn: () => adminApi.payoutRun(id) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.admin.payoutRun(id) });
    void qc.invalidateQueries({ queryKey: qk.admin.payoutRuns });
  };
  const approve = useMutation({ mutationFn: () => adminApi.approveRun(id), onSuccess: () => (toast.success(t.admin.payouts.approved), refresh()), onError: (e: Error) => toast.error(e.message) });
  const verify = useMutation({ mutationFn: (teacherId: string) => adminApi.verifyTeacherBank(teacherId), onSuccess: () => (toast.success(t.common.saved), refresh()), onError: (e: Error) => toast.error(e.message) });
  const exportCsv = useMutation({
    mutationFn: () => adminApi.exportRun(id),
    onSuccess: async (res) => {
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `payout-run-${id}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isPending) return <LoadingBlock rows={4} height={52} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const run: PayoutRunDetail = q.data;
  const payouts = run.payouts;
  const total = run.totals.totalFils;

  return (
    <Panel>
      <SectionHeader
        title={
          <>
            {f.dayMonth(run.periodStart)} → {f.dayMonth(run.periodEnd)}
          </>
        }
        aside={<RunStatusChip status={run.status} />}
      />
      <div className="flex flex-wrap gap-2">
        {run.status === 'DRAFT' && (
          <Button variant="ink" onClick={() => approve.mutate()} disabled={approve.isPending}>
            {t.admin.payouts.approve}
          </Button>
        )}
        {run.status !== 'DRAFT' && (
          <Button variant="outline" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
            <Download /> {t.admin.payouts.export}
          </Button>
        )}
        {(run.status === 'APPROVED' || run.status === 'PROCESSING') && <MarkPaid runId={id} onDone={refresh} />}
      </div>
      {payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.admin.payouts.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.admin.payouts.colTeacher}</TableHead>
              <TableHead>{t.admin.payouts.colAmount}</TableHead>
              <TableHead>{t.admin.payouts.colAdj}</TableHead>
              <TableHead>{t.admin.payouts.colNet}</TableHead>
              <TableHead>{t.admin.payouts.colBank}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="text-end">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <bdi className="font-medium">{p.teacher.name}</bdi>
                  {p.holdReason && <span className="block text-xs text-muted-foreground">{p.holdReason}</span>}
                </TableCell>
                <TableCell>{money.aed(p.amountFils)}</TableCell>
                <TableCell>{p.adjustmentsFils ? money.aed(p.adjustmentsFils) : '—'}</TableCell>
                <TableCell className="font-semibold">{money.aed(p.totalFils)}</TableCell>
                <TableCell>
                  {p.teacher.bankDetails ? (
                    p.teacher.bankDetails.verified ? (
                      <Chip tone="sage">{t.studio.earnings.verified}</Chip>
                    ) : (
                      <Button size="xs" variant="outline" onClick={() => verify.mutate(p.teacher.id)}>
                        {t.admin.payouts.verifyBank}
                      </Button>
                    )
                  ) : (
                    <Chip tone="peach">—</Chip>
                  )}
                </TableCell>
                <TableCell>
                  <PayoutStatusChip status={p.status} />
                </TableCell>
                <TableCell className="text-end">{run.status === 'DRAFT' && <Adjust payout={p} onDone={refresh} />}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold">{t.checkout.total}</TableCell>
              <TableCell colSpan={2} />
              <TableCell className="font-semibold">{money.aed(total)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function NewRun() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const form = useForm<z.input<typeof createPayoutRunInput>>({ resolver: zodResolver(createPayoutRunInput), defaultValues: { periodStart: iso(start), periodEnd: iso(end) } });
  const m = useMutation({
    mutationFn: adminApi.createPayoutRun,
    onSuccess: () => {
      toast.success(t.admin.payouts.created);
      void qc.invalidateQueries({ queryKey: qk.admin.payoutRuns });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ink">{t.admin.payouts.newRun}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.payouts.newRun}</DialogTitle>
        </DialogHeader>
        <form id="run-form" className="grid grid-cols-2 gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ps">{t.admin.payouts.periodStart}</Label>
            <Input id="ps" type="date" dir="ltr" {...form.register('periodStart')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pe">{t.admin.payouts.periodEnd}</Label>
            <Input id="pe" type="date" dir="ltr" {...form.register('periodEnd')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="run-form" variant="ink" disabled={m.isPending}>
            {t.admin.payouts.createRun}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkPaid({ runId, onDone }: { runId: string; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof markPayoutPaidInput>>({ resolver: zodResolver(markPayoutPaidInput), defaultValues: { transferReference: '' } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof markPayoutPaidInput>) => adminApi.markRunPaid(runId, v),
    onSuccess: () => {
      toast.success(t.admin.payouts.paid);
      onDone();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="sun">{t.admin.payouts.markPaid}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.payouts.markPaid}</DialogTitle>
        </DialogHeader>
        <form id="paid-form" className="flex flex-col gap-1.5" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <Label htmlFor="ref">{t.admin.payouts.transferRef}</Label>
          <Input id="ref" dir="ltr" {...form.register('transferReference')} aria-invalid={!!form.formState.errors.transferReference} />
        </form>
        <DialogFooter>
          <Button type="submit" form="paid-form" variant="ink" disabled={m.isPending}>
            {t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Adjust({ payout, onDone }: { payout: RunPayout; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const form = useForm<z.input<typeof payoutAdjustmentInput>>({ resolver: zodResolver(payoutAdjustmentInput), defaultValues: { payoutId: payout.id, amountAed: 0, reason: '' } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof payoutAdjustmentInput>) => adminApi.addAdjustment(v),
    onSuccess: () => {
      toast.success(t.common.saved);
      onDone();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="outline">
          {t.admin.payouts.addAdjustment}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.admin.payouts.addAdjustment} · <bdi>{payout.teacher?.name}</bdi>
          </DialogTitle>
        </DialogHeader>
        <form id={`adj-${payout.id}`} className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-amt">{t.admin.payouts.adjustmentAmount}</Label>
            <Input id="adj-amt" type="number" step="0.01" dir="ltr" {...form.register('amountAed', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-reason">{t.admin.payouts.adjustmentReason}</Label>
            <Textarea id="adj-reason" rows={2} {...form.register('reason')} aria-invalid={!!form.formState.errors.reason} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={`adj-${payout.id}`} variant="ink" disabled={m.isPending}>
            {t.common.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
