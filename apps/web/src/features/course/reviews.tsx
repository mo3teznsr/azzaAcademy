'use client';

import { useId, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Stars } from '@/components/brand/rating';
import { Chip } from '@/components/brand/status-chip';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, coursesApi, type CourseReview, type CourseReviewPage, type RatingSummary } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

/** Paged reviews of a course (the first page also carries the summary, the viewer's review and `canReview`). */
function useReviews(courseId: string) {
  return useInfiniteQuery({
    queryKey: [...qk.reviews(courseId), 'list'],
    queryFn: ({ pageParam }) => coursesApi.reviews(courseId, { page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last: CourseReviewPage) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

/** After any write: reviews, and the course itself (its average and count changed). */
function useRefresh(courseId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.reviews(courseId) });
    void qc.invalidateQueries({ queryKey: ['course'] });
    void qc.invalidateQueries({ queryKey: ['courses'] });
  };
}

function useReviewError() {
  const { t } = useI18n();
  return (e: unknown) => (e instanceof ApiError && e.code === 'REVIEW_NOT_ELIGIBLE' ? t.reviews.notEligible : e instanceof Error ? e.message : String(e));
}

/** Public course page section: summary, the viewer's own review form, the list with replies, load more. */
export function CourseReviews({ courseId, canReply, canModerate }: { courseId: string; canReply: boolean; canModerate: boolean }) {
  const { t } = useI18n();
  const q = useReviews(courseId);
  if (q.isPending) return <LoadingBlock rows={3} height={96} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const first = q.data.pages[0]!;
  const reviews = q.data.pages.flatMap((p) => p.items);
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.6fr]">
      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <RatingSummaryBlock summary={first.summary} />
        {first.canReview && <MyReviewForm courseId={courseId} mine={first.mine} />}
      </div>
      <div className="flex flex-col gap-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">{t.reviews.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewItem review={r} courseId={courseId} canReply={canReply} canModerate={canModerate} />
              </li>
            ))}
          </ul>
        )}
        {q.hasNextPage && (
          <Button variant="outline" className="self-start" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
            {t.reviews.loadMore}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Admin course editor "Reviews" tab: every review including hidden ones, with Hide / Unhide and Reply. */
export function ReviewModeration({ courseId }: { courseId: string }) {
  const { t, f } = useI18n();
  const q = useReviews(courseId);
  if (q.isPending) return <LoadingBlock rows={3} height={96} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const first = q.data.pages[0]!;
  const reviews = q.data.pages.flatMap((p) => p.items);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {f.plural(first.total, t.reviews.count)} · {t.reviews.moderationNote}
      </p>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground">{t.reviews.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewItem review={r} courseId={courseId} canReply canModerate />
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <Button variant="outline" className="self-start" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {t.reviews.loadMore}
        </Button>
      )}
    </div>
  );
}

