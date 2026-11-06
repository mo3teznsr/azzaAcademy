'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from '@/components/ui/input-group';
import { NumberStepper } from '@/components/brand/number-stepper';
import { batchesApi, sessionsApi, type BatchDetail, type LiveSession } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { zonedParts, zonedToUtcIso } from '@/lib/schedule';

type BatchOpsCode = 'START_IN_PAST' | 'BATCH_CLOSED' | 'CONFLICT' | 'CAPACITY_TOO_LOW' | 'BATCH_LOCKED';

/** Translated message for the batch/session API errors this module can hit; the API message otherwise. */
export function useBatchOpsError() {
  const { t, fill, f } = useI18n();
  return (e: unknown, enrolled?: number): string => {
    if (e instanceof ApiError && e.code in t.batchOps.errors) {
      return fill(t.batchOps.errors[e.code as BatchOpsCode], { n: f.number(enrolled ?? 0) });
    }
    return e instanceof Error ? e.message : String(e);
  };
}

/** `details.conflicts[].withBatch` from a 409 CONFLICT. */
function clashesOf(e: unknown): string[] {
  if (!(e instanceof ApiError) || e.status !== 409) return [];
  const list = (e.details as { conflicts?: Array<{ withBatch?: string }> } | undefined)?.conflicts ?? [];
  return list.map((c) => c.withBatch).filter((x): x is string => !!x);
}

function useRefreshBatch(batchId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.batch(batchId) });
    void qc.invalidateQueries({ queryKey: ['batches'] });
  };
}

/** True when this session can still be moved or cancelled. */
export const isUpcoming = (s: LiveSession) => s.status === 'SCHEDULED' && new Date(s.startsAt).getTime() > Date.now();

// ───────────────────────── Add session ─────────────────────────

export function AddSessionButton({ b }: { b: BatchDetail }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const closed = b.status === 'COMPLETED' || b.status === 'CANCELLED';
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={closed} title={closed ? t.batchOps.errors.BATCH_CLOSED : undefined}>
        <Plus /> {t.batchOps.addSession}
      </Button>
      {open && <AddSessionDialog b={b} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddSessionDialog({ b, onClose }: { b: BatchDetail; onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefreshBatch(b.id);
  const message = useBatchOpsError();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(b.schedule?.startTime ?? '19:00');
  const [duration, setDuration] = useState<number>(b.schedule?.durationMin ?? 60);
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(false);
  const startsAt = date && time ? zonedToUtcIso(date, time, b.timezone) : null;
  const titleOk = title.trim().length >= 2;
  const durationOk = Number.isFinite(duration) && duration >= 15 && duration <= 480;
  const add = useMutation({
    mutationFn: () => batchesApi.addSession(b.id, { title: title.trim(), startsAt: startsAt!, durationMin: duration, notifyStudents: notify }),
    onSuccess: () => {
      toast.success(t.batchOps.added);
      refresh();
      onClose();
    },
  });
  const clashes = clashesOf(add.error);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!titleOk || !startsAt || !durationOk) return;
    add.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.batchOps.addSessionTitle}</DialogTitle>
          <DialogDescription>{t.batchOps.addSessionBody}</DialogDescription>
        </DialogHeader>
        <form id="add-session" className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-title">{t.batchOps.sessionTitle}</Label>
            <InputGroup>
              <InputGroupInput
                id="as-title"
                value={title}
                maxLength={120}
                placeholder={t.batchOps.sessionTitlePlaceholder}
                aria-invalid={touched && !titleOk}
                onChange={(e) => setTitle(e.target.value)}
              />
            </InputGroup>
          </div>
          <ZonedDateTime date={date} time={time} onDate={setDate} onTime={setTime} timezone={b.timezone} invalid={touched && !startsAt} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-duration">{t.batchOps.duration}</Label>
            <InputGroup>
              <InputGroupInput
                id="as-duration"
                type="number"
                inputMode="numeric"
                dir="ltr"
                min={15}
                max={480}
                step={15}
                value={Number.isFinite(duration) ? duration : ''}
                aria-invalid={touched && !durationOk}
                onChange={(e) => setDuration(e.target.value === '' ? Number.NaN : Number(e.target.value))}
              />
              <InputGroupAddon align="inline-end">{t.batchOps.minutes}</InputGroupAddon>
            </InputGroup>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t.batchOps.notifyStudents}
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
          {add.isError && <ApiProblem clashes={clashes} message={message(add.error)} />}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="add-session" variant="ink" disabled={add.isPending}>
            {add.isPending ? t.batchOps.adding : t.batchOps.addSession}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Date + time inputs read as wall time in the batch's zone, with the zone shown. */
function ZonedDateTime({
  date,
  time,
  onDate,
  onTime,
  timezone,
  invalid,
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  timezone: string;
  invalid?: boolean;
}) {
  const { t, fill } = useI18n();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zd-date">{t.batchOps.date}</Label>
          <InputGroup>
            <InputGroupInput id="zd-date" type="date" dir="ltr" value={date} aria-invalid={invalid && !date} onChange={(e) => onDate(e.target.value)} />
          </InputGroup>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zd-time">{t.batchOps.time}</Label>
          <InputGroup>
            <InputGroupInput id="zd-time" type="time" dir="ltr" value={time} aria-invalid={invalid && !time} onChange={(e) => onTime(e.target.value)} />
            <InputGroupAddon align="inline-end">
              <span className="font-mono text-xs" dir="ltr">
                {gmtOffset(timezone)}
              </span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      <span className="text-[13px] text-muted-foreground">{fill(t.batchOps.zoneNote, { zone: `${timezone} (${gmtOffset(timezone)})` })}</span>
    </div>
  );
}

