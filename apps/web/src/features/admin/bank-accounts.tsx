'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bankAccountInput, type BankAccountInput } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, type BankAccount } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

export function BankAccounts() {
  const { t, f } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.admin.bankAccounts, queryFn: adminApi.bankAccounts });
  const [editing, setEditing] = useState<BankAccount | 'new' | null>(null);
  const toggle = useMutation({
    mutationFn: (a: BankAccount) => adminApi.updateBankAccount(a.id, { active: !a.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.admin.bankAccounts }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <PageTitle
        kicker={t.nav.admin.finance}
        title={t.admin.banks.title}
        aside={
          <Button variant="ink" onClick={() => setEditing('new')}>
            {t.admin.banks.add}
          </Button>
        }
      />
      <p className="max-w-3xl text-sm text-muted-foreground">{t.admin.banks.intro}</p>
      {q.isPending ? (
        <LoadingBlock rows={3} height={110} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={t.admin.banks.empty} action={{ label: t.admin.banks.add, onClick: () => setEditing('new') }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {[...q.data].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => (
            <li key={a.id}>
              <Panel className="flex-row flex-wrap items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="timecode grid size-10 place-items-center rounded-full bg-ink text-ivory">{f.number(a.sortOrder)}</span>
                  <div>
                    <b className="block text-lg">{a.bankName}</b>
                    <span className="text-sm text-muted-foreground">
                      {a.accountName}
                      {a.branch ? ` · ${a.branch}` : ''}
                    </span>
                    <span className="block font-mono text-xs" dir="ltr">
                      IBAN {a.iban} · SWIFT {a.swift}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Chip tone="ivory">AED</Chip>
                  <label className="flex items-center gap-2 text-sm">
                    {t.admin.banks.show}
                    <Switch checked={a.active} onCheckedChange={() => toggle.mutate(a)} />
                  </label>
                  <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
                    {t.common.edit}
                  </Button>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <BankDialog editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function BankDialog({ editing, onClose }: { editing: BankAccount | 'new' | null; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const current = editing && editing !== 'new' ? editing : null;
  const form = useForm<z.input<typeof bankAccountInput>, unknown, BankAccountInput>({
    resolver: zodResolver(bankAccountInput),
    values: current
      ? { bankName: current.bankName, accountName: current.accountName, iban: current.iban, swift: current.swift, branch: current.branch ?? '', instructions: current.instructions ?? '', active: current.active, sortOrder: current.sortOrder }
      : { bankName: '', accountName: '', iban: '', swift: '', branch: '', instructions: '', active: true, sortOrder: 0 },
  });
  const m = useMutation({
    mutationFn: (v: BankAccountInput) => (current ? adminApi.updateBankAccount(current.id, v) : adminApi.createBankAccount(v)),
    onSuccess: () => {
      toast.success(t.admin.banks.saved);
      void qc.invalidateQueries({ queryKey: qk.admin.bankAccounts });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors;
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{current ? t.admin.banks.edit : t.admin.banks.add}</DialogTitle>
        </DialogHeader>
        <form id="bank-form" className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <Fld label={t.admin.banks.bankName} error={err.bankName?.message}>
            <Input {...form.register('bankName')} />
          </Fld>
          <Fld label={t.admin.banks.accountName} error={err.accountName?.message}>
            <Input {...form.register('accountName')} />
          </Fld>
          <Fld label={t.admin.banks.iban} error={err.iban?.message}>
            <Input dir="ltr" placeholder="AE…" {...form.register('iban')} />
          </Fld>
          <Fld label={t.admin.banks.swift} error={err.swift?.message}>
            <Input dir="ltr" {...form.register('swift')} />
          </Fld>
          <Fld label={t.admin.banks.branch}>
            <Input {...form.register('branch')} />
          </Fld>
          <Fld label={t.admin.banks.currency}>
            <Input value={t.admin.banks.currencyLocked} disabled />
          </Fld>
          <Fld label={t.admin.banks.order}>
            <Input type="number" {...form.register('sortOrder', { valueAsNumber: true })} />
          </Fld>
          <label className="flex items-center justify-between gap-3 self-end text-sm">
            {t.admin.banks.show}
            <Controller control={form.control} name="active" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
          </label>
          <Fld label={t.admin.banks.instructions} className="sm:col-span-2">
            <Textarea rows={3} {...form.register('instructions')} />
          </Fld>
        </form>
        <DialogFooter>
          <Button type="submit" form="bank-form" variant="ink" disabled={m.isPending}>
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label className="text-[13px] text-muted-foreground">{label}</Label>
      {children}
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}
