'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchCard } from '@/components/brand/batch-card';
import { CourseCover } from '@/components/brand/course-cover';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { SessionSlate } from '@/components/brand/session-slate';
import { SessionStatusChip, Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, batchesApi, coursesApi, meApi, type BatchDetail, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useAuth } from '@/lib/auth/use-auth';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { batchPriceFils, describeRule, minutesUntil, sessionState } from '@/lib/schedule';

const ZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Africa/Cairo', 'Europe/London'];

export function CourseDetail({ slug }: { slug: string }) {
  const { t } = useI18n();
  const course = useQuery({ queryKey: qk.course(slug), queryFn: () => coursesApi.get(slug) });

  if (course.isPending)
    return (
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <LoadingBlock rows={4} height={120} />
      </div>
    );
  if (course.isError)
    return (
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
        <Link href="/" className="link-sun mt-4 inline-block text-sm">
          {t.nav.public.courses}
        </Link>
      </div>
    );
  return <CourseView course={course.data} />;
}

function CourseView({ course }: { course: Course }) {
  const { t, f, fill, pick } = useI18n();
  const params = useSearchParams();
  const title = pick(course.titleEn, course.titleAr);
  const desc = pick(course.descriptionEn, course.descriptionAr);
  const p = { courseId: course.id, pageSize: 50 };
  const batches = useQuery({ queryKey: qk.batches(p), queryFn: () => batchesApi.list(p) });
  const list = useMemo(() => [...(batches.data?.items ?? [])].sort((a, b) => a.startsOn.localeCompare(b.startsOn)), [batches.data]);
  const [picked, setPicked] = useState<string | null>(params.get('batch'));
  const selectedId = picked ?? list.find((b) => b.status === 'ENROLLING')?.id ?? list[0]?.id ?? null;
  const localTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Dubai';
  const [tz, setTz] = useState(localTz);
  const zones = useMemo(() => Array.from(new Set([localTz, ...ZONES])), [localTz]);
  const teacher = list[0]?.teacher;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-14 px-4 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-stone">
        <Link href="/#catalog" className="hover:text-ivory">
          {t.nav.public.courses}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span>{course.category}</span>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-ivory">{title.text}</span>
      </nav>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Chip tone="ivory">
              {course.category} · {t.status.level[course.level]}
            </Chip>
            <Chip tone="outline">{fill(t.course.liveSessions, { n: f.number(list[0]?.schedule?.sessionCount ?? course.modules.length) })}</Chip>
            <Chip tone="outline">{t.course.recordings}</Chip>
            {title.fallback && <Chip tone="dashed">{t.common.englishOnly}</Chip>}
          </div>
          <h1 className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.88]">{title.text}</h1>
          {desc.text && <p className="max-w-2xl text-lg leading-relaxed text-stone">{desc.text}</p>}
          {teacher && (
            <div className="flex items-center gap-3">
              <InitialsAvatar name={teacher.name} size={48} />
              <div>
                <b className="block">
                  <bdi>{teacher.name}</bdi>
                </b>
                <span className="text-sm text-stone">{t.course.leadTeacher}</span>
              </div>
            </div>
          )}
        </div>
        <CourseCover course={course} size="xl" className="min-h-80" />
      </section>

      {course.modules.length > 0 && (
        <section aria-labelledby="syllabus" className="flex flex-col gap-4">
          <h2 id="syllabus" className="label-mono text-stone">
            {fill(t.course.syllabus, { n: f.number(course.modules.length) })}
          </h2>
          <ol className="grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2">
            {course.modules.map((m) => (
              <li key={m.id} className="flex items-baseline gap-4 bg-ink p-5">
                <span className="timecode text-sm text-stone">M{String(m.order + 1).padStart(2, '0')}</span>
                <b className="text-lg">{pick(m.titleEn, m.titleAr).text}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="pick" className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label-mono text-stone">{t.course.step}</span>
              <h2 id="pick" className="mt-2 font-display text-[44px] font-extrabold leading-none">
                {t.course.pickWeek}
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone">
              {t.course.showTimesIn}
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger size="sm" className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z} · {gmtOffset(z)} {z === localTz ? `(${t.course.yours})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {batches.isPending ? (
            <LoadingBlock rows={2} height={200} />
          ) : batches.isError ? (
            <ErrorState error={batches.error} onRetry={() => void batches.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState title={t.course.noBatches} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((b) => (
                <BatchCard key={b.id} batch={b} selected={b.id === selectedId} onSelect={() => setPicked(b.id)} />
              ))}
            </div>
          )}
          {selectedId && <BatchSchedule batchId={selectedId} tz={tz} />}
        </div>
        {selectedId && <SeatPanel batchId={selectedId} tz={tz} />}
      </section>
    </div>
  );
}

function useBatch(batchId: string) {
  return useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });
}

function BatchSchedule({ batchId, tz }: { batchId: string; tz: string }) {
  const { t, f, fill } = useI18n();
  const q = useBatch(batchId);
  if (q.isPending) return <LoadingBlock rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const b = q.data;
  const ended = b.sessions.filter((s) => s.status === 'ENDED').length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-extrabold">{fill(t.course.fullSchedule, { code: b.code })}</h3>
        <span className="label-mono text-stone">
          {fill(t.course.scheduleMeta, { n: f.number(b.sessions.length), d: f.number(b.schedule?.durationMin ?? 0), tz: gmtOffset(tz) })}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {b.sessions.map((s) => {
          const state = sessionState(s);
          return (
            <li key={s.id}>
              <SessionSlate
                code={sessionCode(s.number)}
                day={f.weekday(s.startsAt, tz)}
                title={s.title}
                state={state === 'LIVE' ? 'SCHEDULED' : state}
                sub={`${f.dayMonth(s.startsAt, tz)} · ${f.time(s.startsAt, tz)}`}
                trailing={<SessionStatusChip state={state} minutes={minutesUntil(s.startsAt)} />}
              />
            </li>
          );
        })}
      </ol>
      {ended > 0 && <p className="text-sm text-stone">{t.course.midBatch}</p>}
    </div>
  );
}

function SeatPanel({ batchId, tz }: { batchId: string; tz: string }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const { isSignedIn, user } = useAuth();
  const q = useBatch(batchId);
  const qc = useQueryClient();
  const router = useRouter();
  const mine = useQuery({ queryKey: qk.enrollments, queryFn: meApi.enrollments, enabled: !!isSignedIn && user?.role === 'STUDENT' });
  const myStatus = mine.data?.find((e) => e.batchId === batchId)?.status;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: qk.enrollments }), qc.invalidateQueries({ queryKey: qk.batch(batchId) })]);
  const join = useMutation({
    mutationFn: () => batchesApi.joinWaitlist(batchId),
    onSuccess: () => (toast.success(fill(t.course.waitlistJoined, { code: q.data?.code ?? '' }), { description: t.course.waitlistBody }), void refresh()),
    onError: (e: Error) => {
      const code = e instanceof ApiError ? (e.details as { code?: string; orderId?: string } | undefined) : undefined;
      // Seats opened up, or the student already holds one → continue in checkout / their order.
      if (code?.code === 'SEATS_AVAILABLE') return router.push(`/checkout/${batchId}`);
      if (code?.code === 'ORDER_IN_PROGRESS' && code.orderId) return router.push(`/orders/${code.orderId}`);
      if (code?.code === 'ORDER_IN_PROGRESS') return router.push(`/checkout/${batchId}`);
      toast.error(e.message);
    },
  });
  const leave = useMutation({
    mutationFn: () => batchesApi.leaveWaitlist(batchId),
    onSuccess: () => (toast.success(t.course.leftWaitlist), void refresh()),
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isPending) return <LoadingBlock rows={1} height={420} />;
  if (q.isError) return <ErrorState error={q.error} />;
  const b: BatchDetail = q.data;
  const next = b.sessions.find((s) => s.status === 'SCHEDULED' || s.status === 'LIVE');
  const price = batchPriceFils(b);
  const full = b.status === 'FULL' || b.seatsLeft <= 0;
  const open = b.status === 'ENROLLING' || b.status === 'RUNNING' || full;
  const checkoutHref = `/checkout/${b.id}`;
  const href = isSignedIn ? checkoutHref : `/sign-in?next=${encodeURIComponent(checkoutHref)}`;
  return (
    <aside className="flex h-fit flex-col gap-5 rounded-[24px] bg-ivory p-6 text-ink lg:sticky lg:top-6">
      <span className="label-mono text-stone-2">{t.course.yourSeat}</span>
      <div>
        <b className="font-display text-6xl font-extrabold leading-none" dir="ltr">
          {b.code}
        </b>
        <div className="mt-2 font-display text-xl">{describeRule(b, f)}</div>
        <div className="text-sm text-stone-2">
          {f.dayMonth(b.startsOn, tz)} → {f.dayMonth(b.endsOn, tz)} · {fill(t.course.withTeacher, { name: b.teacher.name })}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-y border-cream-line py-4 text-sm">
        <div>
          <dt className="label-mono text-stone-2">{t.course.nextLive}</dt>
          <dd className="mt-1 font-semibold">{next ? `${f.date(next.startsAt, tz)} · ${f.time(next.startsAt, tz)}` : '—'}</dd>
        </div>
        <div>
          <dt className="label-mono text-stone-2">{t.course.seatsLeft}</dt>
          <dd className="mt-1 font-semibold">{fill(t.course.seatsOf, { n: f.number(b.seatsLeft), c: f.number(b.capacity) })}</dd>
        </div>
      </dl>
      <div className="flex items-end justify-between">
        <span className="text-sm text-stone-2">{t.course.total}</span>
        <span className="text-end">
          <b className="font-display text-4xl font-extrabold">{money.display(price)}</b>
          {money.currency !== 'AED' && <span className="block text-xs text-stone-2">{fill(t.money.charged, { amount: money.aed(price) })}</span>}
        </span>
      </div>
      {myStatus === 'ACTIVE' ? (
        <Button asChild variant="ink" size="lg">
          <Link href="/learn">{t.checkout.goToLearning}</Link>
        </Button>
      ) : myStatus === 'WAITLISTED' ? (
        <div className="flex flex-col gap-2">
          <Chip tone="peach">{t.course.onWaitlist}</Chip>
          <p className="text-sm text-stone-2">{t.course.waitlistBody}</p>
          <Button variant="outline" size="sm" className="w-fit" disabled={leave.isPending} onClick={() => leave.mutate()}>
            {t.course.leaveWaitlist}
          </Button>
        </div>
      ) : open && full && isSignedIn && b.waitlistEnabled && !myStatus?.match(/^(ACTIVE|PENDING_PAYMENT|AWAITING_TRANSFER|VERIFYING)$/) ? (
        <Button variant="ink" size="lg" disabled={join.isPending} onClick={() => join.mutate()}>
          {fill(t.course.waitlist, { code: b.code })}
        </Button>
      ) : open && !(full && !b.waitlistEnabled) ? (
        <Button asChild variant="ink" size="lg">
          <Link href={href}>{full ? fill(t.course.waitlist, { code: b.code }) : fill(t.course.enroll, { code: b.code })}</Link>
        </Button>
      ) : (
        <Button variant="ink" size="lg" disabled>
          {t.checkout.notOpen}
        </Button>
      )}
      <p className="text-xs text-stone-2">{t.course.switchNote}</p>
    </aside>
  );
}
