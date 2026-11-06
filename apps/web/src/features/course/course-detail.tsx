'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchCard } from '@/components/brand/batch-card';
import { CourseCover } from '@/components/brand/course-cover';
import { CourseIntroVideo } from '@/components/brand/course-intro-video';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { SessionSlate } from '@/components/brand/session-slate';
import { SessionStatusChip, Chip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { Panel } from '@/components/brand/section';
import { useCategoryLabel } from '@/components/brand/category';
import { RatingInline } from '@/components/brand/rating';
import { ApiError, batchesApi, coursesApi, meApi, type BatchDetail, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { Price } from '@/components/brand/price';
import { useAuth } from '@/lib/auth/use-auth';
import { gmtOffset, sessionCode } from '@/lib/i18n/format';
import { batchPriceFils, describeRule, minutesUntil, sessionState } from '@/lib/schedule';
import { Accordion } from '../catalog/faq';
import { CourseRail } from '../catalog/course-card';
import { usePublicBatches } from '../catalog/use-catalog';
import { SaveToggle } from '../saved/use-saved';
import { CourseReviews } from './reviews';

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
  const { t, f, fill, pick, locale } = useI18n();
  const params = useSearchParams();
  const { user, role } = useAuth();
  const categoryLabel = useCategoryLabel();
  /** Arabic list when there is one, else English (lists are translated as a whole, not line by line). */
  const pickList = (en: string[], ar: string[]) => (locale === 'ar' && ar.length ? ar : en);
  const outcomes = pickList(course.outcomesEn, course.outcomesAr);
  const requirements = pickList(course.requirementsEn, course.requirementsAr);
  const audience = pickList(course.audienceEn, course.audienceAr);
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
  // Teachers of this course (its proposer, or anyone running one of its batches) reply to reviews; admins moderate.
  const canModerate = role === 'ADMIN';
  const canReply = canModerate || (role === 'TEACHER' && !!user && (course.createdById === user.id || list.some((b) => b.teacherId === user.id)));
  const categoryHref = `/?category=${encodeURIComponent(course.category)}#catalog`;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-14 px-4 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/#catalog" className="hover:text-foreground">
          {t.nav.public.courses}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <Link href={categoryHref} className="hover:text-foreground">
          {categoryLabel(course)}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">{title.text}</span>
      </nav>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Chip tone="ivory">
              {categoryLabel(course)} · {t.status.level[course.level]}
            </Chip>
            <Chip tone="outline">{fill(t.course.liveSessions, { n: f.number(list[0]?.schedule?.sessionCount ?? course.modules.length) })}</Chip>
            <Chip tone="outline">{t.course.recordings}</Chip>
            {title.fallback && <Chip tone="dashed">{t.common.englishOnly}</Chip>}
          </div>
          <h1 className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.88]">{title.text}</h1>
          {course.ratingCount > 0 && (
            <a href="#reviews" className="self-start no-underline">
              <RatingInline avg={course.ratingAvg} count={course.ratingCount} className="text-base" />
            </a>
          )}
          {desc.text && <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{desc.text}</p>}
          <div className="flex flex-wrap gap-2">
            <SaveToggle course={course} labelled />
            <ShareButton title={title.text} slug={course.slug} />
          </div>
          {teacher && (
            <div className="flex items-center gap-3">
              <InitialsAvatar name={teacher.name} src={teacher.image} size={48} />
              <div>
                <Link href={`/teachers/${teacher.id}`} className="block font-bold text-foreground underline-offset-4 hover:underline">
                  <bdi>{teacher.name}</bdi>
                </Link>
                <span className="text-sm text-muted-foreground">{t.course.leadTeacher}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <CourseCover course={course} size="xl" className="min-h-80" />
          <CourseIntroVideo url={course.introVideoUrl} title={fill(t.course.introVideo, { title: title.text })} />
        </div>
      </section>

      {course.modules.length > 0 && (
        <Panel aria-labelledby="syllabus" className="gap-2">
          <h2 id="syllabus" className="label-mono text-muted-foreground">
            {fill(t.course.syllabus, { n: f.number(course.modules.length) })}
          </h2>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {course.modules.map((m) => {
              const desc = pick(m.descriptionEn, m.descriptionAr).text;
              return (
                <li key={m.id} className="flex items-baseline gap-4 border-t border-border py-4 first:border-t-0 sm:nth-2:border-t-0">
                  <span className="timecode text-sm text-muted-foreground">M{String(m.order + 1).padStart(2, '0')}</span>
                  <span className="flex flex-col gap-1">
                    <b className="text-lg">{pick(m.titleEn, m.titleAr).text}</b>
                    {desc && <span className="text-[15px] text-muted-foreground">{desc}</span>}
                    {/* Syllabus preview: lesson titles only; the lessons open to enrolled students. */}
                    {!!m.lessons?.length && (
                      <ol aria-label={t.learning.lessons.title} className="mt-1 flex flex-col gap-1 text-[14px] text-muted-foreground">
                        {m.lessons.map((l) => (
                          <li key={l.id} className="flex gap-2">
                            <span className="size-1.5 shrink-0 translate-y-2 rounded-full bg-green" aria-hidden />
                            {pick(l.titleEn, l.titleAr).text}
                          </li>
                        ))}
                      </ol>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      {(outcomes.length > 0 || requirements.length > 0 || audience.length > 0) && (
        <section className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {outcomes.length > 0 && <BulletBlock id="outcomes" title={t.course.outcomes} items={outcomes} tone="sun" />}
          {requirements.length > 0 && <BulletBlock id="requirements" title={t.course.requirements} items={requirements} />}
          {audience.length > 0 && <BulletBlock id="audience" title={t.course.audience} items={audience} />}
        </section>
      )}

      <section aria-labelledby="pick" className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label-mono text-muted-foreground">{t.course.step}</span>
              <h2 id="pick" className="mt-2 font-display text-[44px] font-extrabold leading-none">
                {t.course.pickWeek}
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
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

      <section id="reviews" aria-labelledby="reviews-title" className="flex scroll-mt-8 flex-col gap-6">
        <h2 id="reviews-title" className="font-display text-[44px] font-extrabold leading-none">
          {t.reviews.title}
        </h2>
        <CourseReviews courseId={course.id} canReply={canReply} canModerate={canModerate} />
      </section>

      {course.faq.length > 0 && (
        <Panel aria-labelledby="course-faq" className="grid gap-x-10 gap-y-2 lg:grid-cols-[1fr_1.4fr] lg:p-8">
          <h2 id="course-faq" className="font-display text-[44px] font-extrabold leading-none">
            {t.course.faqTitle}
          </h2>
          <Accordion className="border-t-0" items={course.faq.map((q) => ({ q: pick(q.qEn, q.qAr).text, a: pick(q.aEn, q.aAr).text }))} />
        </Panel>
      )}

      <RelatedCourses courseId={course.id} />
    </div>
  );
}

function BulletBlock({ id, title, items, tone }: { id: string; title: string; items: string[]; tone?: 'sun' }) {
  // The outcomes card is the green-filled one (inkDeep text, never white); the rest are plain cards.
  return (
    <Panel aria-labelledby={id} className={tone === 'sun' ? 'border-transparent bg-sun text-ink-deep' : undefined}>
      <h2 id={id} className="font-display text-2xl font-extrabold">
        {title}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span dir="auto">{item}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** `navigator.share` where available (mobile), else copy the link. */
function ShareButton({ title, slug }: { title: string; slug: string }) {
  const { t } = useI18n();
  const share = async () => {
    const url = `${window.location.origin}/courses/${slug}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.course.linkCopied);
    } catch {
      toast.error(t.course.shareFailed);
    }
  };
  return (
    <Button type="button" variant="outline" onClick={() => void share()}>
      <Share2 /> {t.course.share}
    </Button>
  );
}

function RelatedCourses({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.related(courseId), queryFn: () => coursesApi.related(courseId) });
  const batches = usePublicBatches();
  if (!q.data?.length) return null;
  return (
    <section aria-labelledby="related" className="flex flex-col gap-6">
      <h2 id="related" className="font-display text-[44px] font-extrabold leading-none">
        {t.course.related}
      </h2>
      <CourseRail courses={q.data} byCourse={batches.byCourse} />
    </section>
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
        <span className="label-mono text-muted-foreground">
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
      {ended > 0 && <p className="text-sm text-muted-foreground">{t.course.midBatch}</p>}
    </div>
  );
}

function SeatPanel({ batchId, tz }: { batchId: string; tz: string }) {
  const { t, f, fill } = useI18n();
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
  // Ivory "paper" card in both themes; theme-cream gives its controls light-ground tokens.
  return (
    <aside className="theme-cream flex h-fit flex-col gap-5 rounded-[24px] bg-ivory p-6 text-ink light:border light:border-border lg:sticky lg:top-6">
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
        <Price fils={price} align="end" amountClassName="font-display text-4xl font-extrabold" noteClassName="text-stone-2" />
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