function RatingSummaryBlock({ summary }: { summary: RatingSummary }) {
  const { t, f, fill } = useI18n();
  const { ratingAvg, ratingCount, distribution } = summary;
  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card p-6">
      <div className="flex items-end gap-4">
        <b className="font-display text-7xl font-extrabold leading-none">{ratingCount ? f.number(ratingAvg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</b>
        <div className="flex flex-col gap-1 pb-1">
          <Stars value={ratingAvg} size="size-5" />
          <span className="text-sm text-muted-foreground">
            {ratingCount ? `${fill(t.reviews.outOf, { avg: f.number(ratingAvg, { maximumFractionDigits: 1 }) })} · ` : ''}
            {f.plural(ratingCount, t.reviews.count)}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const n = distribution[String(s) as keyof RatingSummary['distribution']] ?? 0;
          const pct = ratingCount ? Math.round((n / ratingCount) * 100) : 0;
          return (
            <li key={s} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                {f.number(s)} <Star className="size-3.5 fill-current text-sun-fg" aria-hidden />
              </span>
              <span
                className="h-2 overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label={fill(t.reviews.bar, { s: f.plural(s, t.reviews.stars), n: f.plural(n, t.reviews.count) })}
              >
                <span className="block h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-end text-muted-foreground">{f.number(n)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Star picker (single-select toggle group: arrow keys move, each star is a radio). */
function StarPicker({ value, onChange, labelId }: { value: number; onChange: (n: number) => void; labelId: string }) {
  const { t, f } = useI18n();
  return (
    <ToggleGroup type="single" value={value ? String(value) : ''} onValueChange={(v) => v && onChange(Number(v))} aria-labelledby={labelId} className="flex justify-start gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <ToggleGroupItem key={n} value={String(n)} aria-label={f.plural(n, t.reviews.stars)} className="size-11 rounded-full p-0 data-[state=on]:bg-transparent hover:bg-accent">
          <Star className={cn('size-7', n <= value ? 'fill-current text-sun-fg' : 'text-line-strong')} aria-hidden />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function MyReviewForm({ courseId, mine }: { courseId: string; mine: CourseReview | null }) {
  const { t } = useI18n();
  const id = useId();
  const refresh = useRefresh(courseId);
  const reviewError = useReviewError();
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => coursesApi.saveMyReview(courseId, { rating, body: body.trim() }),
    onSuccess: () => (toast.success(t.reviews.posted), refresh()),
    onError: (e) => toast.error(reviewError(e)),
  });
  const remove = useMutation({
    mutationFn: () => coursesApi.deleteMyReview(courseId),
    onSuccess: () => {
      toast.success(t.reviews.deleted);
      setRating(0);
      setBody('');
      refresh();
    },
    onError: (e) => toast.error(reviewError(e)),
  });
  return (
    <form
      className="flex flex-col gap-4 rounded-[20px] border border-border p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setError(t.reviews.pickRating);
        save.mutate();
      }}
    >
      <b className="font-display text-xl">{mine ? t.reviews.edit : t.reviews.write}</b>
      <div className="flex flex-col gap-1.5">
        <span id={`${id}-rating`} className="text-[13px] text-muted-foreground">
          {t.reviews.yourRating}
        </span>
        <StarPicker value={rating} onChange={(n) => (setRating(n), setError(null))} labelId={`${id}-rating`} />
        {error && <span className="text-[13px] text-destructive">{error}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-body`} className="text-[13px] text-muted-foreground">
          {t.reviews.bodyLabel}
        </Label>
        <Textarea id={`${id}-body`} rows={4} maxLength={2000} dir="auto" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="ink" disabled={save.isPending}>
          {mine ? t.reviews.update : t.reviews.post}
        </Button>
        {mine && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" disabled={remove.isPending}>
                {t.reviews.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.reviews.delete}</AlertDialogTitle>
                <AlertDialogDescription>{t.reviews.deleteConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
                  {t.reviews.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}

function ReviewItem({ review: r, courseId, canReply, canModerate }: { review: CourseReview; courseId: string; canReply: boolean; canModerate: boolean }) {
  const { t, f } = useI18n();
  const refresh = useRefresh(courseId);
  const reviewError = useReviewError();
  const [replying, setReplying] = useState(false);
  const moderate = useMutation({
    mutationFn: () => coursesApi.moderateReview(r.id, !r.hidden),
    onSuccess: (u) => (toast.success(u.hidden ? t.reviews.hiddenDone : t.reviews.unhiddenDone), refresh()),
    onError: (e) => toast.error(reviewError(e)),
  });
  return (
    <article className={cn('flex flex-col gap-3 rounded-[20px] bg-card p-5', r.hidden && 'opacity-70')}>
      <header className="flex flex-wrap items-center gap-3">
        <InitialsAvatar name={r.user.name} src={r.user.image} size={36} />
        <span className="min-w-0 flex-1">
          <bdi className="block font-semibold">{r.user.name}</bdi>
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span role="img" aria-label={f.plural(r.rating, t.reviews.stars)}>
              <Stars value={r.rating} size="size-3.5" />
            </span>
            {f.dayMonth(r.createdAt)}
          </span>
        </span>
        {r.hidden && <Chip tone="dashed">{t.reviews.hidden}</Chip>}
      </header>
      {r.body && (
        <p className="whitespace-pre-line text-[15px] leading-relaxed" dir="auto">
          {r.body}
        </p>
      )}
      {r.teacherReply && !replying && (
        <div className="flex flex-col gap-1 border-s-2 border-sun ps-4">
          <span className="label-mono text-muted-foreground">{t.reviews.teacherReply}</span>
          <p className="whitespace-pre-line text-[15px]" dir="auto">
            {r.teacherReply}
          </p>
        </div>
      )}
      {replying && <ReplyForm review={r} onDone={() => (setReplying(false), refresh())} onCancel={() => setReplying(false)} />}
      {(canReply || canModerate) && !replying && (
        <div className="flex flex-wrap gap-2">
          {canReply && (
            <Button variant="ghost" size="sm" onClick={() => setReplying(true)}>
              <MessageSquareReply /> {r.teacherReply ? t.reviews.editReply : t.reviews.reply}
            </Button>
          )}
          {canModerate && (
            <Button variant="ghost" size="sm" disabled={moderate.isPending} onClick={() => moderate.mutate()}>
              {r.hidden ? t.reviews.unhide : t.reviews.hide}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function ReplyForm({ review, onDone, onCancel }: { review: CourseReview; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const id = useId();
  const reviewError = useReviewError();
  const [reply, setReply] = useState(review.teacherReply ?? '');
  const send = useMutation({
    mutationFn: () => coursesApi.replyToReview(review.id, reply.trim()),
    onSuccess: () => (toast.success(t.reviews.replied), onDone()),
    onError: (e) => toast.error(reviewError(e)),
  });
  return (
    <form
      className="flex flex-col gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (reply.trim().length >= 2) send.mutate();
      }}
    >
      <Label htmlFor={`${id}-reply`} className="text-[13px] text-muted-foreground">
        {t.reviews.replyLabel}
      </Label>
      <Textarea id={`${id}-reply`} rows={3} minLength={2} maxLength={2000} dir="auto" value={reply} onChange={(e) => setReply(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="ink" disabled={send.isPending || reply.trim().length < 2}>
          {t.reviews.postReply}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
