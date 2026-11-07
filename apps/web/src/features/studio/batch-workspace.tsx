'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assignmentInput, materialInput } from '@azza/shared';
import type { z } from 'zod';
import { ChevronRight, ExternalLink, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchStatusChip, SessionStatusChip } from '@/components/brand/status-chip';
import { SessionSlate } from '@/components/brand/session-slate';
import { Panel, StatTile } from '@/components/brand/section';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { EmptyState, ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { batchesApi, type BatchDetail } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { describeRule, minutesUntil, sessionState } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { ProposalNotice, ReviewNoteQuote, useProposalError } from '../admin/proposal-review';
import { BatchQuizzes } from '../quizzes/batch-quizzes';
import { AnnouncementsPanel } from '../comms/announcements';
import { BatchPrivateChats, ClassChat } from '../comms/chat';
import { AddSessionButton, MoveSessionDialog, SeatsEditor, SessionRowActions } from '../admin/batch-sessions';
import type { LiveSession } from '@/lib/api';

export function BatchWorkspace({ batchId, basePath = '/studio', initialTab }: { batchId: string; basePath?: string; initialTab?: string }) {
  const q = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });
  if (q.isPending) return <LoadingBlock rows={3} height={140} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Workspace b={q.data} basePath={basePath} initialTab={initialTab} />;
}

