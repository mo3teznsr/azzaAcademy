'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shiftScheduleInput, type BatchStatus } from '@azza/shared';
import type { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BatchStatusChip, EnrollmentStatusChip, SessionStatusChip } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { PageTitle, Panel, StatTile } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { batchesApi, type BatchDetail, type LiveSession } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { describeRule, minutesUntil, sessionState } from '@/lib/schedule';
import { ProposalNotice, ReviewActions, ReviewNoteQuote, useProposalError } from './proposal-review';
import { AddSessionButton, CancelSessionDialog, MoveSessionDialog, SeatsEditor, SessionRowActions } from './batch-sessions';
import { useMoney } from '@/lib/money';
import { BatchQuizzes } from '../quizzes/batch-quizzes';

export function AdminBatchDetail({ batchId }: { batchId: string }) {
  const q = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });
  if (q.isPending) return <LoadingBlock rows={4} height={100} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Detail b={q.data} />;
}

const NEXT_STATUS: Partial<Record<BatchStatus, BatchStatus[]>> = {
  DRAFT: ['ENROLLING', 'CANCELLED'],
  ENROLLING: ['RUNNING', 'FULL', 'CANCELLED'],
  FULL: ['ENROLLING', 'RUNNING'],
  RUNNING: ['COMPLETED'],
};

