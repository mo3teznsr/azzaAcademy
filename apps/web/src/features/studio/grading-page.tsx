'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi, contentApi, type Assignment, type BatchSummary, type Submission } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'ungraded' | 'graded' | 'late';

interface QueueItem {
  submission: Submission;
  assignment: Assignment;
  batch: BatchSummary;
  late: boolean;
}

const isLate = (s: Submission, a: Assignment) => s.late ?? new Date(s.submittedAt) > new Date(a.dueAt);

/**
 * Submissions across the teacher's batches. There is no cross-batch list endpoint, so the queue is composed from
 * GET /batches?teacherId → GET /batches/:id/assignments → GET /assignments/:id/submissions.
 */
function useGradingQueue() {
  const { user } = useAuth();
  const p = { teacherId: user?.role === 'TEACHER' ? user.id : undefined, pageSize: 100 };
  const batches = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p), enabled: !!user });
  const list = useMemo(() => (batches.data?.items ?? []).filter((b) => b.status !== 'DRAFT' && b.status !== 'CANCELLED'), [batches.data]);
  const assignmentQs = useQueries({ queries: list.map((b) => ({ queryKey: qk.assignments(b.id), queryFn: () => batchesApi.assignments(b.id) })) });
  const assignments = useMemo(() => {
    const out: Array<{ assignment: Assignment; batch: BatchSummary }> = [];
    assignmentQs.forEach((q, i) => q.data?.forEach((a) => out.push({ assignment: a, batch: list[i]! })));
    return out;
  }, [assignmentQs, list]);
  const submissionQs = useQueries({
    queries: assignments.map(({ assignment }) => ({ queryKey: qk.submissions(assignment.id), queryFn: () => batchesApi.submissions(assignment.id) })),
  });
  const items = useMemo(() => {
    const out: QueueItem[] = [];
    submissionQs.forEach((q, i) => {
      const ctx = assignments[i];
      if (ctx) q.data?.forEach((s) => out.push({ submission: s, ...ctx, late: isLate(s, ctx.assignment) }));
    });
    // Ungraded first (oldest submission first), then graded (newest grade first).
    return out.sort((a, b) => {
      const ga = a.submission.gradedAt ? 1 : 0;
      const gb = b.submission.gradedAt ? 1 : 0;
      if (ga !== gb) return ga - gb;
      return ga ? (b.submission.gradedAt ?? '').localeCompare(a.submission.gradedAt ?? '') : a.submission.submittedAt.localeCompare(b.submission.submittedAt);
    });
  }, [submissionQs, assignments]);
  const all = [batches, ...assignmentQs, ...submissionQs];
  return {
    items,
    assignments,
    isPending: !user || batches.isPending || assignmentQs.some((q) => q.isPending) || submissionQs.some((q) => q.isPending),
    error: all.find((q) => q.error)?.error ?? null,
    refetch: () => void Promise.all(all.map((q) => q.refetch())),
  };
}

