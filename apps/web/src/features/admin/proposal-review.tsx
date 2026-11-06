'use client';

import { useId, useState } from 'react';
import { Check, Hourglass, MessageSquareWarning, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

type ProposalErrorCode = keyof Dictionary['proposals']['errors'];

/** Maps the proposal/review business-rule codes to translated copy; anything else keeps the API's message. */
export function useProposalError() {
  const { t } = useI18n();
  return (e: unknown): string => {
    if (e instanceof ApiError && e.code in t.proposals.errors) return t.proposals.errors[e.code as ProposalErrorCode];
    return e instanceof Error ? e.message : String(e);
  };
}

/** Status callout above a proposal: pending (sun), sent back (peach) or neutral (locked / draft). */
export function ProposalNotice({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: 'pending' | 'sentBack' | 'neutral';
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === 'pending' ? Hourglass : tone === 'sentBack' ? MessageSquareWarning : Check;
  return (
    <section
      role={tone === 'sentBack' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-start gap-4 rounded-xl p-5',
        tone === 'pending' && 'bg-sun text-ink',
        tone === 'sentBack' && 'bg-peach text-ink',
        tone === 'neutral' && 'border border-border bg-card',
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
        <b className="font-display text-lg leading-tight">{title}</b>
        {children}
      </div>
      {action && <div className="flex flex-wrap gap-2 self-center">{action}</div>}
    </section>
  );
}

/** The admin's note, quoted as the teacher should read it. */
export function ReviewNoteQuote({ note }: { note: string }) {
  return (
    <blockquote className="whitespace-pre-line border-s-2 border-current ps-3 text-[15px]" dir="auto">
      {note}
    </blockquote>
  );
}

/** Approve + Send back for an admin looking at a PENDING_REVIEW proposal. Send back asks for a note (≥ 3 chars). */
export function ReviewActions({
  onApprove,
  onSendBack,
  pending,
  onInk,
}: {
  onApprove: () => void;
  onSendBack: (note: string) => Promise<unknown>;
  pending?: boolean;
  /** Sits on the ink action bar (course editor) rather than the page background. */
  onInk?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={onInk ? 'secondary' : 'outline'} className={onInk ? 'bg-ink-2 text-ivory' : undefined} disabled={pending} onClick={() => setOpen(true)}>
        <Undo2 /> {t.proposals.sendBack}
      </Button>
      <Button type="button" variant={onInk ? 'sun' : 'ink'} disabled={pending} onClick={onApprove}>
        <Check /> {t.proposals.approve}
      </Button>
      <SendBackDialog open={open} onOpenChange={setOpen} onConfirm={onSendBack} pending={pending} />
    </>
  );
}

function SendBackDialog({ open, onOpenChange, onConfirm, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (note: string) => Promise<unknown>; pending?: boolean }) {
  const { t } = useI18n();
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
    if (note.trim().length < 3) return setError(t.proposals.noteTooShort);
    try {
      await onConfirm(note.trim());
      close(false);
    } catch {
      /* the caller already toasted the error; keep the note so it isn't lost */
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.proposals.sendBackTitle}</DialogTitle>
          <DialogDescription>{t.proposals.sendBackBody}</DialogDescription>
        </DialogHeader>
        <form id={`${id}-form`} className="flex flex-col gap-1.5" onSubmit={(e) => void submit(e)} noValidate>
          <Label htmlFor={`${id}-note`}>{t.proposals.note}</Label>
          <Textarea
            id={`${id}-note`}
            rows={4}
            dir="auto"
            required
            minLength={3}
            maxLength={1000}
            value={note}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => (setNote(e.target.value), setError(null))}
          />
          {error && (
            <span id={`${id}-err`} className="text-[13px] text-destructive">
              {error}
            </span>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={`${id}-form`} variant="ink" disabled={pending}>
            {t.proposals.sendBack}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