function Detail({ b }: { b: BatchDetail }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const [shiftOpen, setShiftOpen] = useState(false);
  const [moving, setMoving] = useState<LiveSession | null>(null);
  const [cancelling, setCancelling] = useState<LiveSession | null>(null);
  const enr = useQuery({ queryKey: qk.batchEnrollments(b.id), queryFn: () => batchesApi.enrollments(b.id), retry: false });
  const invalidate = () => void qc.invalidateQueries({ queryKey: qk.batch(b.id) });
  const errorMessage = useProposalError();
  const setStatus = useMutation({
    mutationFn: (status: BatchStatus) => batchesApi.update(b.id, { status }),
    onSuccess: () => (toast.success(t.common.saved), invalidate()),
    onError: (e: Error) => toast.error(errorMessage(e)),
  });
  const review = useMutation({
    mutationFn: (input: { approve: boolean; note?: string }) => batchesApi.review(b.id, input),
    onSuccess: (_, v) => {
      toast.success(v.approve ? t.proposals.approvedBatch : t.proposals.sentBack);
      invalidate();
      void qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pendingReview = b.status === 'PENDING_REVIEW';
  const live = b.sessions.find((s) => s.status === 'LIVE');
  const delivered = b.sessions.filter((s) => s.status === 'ENDED').length;
  const label: Partial<Record<BatchStatus, string>> = {
    ENROLLING: t.admin.batchDetail.openEnrollment,
    FULL: t.admin.batchDetail.closeEnrollment,
    RUNNING: t.admin.batchDetail.markRunning,
    COMPLETED: t.admin.batchDetail.complete,
    CANCELLED: t.admin.batchDetail.cancelBatch,
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/admin/batches" className="hover:text-foreground">
          {t.admin.batches.title}
        </Link>{' '}
        /{' '}
        <Link href={`/admin/courses/${b.courseId}`} className="hover:text-foreground">
          {b.course.titleEn}
        </Link>{' '}
        / <span className="text-foreground">{b.code}</span>
      </nav>
      <PageTitle
        kicker={
          <span className="flex items-center gap-2">
            <BatchStatusChip status={b.status} />
            {live && <SessionStatusChip state="LIVE" />}
          </span>
        }
        title={
          <>
            <span dir="ltr">{b.code}</span> <span className="font-light">{b.course.titleEn}</span>
          </>
        }
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShiftOpen(true)}>
              {t.admin.batchDetail.shift}
            </Button>
            {pendingReview && <ReviewActions pending={review.isPending} onApprove={() => review.mutate({ approve: true })} onSendBack={(note) => review.mutateAsync({ approve: false, note })} />}
            {(NEXT_STATUS[b.status] ?? []).map((s) => (
              <Button key={s} variant={s === 'CANCELLED' ? 'destructive' : 'ink'} disabled={setStatus.isPending} onClick={() => setStatus.mutate(s)}>
                {label[s]}
              </Button>
            ))}
          </div>
        }
      />
      <p className="text-muted-foreground">
        {t.admin.batchDetail.teacher}: <bdi className="font-semibold text-foreground">{b.teacher.name}</bdi> · {money.aed(b.priceFils)} · {describeRule(b, f)} {gmtOffset(b.timezone)} · {f.dayMonth(b.startsOn)} → {f.dayMonth(b.endsOn)} · {t.status.sessionLanguage[b.language]}
      </p>
      {pendingReview && (
        <ProposalNotice tone="pending" title={t.proposals.reviewBanner}>
          <span className="text-[13px]">
            {fill(t.proposals.proposedBy, { name: b.teacher.name })}
            {b.submittedAt && ` · ${fill(t.proposals.submittedOn, { d: f.dayMonth(b.submittedAt) })}`}
          </span>
        </ProposalNotice>
      )}
      {b.status === 'DRAFT' && b.reviewNote && (
        <ProposalNotice tone="sentBack" title={t.proposals.sentBackTitle}>
          <ReviewNoteQuote note={b.reviewNote} />
        </ProposalNotice>
      )}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatTile label={t.admin.batches.colSeats} value={fill(t.admin.batchDetail.seatsSummary, { a: f.number(b.seatsTaken), b: f.number(b.capacity) })} />
        <StatTile label={t.studio.batch.progress} value={`${f.number(delivered)}/${f.number(b.sessions.length)}`} />
        <StatTile label={t.common.seatsLeft.replace('{n}', '').trim()} value={f.number(b.seatsLeft)} />
      </section>
      <SeatsEditor b={b} canEdit={b.status !== 'COMPLETED' && b.status !== 'CANCELLED'} />
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">{t.admin.batchDetail.sessions}</TabsTrigger>
          <TabsTrigger value="enrollments">{t.admin.batchDetail.enrollments}</TabsTrigger>
          <TabsTrigger value="quizzes">{t.learning.studio.tab}</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="mt-4 flex flex-col gap-3">
          <div className="flex justify-end">
            <AddSessionButton b={b} />
          </div>
          <Panel className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.batchDetail.colSlate}</TableHead>
                  <TableHead>{t.admin.batchDetail.colTopic}</TableHead>
                  <TableHead>{t.admin.batchDetail.colDate}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.admin.batchDetail.colRecording}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.sessions.map((s) => {
                  const st = sessionState(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {sessionCode(s.number)}
                      </TableCell>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>
                        {f.date(s.startsAt, b.timezone)} · <span className="timecode">{f.time(s.startsAt, b.timezone)}</span>
                      </TableCell>
                      <TableCell>
                        <SessionStatusChip state={st} minutes={minutesUntil(s.startsAt)} />
                      </TableCell>
                      <TableCell>
                        {s.recordingUrl ? (
                          <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="link-sun text-sm">
                            {t.library.watch}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className="inline-flex justify-end">
                          <SessionRowActions session={s} admin onMove={setMoving} onCancel={setCancelling} />
                        </span>
                        {st === 'LIVE' && (
                          <Button asChild size="xs" variant="onair">
                            <Link href={`/studio/live/${s.id}`}>{t.admin.live.joinSilently}</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="enrollments" className="mt-4">
          <Panel className="p-2">
            <QueryView query={enr} loading={<LoadingBlock rows={4} height={48} />} empty={<EmptyState title={t.admin.batchDetail.noEnrollments} />}>
              {(list) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.studio.batch.student}</TableHead>
                      <TableHead>{t.admin.batchDetail.enrolledOn}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <InitialsAvatar name={e.user.name} size={28} />
                            <span>
                              <bdi className="block font-medium">{e.user.name}</bdi>
                              <span className="text-xs text-muted-foreground" dir="ltr">
                                {e.user.email}
                              </span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>{f.dayMonth(e.createdAt)}</TableCell>
                        <TableCell>
                          <EnrollmentStatusChip status={e.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </QueryView>
          </Panel>
        </TabsContent>
        <TabsContent value="quizzes" className="mt-4">
          <Panel>
            <BatchQuizzes batchId={b.id} courseId={b.courseId} />
          </Panel>
        </TabsContent>
      </Tabs>
      <ShiftDialog b={b} open={shiftOpen} onOpenChange={setShiftOpen} onDone={invalidate} />
      <MoveSessionDialog b={b} session={moving} onClose={() => setMoving(null)} />
      <CancelSessionDialog b={b} session={cancelling} onClose={() => setCancelling(null)} />
    </>
  );
}

function ShiftDialog({ b, open, onOpenChange, onDone }: { b: BatchDetail; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { t } = useI18n();
  const firstUpcoming = b.sessions.find((s) => s.status === 'SCHEDULED')?.number ?? 1;
  const form = useForm<z.input<typeof shiftScheduleInput>>({ resolver: zodResolver(shiftScheduleInput), defaultValues: { fromSessionNumber: firstUpcoming, days: 7 } });
  const m = useMutation({
    mutationFn: (v: z.output<typeof shiftScheduleInput>) => batchesApi.shift(b.id, v),
    onSuccess: () => {
      toast.success(t.common.saved);
      onDone();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.admin.batchDetail.shiftTitle}</DialogTitle>
        </DialogHeader>
        <form id="shift-form" className="grid grid-cols-2 gap-4" onSubmit={form.handleSubmit((v) => m.mutate(v))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">{t.admin.batchDetail.fromSession}</Label>
            <Input id="from" type="number" min={1} {...form.register('fromSessionNumber', { valueAsNumber: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="days">{t.admin.batchDetail.days}</Label>
            <Input id="days" type="number" min={-60} max={60} {...form.register('days', { valueAsNumber: true })} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="shift-form" variant="ink" disabled={m.isPending}>
            {t.admin.batchDetail.applyShift}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