function ApiProblem({ clashes, message }: { clashes: string[]; message: string }) {
  const { t, fill } = useI18n();
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[14px] border border-danger-line bg-danger-bg p-3 text-sm text-danger-fg">
      <b className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" /> {clashes.length ? t.batchOps.clashTitle : message}
      </b>
      {clashes.length > 0 && (
        <ul className="flex list-disc flex-col gap-0.5 ps-6">
          {clashes.map((c, i) => (
            <li key={`${c}-${i}`}>{fill(t.batchOps.clashWith, { b: c })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Move / cancel ─────────────────────────

/** Move a session (admin: applied now; teacher: a request admins confirm). Date/time in the batch zone. */
export function MoveSessionDialog({ b, session, onClose }: { b: BatchDetail; session: LiveSession | null; onClose: () => void }) {
  if (!session) return null;
  return <MoveDialog key={session.id} b={b} session={session} onClose={onClose} />;
}

function MoveDialog({ b, session, onClose }: { b: BatchDetail; session: LiveSession; onClose: () => void }) {
  const { t, f, fill } = useI18n();
  const refresh = useRefreshBatch(b.id);
  const message = useBatchOpsError();
  const initial = zonedParts(session.startsAt, b.timezone);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const startsAt = date && time ? zonedToUtcIso(date, time, b.timezone) : null;
  const move = useMutation({
    mutationFn: () => sessionsApi.reschedule(session.id, { startsAt: startsAt!, reason: reason.trim() || undefined, notifyStudents: notify }),
    onSuccess: (r) => {
      toast.success(r.requested ? t.batchOps.moveRequested : t.batchOps.moved);
      refresh();
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fill(t.batchOps.moveTitle, { s: `${sessionCode(session.number)} · ${session.title}` })}</DialogTitle>
          <DialogDescription>{fill(t.batchOps.currently, { when: f.dateTime(session.startsAt, b.timezone) })}</DialogDescription>
        </DialogHeader>
        <form
          id="move-session"
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (startsAt) move.mutate();
          }}
        >
          <ZonedDateTime date={date} time={time} onDate={setDate} onTime={setTime} timezone={b.timezone} invalid={!startsAt} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-reason">{t.batchOps.reason}</Label>
            <InputGroup>
              <InputGroupTextarea id="mv-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </InputGroup>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t.batchOps.notifyStudents}
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
          {move.isError && <ApiProblem clashes={clashesOf(move.error)} message={message(move.error)} />}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="move-session" variant="ink" disabled={move.isPending || !startsAt}>
            {t.batchOps.move}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ADMIN: cancel one session, with a reason students see. */
export function CancelSessionDialog({ b, session, onClose }: { b: BatchDetail; session: LiveSession | null; onClose: () => void }) {
  if (!session) return null;
  return <CancelDialog key={session.id} b={b} session={session} onClose={onClose} />;
}

function CancelDialog({ b, session, onClose }: { b: BatchDetail; session: LiveSession; onClose: () => void }) {
  const { t, f, fill } = useI18n();
  const refresh = useRefreshBatch(b.id);
  const message = useBatchOpsError();
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const cancel = useMutation({
    mutationFn: () => sessionsApi.cancel(session.id, { reason: reason.trim() || undefined, notifyStudents: notify }),
    onSuccess: () => {
      toast.success(t.batchOps.cancelled);
      refresh();
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fill(t.batchOps.cancelTitle, { s: `${sessionCode(session.number)} · ${session.title}` })}</DialogTitle>
          <DialogDescription>
            {f.dateTime(session.startsAt, b.timezone)} · {t.batchOps.cancelBody}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cx-reason">{t.batchOps.reason}</Label>
          <InputGroup>
            <InputGroupTextarea id="cx-reason" rows={2} maxLength={500} placeholder={t.batchOps.cancelReasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} />
          </InputGroup>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          {t.batchOps.notifyStudents}
          <Switch checked={notify} onCheckedChange={setNotify} />
        </label>
        {cancel.isError && <ApiProblem clashes={[]} message={message(cancel.error)} />}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.batchOps.keepSession}
          </Button>
          <Button type="button" variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {t.batchOps.confirmCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Row actions for an upcoming session: Move for everyone who can manage the batch, Cancel for admins. */
export function SessionRowActions({ session, admin, onMove, onCancel }: { session: LiveSession; admin: boolean; onMove: (s: LiveSession) => void; onCancel: (s: LiveSession) => void }) {
  const { t } = useI18n();
  if (!isUpcoming(session)) return null;
  return (
    <span className="flex items-center gap-1.5">
      <Button type="button" size="xs" variant="outline" onClick={() => onMove(session)}>
        {t.batchOps.move}
      </Button>
      {admin && (
        <Button type="button" size="xs" variant="ghost" className="text-danger-fg" onClick={() => onCancel(session)}>
          {t.batchOps.cancel}
        </Button>
      )}
    </span>
  );
}

// ───────────────────────── Seats ─────────────────────────

/** Inline "Edit seats": a −/+ stepper that PATCHes capacity; CAPACITY_TOO_LOW comes back translated. */
export function SeatsEditor({ b, canEdit }: { b: BatchDetail; canEdit: boolean }) {
  const { t, f, fill } = useI18n();
  const refresh = useRefreshBatch(b.id);
  const message = useBatchOpsError();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number>(b.capacity);
  const save = useMutation({
    mutationFn: () => batchesApi.update(b.id, { capacity: value }),
    onSuccess: () => {
      toast.success(t.batchOps.seatsSaved);
      refresh();
      setEditing(false);
    },
  });
  const valid = Number.isInteger(value) && value >= 1 && value <= 500;
  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">
          <b>{t.batchOps.seats}</b> · {fill(t.batchOps.seatsSummary, { taken: f.number(b.seatsTaken), capacity: f.number(b.capacity) })}
        </span>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setValue(b.capacity);
              save.reset();
              setEditing(true);
            }}
          >
            {t.batchOps.editSeats}
          </Button>
        )}
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      <Label htmlFor="seats-edit" className="text-[13px] text-muted-foreground">
        {t.batchOps.seats}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <NumberStepper
          id="seats-edit"
          className="w-44"
          value={value}
          onChange={setValue}
          min={1}
          max={500}
          invalid={!valid || save.isError}
          aria-describedby={save.isError ? 'seats-error' : undefined}
          decLabel={t.batchOps.fewerSeats}
          incLabel={t.batchOps.moreSeats}
        />
        <Button type="submit" size="sm" variant="ink" disabled={!valid || save.isPending}>
          {t.batchOps.saveSeats}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t.common.cancel}
        </Button>
      </div>
      {save.isError && (
        <span id="seats-error" role="alert" className="text-[13px] text-destructive">
          {message(save.error, b.seatsTaken)}
        </span>
      )}
    </form>
  );
}
