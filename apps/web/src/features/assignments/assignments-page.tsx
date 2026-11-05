'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submissionInput } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { meApi, type Assignment } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';
import { useMyAssignments } from '../learn/hooks';

type SubmissionValues = z.input<typeof submissionInput>;

export function AssignmentsPage() {
  const { t, f, fill, pick } = useI18n();
  const q = useMyAssignments();
  const [open, setOpen] = useState<Assignment | null>(null);
  const now = useNow(60_000);

  return (
    <>
      <PageTitle title={t.assignments.title} />
      {q.isPending ? (
        <LoadingBlock rows={4} height={88} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={t.assignments.empty} action={{ label: t.learn.browse, href: '/#catalog' }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data.map((a) => {
            const sub = a.mySubmission;
            const overdue = !sub && new Date(a.dueAt).getTime() < now;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-5">
                <div className="min-w-0 flex-1">
                  <span className="label-mono text-muted-foreground" dir="ltr">
                    {a.enrollment.batch.code}
                  </span>
                  <b className="block text-lg">{a.title}</b>
                  <span className="text-sm text-muted-foreground">{pick(a.enrollment.batch.course.titleEn, a.enrollment.batch.course.titleAr).text}</span>
                  {a.description && <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>}
                  {sub?.feedback && (
                    <p className="mt-2 rounded-xl bg-background p-3 text-sm">
                      <b>{t.assignments.feedback}: </b>
                      {sub.feedback}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {sub?.score != null ? (
                    <Chip tone="sage">{fill(t.assignments.graded, { s: sub.score, m: a.maxScore })}</Chip>
                  ) : sub ? (
                    <Chip tone="sky">{t.assignments.submitted}</Chip>
                  ) : (
                    <Chip tone={overdue ? 'danger' : 'sun'}>{overdue ? t.assignments.overdue : fill(t.assignments.due, { d: f.dateTime(a.dueAt) })}</Chip>
                  )}
                  {!sub && (
                    <Button size="sm" onClick={() => setOpen(a)}>
                      {t.assignments.submit}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SubmitDialog assignment={open} onClose={() => setOpen(null)} />
    </>
  );
}

function SubmitDialog({ assignment, onClose }: { assignment: Assignment | null; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const form = useForm<SubmissionValues>({ resolver: zodResolver(submissionInput), defaultValues: { url: undefined, text: '' } });
  const m = useMutation({
    mutationFn: (v: SubmissionValues) => meApi.submit(assignment!.id, { url: v.url || undefined, text: v.text || undefined }),
    onSuccess: () => {
      toast.success(t.assignments.submitDone);
      if (assignment) void qc.invalidateQueries({ queryKey: qk.assignments(assignment.batchId) });
      form.reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{assignment?.title}</DialogTitle>
        </DialogHeader>
        <form id="submit-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">{t.assignments.url}</Label>
            <Input id="url" type="url" dir="ltr" placeholder="https://" {...form.register('url', { setValueAs: (v: string) => (v ? v : undefined) })} />
            {form.formState.errors.url && <span className="text-[13px] text-danger-fg">{form.formState.errors.url.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="text">{t.assignments.text}</Label>
            <Textarea id="text" rows={4} {...form.register('text')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="submit-form" disabled={m.isPending}>
            {m.isPending ? t.common.saving : t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
