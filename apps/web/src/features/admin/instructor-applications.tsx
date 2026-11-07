'use client';

import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, Mail, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle } from '@/components/brand/section';
import { Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { useCategoryLabel } from '@/components/brand/category';
import { instructorsApi, type InstructorApplication, type InstructorApplicationStatus } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useInstructorError } from '@/features/instructors/errors';
import { ReviewNoteQuote } from './proposal-review';

const TABS: InstructorApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/** `/admin/instructors`: students applying to teach. Approve, or decline with a note. */
export function InstructorApplications() {
  const { t } = useI18n();
  const c = t.instructors.admin;
  const [status, setStatus] = useState<InstructorApplicationStatus>('PENDING');
  const q = useQuery({ queryKey: qk.admin.instructorApplications(status), queryFn: () => instructorsApi.list(status) });
  const label: Record<InstructorApplicationStatus, string> = { PENDING: c.tabPending, APPROVED: c.tabApproved, REJECTED: c.tabDeclined };

  return (
    <>
      <PageTitle kicker={t.nav.admin.people} title={c.title} />
      <p className="max-w-3xl text-sm text-muted-foreground">{c.intro}</p>
      <Tabs value={status} onValueChange={(v) => setStatus(v as InstructorApplicationStatus)}>
        <TabsList>
          {TABS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {label[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {q.isPending ? (
        <LoadingBlock rows={3} height={180} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={status === 'PENDING' ? c.emptyPending : c.empty} />
      ) : (
        <ul className="grid gap-5 xl:grid-cols-2">
          {q.data.map((a) => (
            <li key={a.id}>
              <ApplicationCard application={a} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ApplicationCard({ application: a }: { application: InstructorApplication }) {
  const { t, f, fill } = useI18n();
  const c = t.instructors.admin;
  const qc = useQueryClient();
  const toMessage = useInstructorError();
  const categoryLabel = useCategoryLabel();
  const [declining, setDeclining] = useState(false);
  const review = useMutation({
    mutationFn: (input: { approve: boolean; note?: string }) => instructorsApi.review(a.id, input),
    onSuccess: (_, input) => {
      toast.success(input.approve ? c.approvedToast : c.declinedToast);
      void qc.invalidateQueries({ queryKey: ['admin', 'instructor-applications'] });
    },
    onError: (e) => toast.error(toMessage(e)),
  });
  const name = a.user?.name ?? '—';

  return (
    <article className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-5">
      <header className="flex items-start gap-4">
        <InitialsAvatar name={name} src={a.user?.image} size={52} className="rounded-[14px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <bdi className="font-display text-lg leading-tight font-extrabold">{name}</bdi>
          {a.user?.email && (
            <a href={`mailto:${a.user.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground" dir="ltr">
              <Mail className="size-3.5" aria-hidden /> {a.user.email}
            </a>
          )}
        </div>
        <span className="label-mono shrink-0 text-muted-foreground">
          {a.decidedAt ? fill(c.decided, { d: f.dayMonth(a.decidedAt) }) : fill(c.applied, { d: f.dayMonth(a.createdAt) })}
        </span>
      </header>

      <p className="font-display text-xl leading-snug font-extrabold" dir="auto">
        {a.headline}
      </p>

      <dl className="grid gap-4 text-sm">
        <Row label={c.bio}>
          <p className="whitespace-pre-line" dir="auto">
            {a.bio}
          </p>
        </Row>
        <Row label={c.experience}>
          <p className="whitespace-pre-line" dir="auto">
            {a.experience}
          </p>
        </Row>
        <Row label={c.categories}>
          <div className="flex flex-wrap gap-1.5">
            {a.categories.map((slug) => (
              <Chip key={slug} tone="sage">
                {categoryLabel({ category: slug })}
              </Chip>
            ))}
          </div>
        </Row>
        <Row label={c.languages}>
          <div className="flex flex-wrap gap-1.5">
            {a.languages.map((l) => (
              <Chip key={l} tone="outline">
                {t.status.sessionLanguage[l]}
              </Chip>
            ))}
          </div>
        </Row>
        {a.sampleUrl && (
          <Row label={c.sample}>
            <a href={a.sampleUrl} target="_blank" rel="noopener noreferrer nofollow" className="link-sun inline-flex max-w-full items-center gap-1.5" dir="ltr">
              <span className="truncate">{a.sampleUrl}</span> <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          </Row>
        )}
        {a.phone && (
          <Row label={c.phone}>
            <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5" dir="ltr">
              <Phone className="size-3.5" aria-hidden /> {a.phone}
            </a>
          </Row>
        )}
        {a.reviewNote && (
          <Row label={c.reviewNote}>
            <ReviewNoteQuote note={a.reviewNote} />
          </Row>
        )}
      </dl>

      {a.status === 'PENDING' && (
        <footer className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" disabled={review.isPending} onClick={() => setDeclining(true)}>
            <X /> {c.decline}
          </Button>
          <Button type="button" variant="ink" disabled={review.isPending} onClick={() => review.mutate({ approve: true })}>
            <Check /> {c.approve}
          </Button>
          <DeclineDialog open={declining} onOpenChange={setDeclining} pending={review.isPending} onConfirm={(note) => review.mutateAsync({ approve: false, note })} />
        </footer>
      )}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="label-mono pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Same pattern as the proposal "send back" dialog: a note of at least 3 characters. */
function DeclineDialog({ open, onOpenChange, onConfirm, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (note: string) => Promise<unknown>; pending?: boolean }) {
  const { t } = useI18n();
  const c = t.instructors.admin;
  const id = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setNote('');
      setError(null);
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 3) return setError(c.noteTooShort);
    try {
      await onConfirm(note.trim());
      close(false);
    } catch {
      /* the mutation already toasted; keep the note */
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.declineTitle}</DialogTitle>
          <DialogDescription>{c.declineBody}</DialogDescription>
        </DialogHeader>
        <form id={`${id}-form`} className="flex flex-col gap-1.5" onSubmit={(e) => void submit(e)} noValidate>
          <Label htmlFor={`${id}-note`}>{c.note}</Label>
          <InputGroup>
            <InputGroupTextarea
              id={`${id}-note`}
              rows={4}
              dir="auto"
              required
              minLength={3}
              maxLength={1000}
              placeholder={c.notePh}
              value={note}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => (setNote(e.target.value), setError(null))}
            />
          </InputGroup>
          {error && (
            <span id={`${id}-err`} role="alert" className="text-[13px] text-destructive">
              {error}
            </span>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={`${id}-form`} variant="ink" disabled={pending}>
            {c.decline}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