/** DRAFT: the admin's note (if sent back) + Submit for review. PENDING_REVIEW: a waiting notice. */
function ProposalStatus({ b }: { b: BatchDetail }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const errorMessage = useProposalError();
  const submit = useMutation({
    mutationFn: () => batchesApi.submit(b.id),
    onSuccess: () => {
      toast.success(t.proposals.submitted);
      void qc.invalidateQueries({ queryKey: qk.batch(b.id) });
      void qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (b.status === 'PENDING_REVIEW') {
    return (
      <ProposalNotice tone="pending" title={t.proposals.pendingTitle}>
        <p className="text-[15px]">{t.proposals.pendingBatch}</p>
        {b.submittedAt && <span className="text-[13px]">{fill(t.proposals.submittedOn, { d: f.dayMonth(b.submittedAt) })}</span>}
      </ProposalNotice>
    );
  }
  const action = (
    <Button type="button" variant="ink" disabled={submit.isPending} onClick={() => submit.mutate()}>
      {submit.isPending ? t.proposals.submitting : t.proposals.submit}
    </Button>
  );
  return b.reviewNote ? (
    <ProposalNotice tone="sentBack" title={t.proposals.sentBackTitle} action={action}>
      <ReviewNoteQuote note={b.reviewNote} />
      <span className="text-[13px]">{t.proposals.sentBackHint}</span>
    </ProposalNotice>
  ) : (
    <ProposalNotice tone="neutral" title={t.proposals.draftBatch} action={action} />
  );
}

const TABS = ['schedule', 'roster', 'materials', 'assignments', 'quizzes', 'announcements', 'chat'];

function Workspace({ b, basePath, initialTab }: { b: BatchDetail; basePath: string; initialTab?: string }) {
  const { t, f, fill, pick } = useI18n();
  const roster = useQuery({ queryKey: qk.roster(b.id), queryFn: () => batchesApi.roster(b.id), retry: false });
  const delivered = b.sessions.filter((s) => s.status === 'ENDED').length;
  const next = b.sessions.find((s) => s.status === 'LIVE' || s.status === 'SCHEDULED');
  const avg = roster.data?.averageAttendancePercent ?? null;
  const atRisk = roster.data && roster.data.endedSessions ? roster.data.items.filter((r) => (r.attendancePercent ?? 100) < 60).length : null;
  // Proposals aren't open to students yet, so there's no lobby to open.
  const proposal = b.status === 'DRAFT' || b.status === 'PENDING_REVIEW';
  const [moving, setMoving] = useState<LiveSession | null>(null);

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={basePath} className="hover:text-foreground">
          {t.studio.myBatches}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">
          {pick(b.course.titleEn, b.course.titleAr).text} · {b.code}
        </span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <b className="font-display text-7xl font-extrabold leading-none" dir="ltr">
              {b.code}
            </b>
            <BatchStatusChip status={b.status} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{pick(b.course.titleEn, b.course.titleAr).text}</h1>
          <p className="mt-1 text-muted-foreground">
            {describeRule(b, f)} · {gmtOffset(b.timezone)} · {f.dayMonth(b.startsOn)} → {f.dayMonth(b.endsOn)} · {f.number(b.seatsTaken)}/{f.number(b.capacity)} · {t.status.sessionLanguage[b.language]}
          </p>
        </div>
        {next && !proposal && (
          <Button asChild variant="sun" size="lg">
            <Link href={`/studio/live/${next.id}`}>
              <Radio /> {fill(t.studio.batch.openLobby, { s: sessionCode(next.number) })}
            </Link>
          </Button>
        )}
      </header>
      {proposal && <ProposalStatus b={b} />}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatTile label={t.studio.batch.progress} value={<>{f.number(delivered)}<span className="text-xl text-muted-foreground">/{f.number(b.sessions.length)}</span></>} />
        <StatTile label={t.studio.batch.avgAttendance} value={avg === null ? '—' : f.percent(avg)} />
        <StatTile label={t.studio.batch.atRisk} value={atRisk === null ? '—' : f.number(atRisk)} />
        <StatTile label={t.studio.seats} value={`${f.number(b.seatsTaken)}/${f.number(b.capacity)}`} />
      </section>
      <Tabs defaultValue={initialTab && TABS.includes(initialTab) && !(proposal && (initialTab === 'announcements' || initialTab === 'chat')) ? initialTab : 'schedule'}>
        <TabsList>
          <TabsTrigger value="schedule">{t.studio.batch.tabSchedule}</TabsTrigger>
          <TabsTrigger value="roster">
            {t.studio.batch.tabRoster} · {f.number(roster.data?.items.length ?? b.seatsTaken)}
          </TabsTrigger>
          <TabsTrigger value="materials">{t.studio.batch.tabMaterials}</TabsTrigger>
          <TabsTrigger value="assignments">{t.studio.batch.tabAssignments}</TabsTrigger>
          <TabsTrigger value="quizzes">{t.learning.studio.tab}</TabsTrigger>
          {!proposal && <TabsTrigger value="announcements">{t.comms.announcements.title}</TabsTrigger>}
          {!proposal && <TabsTrigger value="chat">{t.comms.chat.classChat}</TabsTrigger>}
        </TabsList>
        <TabsContent value="schedule" className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold">{fill(t.studio.batch.seasonTitle, { n: f.number(b.sessions.length) })}</h2>
            <span className="text-sm text-muted-foreground">{t.studio.batch.rulesNote}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-card p-4">
            {/* Approved batches' seats belong to the admins (the API answers BATCH_LOCKED). */}
            <SeatsEditor b={b} canEdit={proposal} />
            <AddSessionButton b={b} />
          </div>
          <ol className="flex flex-col gap-2">
            {b.sessions.map((s) => {
              const st = sessionState(s);
              return (
                <li key={s.id}>
                  <SessionSlate
                    code={sessionCode(s.number)}
                    day={f.weekday(s.startsAt)}
                    title={s.title}
                    state={st}
                    sub={`${f.dayMonth(s.startsAt)} · ${f.time(s.startsAt)}–${f.time(s.endsAt)}`}
                    trailing={
                      <span className="flex items-center gap-3">
                        <SessionRowActions session={s} admin={false} onMove={setMoving} onCancel={() => undefined} />
                        <SessionStatusChip state={st} minutes={minutesUntil(s.startsAt)} />
                        <Link href={st === 'ENDED' ? `/studio/sessions/${s.id}/report` : `/studio/sessions/${s.id}`} className={cn('text-sm font-semibold', st === 'LIVE' ? 'text-ink underline' : 'link-sun')}>
                          {st === 'ENDED' ? t.studio.report : t.studio.batch.prep}
                        </Link>
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ol>
          <MoveSessionDialog b={b} session={moving} onClose={() => setMoving(null)} />
        </TabsContent>
        <TabsContent value="roster" className="mt-4">
          <QueryView query={roster} isEmpty={(r) => r.items.length === 0} loading={<LoadingBlock rows={4} height={48} />} empty={<EmptyState title={t.studio.batch.rosterEmpty} />}>
            {({ items: list }) => (
              <Panel className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.studio.batch.student}</TableHead>
                    {b.sessions.slice(0, 12).map((s) => (
                      <TableHead key={s.id} className="text-center font-mono text-[11px]" dir="ltr">
                        {sessionCode(s.number)}
                      </TableHead>
                    ))}
                    <TableHead className="text-end">{t.studio.batch.rate}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.user.id}>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <InitialsAvatar name={r.user.name} size={28} />
                          <bdi>{r.user.name}</bdi>
                        </span>
                      </TableCell>
                      {b.sessions.slice(0, 12).map((s) => {
                        const a = s.status !== 'ENDED' ? 'UPCOMING' : r.attendedSessionIds.includes(s.id) ? 'PRESENT' : 'ABSENT';
                        return (
                          <TableCell key={s.id} className="text-center">
                            <span
                              className={cn('inline-block size-3 rounded-sm', a === 'PRESENT' && 'bg-green', a === 'ABSENT' && 'bg-onair', a === 'UPCOMING' && 'border border-line-strong')}
                              title={a}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className={cn('text-end font-semibold', (r.attendancePercent ?? 100) < 60 && 'text-peach-fg')}>{r.attendancePercent === null ? '—' : f.percent(r.attendancePercent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </Panel>
            )}
          </QueryView>
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <Panel>
            <Materials b={b} />
          </Panel>
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <Panel>
            <Assignments b={b} />
          </Panel>
        </TabsContent>
        <TabsContent value="quizzes" className="mt-4">
          <Panel>
            <BatchQuizzes batchId={b.id} courseId={b.course.id} />
          </Panel>
        </TabsContent>
        {!proposal && (
          <TabsContent value="announcements" className="mt-4 max-w-3xl">
            <AnnouncementsPanel batchId={b.id} canPost={b.status !== 'CANCELLED'} />
          </TabsContent>
        )}
        {!proposal && (
          <TabsContent value="chat" className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ClassChat batchId={b.id} />
            <BatchPrivateChats batchId={b.id} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

type MaterialValues = z.input<typeof materialInput>;

export function Materials({ b, sessionId }: { b: BatchDetail; sessionId?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.materials(b.id), queryFn: () => batchesApi.materials(b.id) });
  const [open, setOpen] = useState(false);
  const form = useForm<MaterialValues>({ resolver: zodResolver(materialInput), defaultValues: { batchId: b.id, sessionId, title: '', url: '', kind: 'SLIDES' } });
  const add = useMutation({
    mutationFn: (v: MaterialValues) => batchesApi.addMaterial(b.id, { ...v, sessionId: v.sessionId || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.materials(b.id) });
      toast.success(t.common.saved);
      form.reset({ batchId: b.id, sessionId, title: '', url: '', kind: 'SLIDES' });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const list = (q.data ?? []).filter((m) => !sessionId || m.sessionId === sessionId);
  return (
    <div className="flex flex-col gap-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="self-start">{t.studio.batch.upload}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.studio.batch.upload}</DialogTitle>
          </DialogHeader>
          <form id="mat-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => add.mutate(v))} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-title">{t.studio.batch.materialTitle}</Label>
              <Input id="m-title" {...form.register('title')} aria-invalid={!!form.formState.errors.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="m-url">{t.studio.batch.materialUrl}</Label>
              <Input id="m-url" type="url" dir="ltr" placeholder="https://" {...form.register('url')} aria-invalid={!!form.formState.errors.url} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t.studio.batch.kind}</Label>
                <Controller
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['SLIDES', 'FILE', 'LINK', 'VIDEO'] as const).map((k) => (
                          <SelectItem key={k} value={k}>
                            {t.status.material[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t.studio.batch.attachTo}</Label>
                <Controller
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <Select value={field.value ?? 'all'} onValueChange={(v) => field.onChange(v === 'all' ? undefined : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.studio.batch.wholeBatch}</SelectItem>
                        {b.sessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {sessionCode(s.number)} · {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="mat-form" disabled={add.isPending}>
              {add.isPending ? t.common.saving : t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {q.isPending ? (
        <LoadingBlock rows={3} height={48} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.library.materialsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3.5">
              <span className="label-mono w-16 shrink-0 text-muted-foreground">{t.status.material[m.kind]}</span>
              <b className="min-w-0 flex-1 truncate">{m.title}</b>
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                {m.sessionId ? sessionCode(b.sessions.find((s) => s.id === m.sessionId)?.number ?? 0) : b.code}
              </span>
              <a href={m.url} target="_blank" rel="noreferrer" className="link-sun" aria-label={t.common.open}>
                <ExternalLink className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type AssignmentValues = z.input<typeof assignmentInput>;

function Assignments({ b }: { b: BatchDetail }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.assignments(b.id), queryFn: () => batchesApi.assignments(b.id) });
  const [open, setOpen] = useState(false);
  const form = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentInput),
    defaultValues: { batchId: b.id, title: '', description: '', dueAt: '', maxScore: 100 },
  });
  const add = useMutation({
    mutationFn: (v: AssignmentValues) =>
      batchesApi.addAssignment(b.id, { sessionId: v.sessionId || undefined, title: v.title, description: v.description ?? '', dueAt: v.dueAt, maxScore: v.maxScore ?? 100 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.assignments(b.id) });
      setOpen(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex flex-col gap-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="self-start">{t.studio.batch.newAssignment}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.studio.batch.newAssignment}</DialogTitle>
          </DialogHeader>
          <form id="asg-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => add.mutate(v))} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-title">{t.studio.batch.materialTitle}</Label>
              <Input id="a-title" {...form.register('title')} aria-invalid={!!form.formState.errors.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-desc">{t.studio.batch.description}</Label>
              <Textarea id="a-desc" rows={3} {...form.register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="a-due">{t.studio.batch.dueAt}</Label>
                <Input
                  id="a-due"
                  type="datetime-local"
                  {...form.register('dueAt', { setValueAs: (v: string) => (v ? new Date(v).toISOString() : '') })}
                  aria-invalid={!!form.formState.errors.dueAt}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="a-max">{t.studio.batch.maxScore}</Label>
                <Input id="a-max" type="number" min={1} {...form.register('maxScore', { valueAsNumber: true })} />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="asg-form" disabled={add.isPending}>
              {t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QueryView query={q} loading={<LoadingBlock rows={2} />} empty={<p className="text-sm text-muted-foreground">{t.assignments.empty}</p>}>
        {(list) => (
          <ul className="flex flex-col gap-2">
            {list.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-4">
                <div>
                  <b className="block">{a.title}</b>
                  <span className="text-sm text-muted-foreground">{fill(t.assignments.due, { d: f.dateTime(a.dueAt) })}</span>
                </div>
                <span className="label-mono text-muted-foreground">{fill(t.studio.batch.submissions, { n: f.number(a.submissionCount ?? 0) })}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </div>
  );
}
