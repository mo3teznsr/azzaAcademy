'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rescheduleSessionInput, updateAgendaInput } from '@azza/shared';
import type { z } from 'zod';
import { Plus, Radio, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SessionStatusChip } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi, sessionsApi, type SessionDetail } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { slate } from '@/lib/i18n/format';
import { minutesUntil, sessionState } from '@/lib/schedule';
import { Materials } from './batch-workspace';

type AgendaValues = z.input<typeof updateAgendaInput>;

export function SessionPrep({ sessionId }: { sessionId: string }) {
  const q = useQuery({ queryKey: qk.session(sessionId), queryFn: () => sessionsApi.get(sessionId) });
  if (q.isPending) return <LoadingBlock rows={3} height={120} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Prep s={q.data} />;
}

function Prep({ s }: { s: SessionDetail }) {
  const { t, f } = useI18n();
  const qc = useQueryClient();
  const batch = useQuery({ queryKey: qk.batch(s.batchId), queryFn: () => batchesApi.get(s.batchId) });
  const form = useForm<AgendaValues>({ resolver: zodResolver(updateAgendaInput) });
  const items = useFieldArray({ control: form.control, name: 'agenda' as never });
  useEffect(() => {
    form.reset({ title: s.title, agenda: s.agenda ?? [], notes: s.notes ?? '' });
  }, [s, form]);
  const save = useMutation({
    mutationFn: (v: AgendaValues) => sessionsApi.updateAgenda(s.id, v),
    onSuccess: () => {
      toast.success(t.common.saved);
      void qc.invalidateQueries({ queryKey: qk.session(s.id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const st = sessionState(s);

  return (
    <>
      <PageTitle
        kicker={
          <span dir="ltr">
            {slate(s.batch.code, s.number)} · {t.studio.prepPage.title}
          </span>
        }
        title={s.title}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <SessionStatusChip state={st} minutes={minutesUntil(s.startsAt)} />
            {st === 'ENDED' ? (
              <Button asChild variant="outline">
                <Link href={`/studio/sessions/${s.id}/report`}>{t.studio.prepPage.report}</Link>
              </Button>
            ) : (
              <Button asChild variant="sun">
                <Link href={`/studio/live/${s.id}`}>
                  <Radio /> {t.studio.prepPage.goToRoom}
                </Link>
              </Button>
            )}
            {st !== 'ENDED' && <RequestMove s={s} />}
          </div>
        }
      />
      <p className="text-muted-foreground">
        {f.dateLong(s.startsAt)} · {f.time(s.startsAt)}–{f.time(s.endsAt)}
      </p>
      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <form className="flex flex-col gap-5" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">{t.studio.prepPage.sessionTitle}</Label>
              <Input id="title" {...form.register('title')} />
            </div>
            <SectionHeader title={t.studio.prepPage.agenda} size="sm" />
            <ol className="flex flex-col gap-2">
              {items.fields.map((field, i) => (
                <li key={field.id} className="grid grid-cols-[88px_1fr_auto] items-center gap-2">
                  <Input type="number" min={0} aria-label={t.studio.prepPage.minute} {...form.register(`agenda.${i}.minute`, { valueAsNumber: true })} />
                  <Input aria-label={t.studio.prepPage.label} {...form.register(`agenda.${i}.label`)} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.remove} onClick={() => items.remove(i)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ol>
            <Button type="button" variant="outline" className="self-start" onClick={() => items.append({ minute: 0, label: '' } as never)}>
              <Plus /> {t.studio.prepPage.addItem}
            </Button>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t.studio.prepPage.notes}</Label>
              <Textarea id="notes" rows={5} {...form.register('notes')} />
              <span className="text-[13px] text-muted-foreground">{t.studio.prepPage.notesHint}</span>
            </div>
            <Button type="submit" disabled={save.isPending} className="self-start">
              {save.isPending ? t.common.saving : t.studio.prepPage.save}
            </Button>
          </form>
        </Panel>
        <Panel>
          <SectionHeader title={t.studio.prepPage.materials} size="sm" />
          {batch.data ? <Materials b={batch.data} sessionId={s.id} /> : batch.isError ? <ErrorState compact error={batch.error} /> : <LoadingBlock rows={2} />}
        </Panel>
      </div>
    </>
  );
}

type MoveValues = z.input<typeof rescheduleSessionInput>;

function RequestMove({ s }: { s: SessionDetail }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const form = useForm<MoveValues, unknown, z.output<typeof rescheduleSessionInput>>({ resolver: zodResolver(rescheduleSessionInput), defaultValues: { startsAt: '', reason: '', notifyStudents: true } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof rescheduleSessionInput>) => sessionsApi.reschedule(s.id, v),
    onSuccess: () => {
      toast.success(t.studio.prepPage.requestSent);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t.studio.prepPage.requestMove}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.studio.prepPage.requestMove}</DialogTitle>
        </DialogHeader>
        <form id="move-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startsAt">{t.studio.prepPage.newTime}</Label>
            <Input id="startsAt" type="datetime-local" {...form.register('startsAt', { setValueAs: (v: string) => (v ? new Date(v).toISOString() : '') })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">{t.studio.prepPage.reason}</Label>
            <Textarea id="reason" rows={3} {...form.register('reason')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="move-form" disabled={m.isPending}>
            {t.studio.prepPage.sendRequest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
