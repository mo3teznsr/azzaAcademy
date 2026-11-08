'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MAX_SUBMISSION_FILES, submissionInput } from '@azza/shared';
import type { z } from 'zod';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, meApi, type Assignment } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useNow } from '@/lib/use-now';
import { useMyAssignments } from '../learn/hooks';
import { AttachmentsField, FileList, fileErrorReason, useDescribeFileError, useFileUploads } from '../files/file-attachments';

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
              <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
                <div className="min-w-0 flex-1">
                  <span className="label-mono text-muted-foreground" dir="ltr">
                    {a.enrollment.batch.code}
                  </span>
                  <b className="block text-lg">{a.title}</b>
                  <span className="text-sm text-muted-foreground">{pick(a.enrollment.batch.course.titleEn, a.enrollment.batch.course.titleAr).text}</span>
                  {a.description && <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>}
                  {sub && (sub.url || (sub.files?.length ?? 0) > 0) && (
                    <div className="mt-3 flex flex-col gap-2">
                      <span className="label-mono text-muted-foreground">{t.assignments.yourWork}</span>
                      {sub.url && (
                        <a href={sub.url} target="_blank" rel="noreferrer" className="link-sun break-all text-sm" dir="ltr">
                          {sub.url}
                        </a>
                      )}
                      <FileList files={sub.files ?? []} className="max-w-xl" />
                    </div>
                  )}
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
      {open && <SubmitDialog key={open.id} assignment={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function SubmitDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const describeFile = useDescribeFileError('submission');
  const [formError, setFormError] = useState<string | null>(null);
  const uploads = useFileUploads({
    kind: 'submission',
    max: MAX_SUBMISSION_FILES,
    uploader: (file, opts) => meApi.uploadSubmissionFile(assignment.id, file, opts),
  });
  const form = useForm<SubmissionValues>({ resolver: zodResolver(submissionInput), defaultValues: { url: undefined, text: '' } });
  const m = useMutation({
    mutationFn: (v: SubmissionValues) => meApi.submit(assignment.id, { url: v.url || undefined, text: v.text?.trim() || undefined, files: uploads.uploaded }),
    onSuccess: () => {
      toast.success(t.assignments.submitDone);
      void qc.invalidateQueries({ queryKey: qk.assignments(assignment.batchId) });
      onClose();
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.code === 'EMPTY_SUBMISSION') return setFormError(t.assignments.emptySubmission);
      if (e instanceof ApiError && e.code === 'SUBMISSION_FILE_INVALID') return setFormError(describeFile(fileErrorReason(e), '', e.message));
      toast.error(e.message);
    },
  });
  const onSubmit = (v: SubmissionValues) => {
    setFormError(null);
    if (uploads.busy) return setFormError(t.files.waitForUploads);
    if (!v.url && !v.text?.trim() && uploads.uploaded.length === 0) return setFormError(t.assignments.emptySubmission);
    m.mutate(v);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{assignment.title}</DialogTitle>
        </DialogHeader>
        <form id="submit-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <AttachmentsField uploads={uploads} kind="submission" max={MAX_SUBMISSION_FILES} label={t.assignments.files} disabled={m.isPending} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">{t.assignments.url}</Label>
            <InputGroup>
              <InputGroupAddon>
                <Link2 aria-hidden />
              </InputGroupAddon>
              <InputGroupInput id="url" type="url" dir="ltr" placeholder="https://" aria-invalid={!!form.formState.errors.url} {...form.register('url', { setValueAs: (v: string) => (v ? v : undefined) })} />
            </InputGroup>
            {form.formState.errors.url && <span className="text-[13px] text-danger-fg">{form.formState.errors.url.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="text">{t.assignments.text}</Label>
            <InputGroup>
              <InputGroupTextarea id="text" rows={4} {...form.register('text')} />
            </InputGroup>
          </div>
          {formError && (
            <span role="alert" className="text-[13px] text-destructive">
              {formError}
            </span>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="submit-form" disabled={m.isPending || uploads.busy}>
            {m.isPending ? t.common.saving : uploads.busy ? t.files.uploadingShort : t.common.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
