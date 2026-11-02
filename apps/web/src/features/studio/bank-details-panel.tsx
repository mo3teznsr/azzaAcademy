'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teacherBankDetailsInput, type TeacherBankDetailsInput } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/brand/status-chip';
import { Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { teacherApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

const mask = (iban: string) => `${iban.slice(0, 2)}•• •••• •••• •••• ${iban.slice(-4)}`;

export function BankDetailsPanel() {
  const { t, f } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.bankDetails, queryFn: teacherApi.bankDetails });
  const [editing, setEditing] = useState(false);
  const form = useForm<TeacherBankDetailsInput>({ resolver: zodResolver(teacherBankDetailsInput) });
  useEffect(() => {
    if (q.data) form.reset({ bankName: q.data.bankName, accountHolder: q.data.accountHolder, iban: q.data.iban, swift: q.data.swift });
  }, [q.data, form]);
  const save = useMutation({
    mutationFn: teacherApi.saveBankDetails,
    onSuccess: () => {
      toast.success(t.common.saved);
      setEditing(false);
      void qc.invalidateQueries({ queryKey: qk.bankDetails });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors;

  return (
    <Panel>
      <SectionHeader title={t.studio.earnings.method} size="sm" aside={q.data ? <Chip tone={q.data.verified ? 'sage' : 'sun'}>{q.data.verified ? t.studio.earnings.verified : t.studio.earnings.unverified}</Chip> : undefined} />
      {q.isPending ? (
        <LoadingBlock rows={2} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : !editing && q.data ? (
        <div className="flex flex-col gap-2">
          <b className="text-lg">{q.data.bankName}</b>
          <span className="text-sm text-muted-foreground">
            {t.studio.earnings.holder} · <bdi>{q.data.accountHolder}</bdi>
          </span>
          <span className="font-mono text-sm" dir="ltr">
            IBAN {mask(q.data.iban)} · SWIFT {q.data.swift} · AED
          </span>
          {q.data.verifiedAt && <span className="text-[13px] text-muted-foreground">{f.dateLong(q.data.verifiedAt)}</span>}
          <Button variant="outline" className="mt-2 self-start" onClick={() => setEditing(true)}>
            {t.studio.earnings.changeBank}
          </Button>
          <p className="text-[13px] text-muted-foreground">{t.studio.earnings.changeNote}</p>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
          {!q.data && <p className="text-sm text-muted-foreground">{t.studio.earnings.noBank}</p>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bankName">{t.studio.earnings.bankName}</Label>
            <Input id="bankName" {...form.register('bankName')} aria-invalid={!!err.bankName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountHolder">{t.studio.earnings.holder}</Label>
            <Input id="accountHolder" {...form.register('accountHolder')} aria-invalid={!!err.accountHolder} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="iban">{t.studio.earnings.iban}</Label>
              <Input id="iban" dir="ltr" placeholder="AE…" {...form.register('iban')} aria-invalid={!!err.iban} />
              {err.iban && <span className="text-[13px] text-danger-fg">{err.iban.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="swift">{t.studio.earnings.swift}</Label>
              <Input id="swift" dir="ltr" {...form.register('swift')} aria-invalid={!!err.swift} />
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">{t.studio.earnings.changeNote}</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {t.studio.earnings.saveBank}
            </Button>
            {q.data && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t.common.cancel}
              </Button>
            )}
          </div>
        </form>
      )}
    </Panel>
  );
}
