'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CourseCover } from '@/components/brand/course-cover';
import { Chip } from '@/components/brand/status-chip';
import { SectionHeader } from '@/components/brand/section';
import { ErrorState } from '@/components/brand/states';
import { batchesApi, meApi, type WaitlistEntry, type WaitlistPromotion } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { timecode } from '@/lib/i18n/format';
import { useNow } from '@/lib/use-now';
import { useEnrollments } from '../learn/hooks';

export function useMyWaitlist() {
  return useQuery({ queryKey: qk.waitlist, queryFn: meApi.waitlist, refetchInterval: 60_000 });
}

/** "3rd" in English; plain locale digits where the language has no ordinal suffix. */
function useOrdinal() {
  const { t, f, locale } = useI18n();
  const rules = new Intl.PluralRules(locale, { type: 'ordinal' });
  return (n: number) => {
    const form = rules.select(n) as keyof typeof t.waitlist.ordinal;
    return (t.waitlist.ordinal[form] ?? t.waitlist.ordinal.other).replace('{n}', f.number(n));
  };
}

/** Waitlisted batches with place in line, and seats offered from a waitlist with their hold countdown. Renders nothing when empty. */
export function WaitlistPanel() {
  const { t } = useI18n();
  const q = useMyWaitlist();
  const enr = useEnrollments();
  const styles = new Map((enr.data ?? []).map((e) => [e.batchId, e.batch.course.coverStyle]));
  if (q.isPending) return null;
  if (q.isError) return <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />;
  const { items, promoted } = q.data;
  if (items.length === 0 && promoted.length === 0) return null;
  return (
    <section aria-labelledby="waitlists" className="flex flex-col gap-4">
      <SectionHeader title={<span id="waitlists">{t.waitlist.title}</span>} />
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
        {promoted.map((p) => (
          <li key={p.enrollmentId}>
            <PromotedCard p={p} />
          </li>
        ))}
        {items.map((w) => (
          <li key={w.enrollmentId}>
            <WaitingCard w={w} coverStyle={styles.get(w.batchId)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromotedCard({ p }: { p: WaitlistPromotion }) {
  const { t, f, fill, pick } = useI18n();
  const now = useNow(1000);
  const secs = (new Date(p.holdExpiresAt).getTime() - now) / 1000;
  const expired = secs <= 0;
  const course = pick(p.course.titleEn, p.course.titleAr).text || p.courseTitle;
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl bg-sun p-5 text-ink">
      <div className="flex items-center justify-between gap-2">
        <Chip tone="ink">{t.waitlist.promotedTitle}</Chip>
        <b className="font-display text-2xl leading-none font-extrabold" dir="ltr">
          {p.batchCode}
        </b>
      </div>
      <div>
        <b className="block text-lg leading-tight">{course}</b>
        <span className="text-[13px]">
          {t.waitlist.promotedBody} · {fill(t.waitlist.starts, { d: f.dayMonth(p.startsOn) })}
        </span>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label-mono block">{expired ? t.waitlist.expired : t.waitlist.holdEnds}</span>
          {!expired && (
            <span className="timecode text-3xl leading-none" role="timer" aria-live="off">
              {timecode(secs)}
            </span>
          )}
        </div>
        <Button asChild variant="ink" disabled={expired}>
          <Link href={`/checkout/${p.batchId}`} aria-disabled={expired || undefined} tabIndex={expired ? -1 : undefined}>
            {t.waitlist.claim}
          </Link>
        </Button>
      </div>
    </article>
  );
}

function WaitingCard({ w, coverStyle }: { w: WaitlistEntry; coverStyle?: string }) {
  const { t, f, fill, pick } = useI18n();
  const ordinal = useOrdinal();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const course = pick(w.course.titleEn, w.course.titleAr).text || w.courseTitle;
  const leave = useMutation({
    mutationFn: () => batchesApi.leaveWaitlist(w.batchId),
    onSuccess: () => {
      toast.success(fill(t.waitlist.left, { code: w.batchCode }));
      void qc.invalidateQueries({ queryKey: qk.waitlist });
      void qc.invalidateQueries({ queryKey: qk.enrollments });
      void qc.invalidateQueries({ queryKey: qk.batch(w.batchId) });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <article className="flex h-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <CourseCover course={{ ...w.course, coverStyle: coverStyle ?? 'peach' }} size="sm" showMeta={false} className="w-44 shrink-0 rounded-none max-sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <b className="font-display text-2xl leading-none font-extrabold" dir="ltr">
            {w.batchCode}
          </b>
          <Chip tone="peach">{t.status.enrollment.WAITLISTED}</Chip>
        </div>
        <Link href={`/courses/${w.course.slug}?batch=${w.batchId}`} className="truncate font-bold text-foreground no-underline hover:underline">
          {course}
        </Link>
        <p className="flex items-center gap-2 font-display text-xl">
          <Hourglass className="size-4 text-peach-fg" aria-hidden />
          {fill(t.waitlist.position, { pos: ordinal(w.position), total: f.number(w.total) })}
        </p>
        <span className="text-[13px] text-muted-foreground">
          {fill(t.waitlist.joined, { d: f.dayMonth(w.joinedAt) })} · {fill(t.waitlist.starts, { d: f.dayMonth(w.startsOn) })}
        </span>
        <Button variant="outline" size="sm" className="mt-auto min-h-11 self-start" onClick={() => setOpen(true)}>
          {t.waitlist.leave}
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl">{fill(t.waitlist.leaveTitle, { code: w.batchCode })}</AlertDialogTitle>
              <AlertDialogDescription>{t.waitlist.leaveBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={leave.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  leave.mutate();
                }}
              >
                {t.waitlist.leave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}