export function GradingPage() {
  const { t, f, fill } = useI18n();
  const queue = useGradingQueue();
  const [assignmentId, setAssignmentId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('ungraded');
  /** `undefined` = automatic (first in the queue on wide screens), `null` = nothing selected. */
  const [picked, setSelectedId] = useState<string | null | undefined>(undefined);
  const wide = useWide();
  const [announce, setAnnounce] = useState('');

  const visible = useMemo(
    () =>
      queue.items.filter(
        (i) =>
          (assignmentId === 'all' || i.assignment.id === assignmentId) &&
          (status === 'all' || (status === 'ungraded' && !i.submission.gradedAt) || (status === 'graded' && !!i.submission.gradedAt) || (status === 'late' && i.late)),
      ),
    [queue.items, assignmentId, status],
  );
  const selectedId = picked === undefined ? (wide ? (visible[0]?.submission.id ?? null) : null) : picked;
  const selected = visible.find((i) => i.submission.id === selectedId) ?? queue.items.find((i) => i.submission.id === selectedId) ?? null;
  const toGrade = queue.items.filter((i) => !i.submission.gradedAt).length;

  const advance = (fromId: string) => {
    const idx = visible.findIndex((i) => i.submission.id === fromId);
    const rest = [...visible.slice(idx + 1), ...visible.slice(0, Math.max(0, idx))].filter((i) => i.submission.id !== fromId);
    const next = rest.find((i) => !i.submission.gradedAt) ?? null;
    setSelectedId(next?.submission.id ?? null);
    if (!next) setAnnounce(t.grading.allDone);
    if (next) requestAnimationFrame(() => document.getElementById('grade-score')?.focus());
  };

  return (
    <>
      <PageTitle kicker={t.grading.kicker} title={t.grading.title} aside={!queue.isPending && <span className="label-mono text-muted-foreground">{f.plural(toGrade, t.grading.inQueue)}</span>} />
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      {queue.isPending ? (
        <LoadingBlock rows={4} height={72} />
      ) : queue.error ? (
        <ErrorState error={queue.error} onRetry={queue.refetch} />
      ) : queue.items.length === 0 ? (
        <EmptyState title={t.grading.emptyTitle} body={t.grading.emptyBody} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grade-assignment">{t.grading.assignment}</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger id="grade-assignment" className="h-11 min-w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.grading.allAssignments}</SelectItem>
                  {queue.assignments.map(({ assignment: a, batch: b }) => (
                    <SelectItem key={a.id} value={a.id}>
                      {b.code} · {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span id="grade-status" className="text-sm font-medium">
                {t.grading.status}
              </span>
              <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)} aria-labelledby="grade-status" className="flex flex-wrap justify-start gap-2">
                {(['ungraded', 'late', 'graded', 'all'] as const).map((k) => (
                  <ToggleGroupItem key={k} value={k} className="h-11 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    {t.grading.filters[k]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,420px)_1fr]">
            <Panel aria-labelledby="queue-title" className="gap-3 p-4">
              <h2 id="queue-title" className="label-mono px-2 text-muted-foreground">
                {t.grading.queue} · {f.number(visible.length)}
              </h2>
              {visible.length === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">{status === 'ungraded' ? t.grading.allDone : t.grading.noMatch}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {visible.map((i) => {
                    const s = i.submission;
                    const active = s.id === selectedId;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-current={active || undefined}
                          onClick={() => setSelectedId(s.id)}
                          className={cn(
                            'press flex w-full items-center gap-3 rounded-[14px] p-3 text-start',
                            active ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                          )}
                        >
                          <InitialsAvatar name={s.user?.name ?? '?'} src={s.user?.image} size={36} />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[15px]">
                              <bdi>{s.user?.name ?? '—'}</bdi>
                            </b>
                            <span className={cn('block truncate text-[13px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              <bdi dir="ltr">{i.batch.code}</bdi> · {i.assignment.title}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            {s.gradedAt ? (
                              <Chip tone="sage">{fill(t.grading.graded, { s: f.number(s.score ?? 0), m: f.number(i.assignment.maxScore) })}</Chip>
                            ) : i.late ? (
                              <Chip tone="dashedPeach">{t.grading.late}</Chip>
                            ) : null}
                            <span className={cn('text-[12px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{f.dayMonth(s.submittedAt)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            {selected ? (
              <ReviewPane key={selected.submission.id} item={selected} onReturned={() => advance(selected.submission.id)} />
            ) : (
              <Panel className="hidden min-h-64 items-center justify-center text-center text-muted-foreground lg:flex">{t.grading.selectOne}</Panel>
            )}
          </div>
        </>
      )}
    </>
  );
}

const WIDE = '(min-width: 1024px)';
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

interface GradeValues {
  score: number;
  feedback: string;
}

function ReviewPane({ item, onReturned }: { item: QueueItem; onReturned: () => void }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const { submission: s, assignment: a } = item;
  const max = a.maxScore;
  const form = useForm<GradeValues>({ defaultValues: { score: s.score ?? (undefined as unknown as number), feedback: s.feedback ?? '' } });
  const grade = useMutation({
    mutationFn: (v: GradeValues) => contentApi.grade(s.id, { score: v.score, feedback: v.feedback.trim() || undefined }),
    onSuccess: (graded, v) => {
      qc.setQueryData<Submission[]>(qk.submissions(a.id), (prev) => prev?.map((x) => (x.id === s.id ? { ...x, ...graded, user: x.user } : x)));
      void qc.invalidateQueries({ queryKey: qk.submissions(a.id) });
      toast.success(fill(t.grading.returned, { name: s.user?.name ?? '', s: f.number(v.score), m: f.number(max) }));
      onReturned();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors.score;
  return (
    <Panel aria-labelledby="review-title" className="gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InitialsAvatar name={s.user?.name ?? '?'} src={s.user?.image} size={48} />
          <div className="min-w-0">
            <h2 id="review-title" className="font-display text-2xl leading-tight font-extrabold">
              <bdi>{s.user?.name ?? '—'}</bdi>
            </h2>
            <span className="text-sm text-muted-foreground">
              <bdi dir="ltr">{item.batch.code}</bdi> · {a.title}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.late && <Chip tone="dashedPeach">{t.grading.late}</Chip>}
          <span className="label-mono text-muted-foreground">{fill(t.grading.submitted, { d: f.dateTime(s.submittedAt) })}</span>
        </div>
      </header>
      <span className="text-[13px] text-muted-foreground">{fill(t.grading.due, { d: f.dateTime(a.dueAt) })}</span>
      <section aria-labelledby="sub-title" className="flex flex-col gap-3 rounded-[16px] bg-card p-4">
        <h3 id="sub-title" className="label-mono text-muted-foreground">
          {t.grading.submission}
        </h3>
        {s.url && (
          <a href={s.url} target="_blank" rel="noreferrer" className="link-sun inline-flex min-h-11 items-center gap-2 break-all" dir="ltr">
            <ExternalLink className="size-4 shrink-0" aria-hidden /> {s.url}
            <span className="sr-only">({t.grading.openLink})</span>
          </a>
        )}
        {s.text && <p className="whitespace-pre-line">{s.text}</p>}
        {!s.url && !s.text && <p className="text-sm text-muted-foreground">{t.grading.noContent}</p>}
      </section>
      <form className="flex flex-col gap-4" noValidate onSubmit={form.handleSubmit((v) => grade.mutate(v))}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grade-score">{t.grading.score}</Label>
          <div className="flex items-center gap-3">
            <Input
              id="grade-score"
              type="number"
              inputMode="numeric"
              min={0}
              max={max}
              step={1}
              dir="ltr"
              className="h-11 w-28 font-mono text-lg"
              aria-invalid={!!err}
              aria-describedby={err ? 'grade-score-hint grade-score-err' : 'grade-score-hint'}
              {...form.register('score', {
                valueAsNumber: true,
                validate: (v) => (Number.isInteger(v) && v >= 0 && v <= max) || fill(t.grading.scoreError, { m: f.number(max) }),
              })}
            />
            <span id="grade-score-hint" className="text-sm text-muted-foreground">
              {fill(t.grading.outOf, { m: f.number(max) })}
            </span>
          </div>
          {err && (
            <span id="grade-score-err" role="alert" className="text-sm text-destructive">
              {err.message}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grade-feedback">{t.grading.feedback}</Label>
          <Textarea id="grade-feedback" rows={5} maxLength={5000} placeholder={t.grading.feedbackPlaceholder} {...form.register('feedback')} />
        </div>
        <Button type="submit" variant="sun" size="lg" className="self-start" disabled={grade.isPending}>
          {grade.isPending ? t.grading.returning : t.grading.returnToStudent}
        </Button>
      </form>
    </Panel>
  );
}
