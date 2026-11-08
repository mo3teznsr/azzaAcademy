'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, CircleCheck, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Chip, EnrollmentStatusChip, SessionStatusChip } from '@/components/brand/status-chip';
import { CourseCover } from '@/components/brand/course-cover';
import { SessionSlate } from '@/components/brand/session-slate';
import { Panel, SectionHeader } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock, QueryView } from '@/components/brand/states';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { SignalMark } from '@/components/brand/signal-mark';
import type { Enrollment, ScheduleItem } from '@/lib/api/types';
import { subscriptionsApi, type CourseLearningProgress, type MySubscription } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { RenewButton } from '../subscriptions/manage-plan';
import { useI18n } from '@/lib/i18n/provider';
import { sessionCode, timecode } from '@/lib/i18n/format';
import { describeRule, minutesUntil, sessionState } from '@/lib/schedule';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { useEnrollments, useLearningProgress, useMyAssignments, useMySchedule, useRecordings } from './hooks';
import { WaitlistPanel } from '../waitlist/waitlist-panel';
import { QuizzesDuePanel } from '../quizzes/my-quizzes';
import { useCategoryLabel } from '@/components/brand/category';
import { LatestFromClasses } from '../comms/announcements';
import { MessageTeacherButton } from '../comms/chat';

export function LearnDashboard() {
  const [range] = useState(() => {
    const from = new Date(Date.now() - 3 * 3600_000);
    const to = new Date(Date.now() + 35 * 86400_000);
    return { from, to };
  });
  const schedule = useMySchedule(range.from, range.to);
  const enrollments = useEnrollments();
  const now = useNow(30_000);
  const live = schedule.data?.find((s) => s.status === 'LIVE');
  const upcoming = useMemo(() => (schedule.data ?? []).filter((s) => s.status === 'SCHEDULED' && new Date(s.endsAt).getTime() > now), [schedule.data, now]);
  const { t } = useI18n();

  return (
    <>
      {schedule.isPending ? (
        <LoadingBlock rows={1} height={280} />
      ) : schedule.isError ? (
        <ErrorState error={schedule.error} onRetry={() => void schedule.refetch()} />
      ) : live ? (
        <OnAirHero session={live} />
      ) : upcoming[0] ? (
        <NextTakeHero session={upcoming[0]} />
      ) : (
        <EmptyState title={t.learn.emptyTitle} body={t.learn.emptyBody} action={{ label: t.learn.browse, href: '/#catalog' }} />
      )}

      <ContinueLearning />

      <WaitlistPanel />

      <LatestFromClasses />

      <section aria-labelledby="batches" className="flex flex-col gap-4">
        <SectionHeader title={<span id="batches">{t.learn.myBatches}</span>} size="lg" href="/#catalog" linkLabel={t.learn.findAnother} />
        <QueryView query={enrollments} loading={<LoadingBlock rows={2} height={200} />} empty={<EmptyState title={t.learn.emptyTitle} action={{ label: t.learn.browse, href: '/#catalog' }} />}>
          {(list) => (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
              {list.filter((e) => e.status !== 'WAITLISTED').map((e) => (
                <EnrolledBatchCard key={e.id} enrollment={e} />
              ))}
            </div>
          )}
        </QueryView>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-4">
        {/* Practice first; live sessions are one item among the rest. */}
        <DueSoon />
        <QuizzesDuePanel />
        <Panel aria-labelledby="next">
          <SectionHeader title={<span id="next">{t.learn.nextUp}</span>} href="/schedule" linkLabel={t.learn.fullSchedule} />
          {schedule.isPending ? (
            <LoadingBlock rows={3} />
          ) : schedule.isError ? (
            <ErrorState compact error={schedule.error} />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.schedule.empty}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {upcoming.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <UpcomingRow s={s} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <RecentRecordings />
      </div>
    </>
  );
}

/** Lessons first: where each course stands and the one lesson to open next. Hidden when there's nothing to continue. */
function ContinueLearning() {
  const { t } = useI18n();
  const q = useLearningProgress();
  // Recorded courses show their plan; the rows also know the previous plan for "Renew to continue".
  const hasRecorded = !!q.data?.some((c) => c.type === 'RECORDED');
  const subs = useQuery({ queryKey: qk.mySubscriptions, queryFn: subscriptionsApi.mine, enabled: hasRecorded, retry: false });
  if (q.isPending) return <LoadingBlock rows={1} height={140} />;
  if (q.isError) return <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.length === 0) return null;
  return (
    <section aria-labelledby="continue" className="flex flex-col gap-4">
      <SectionHeader title={<span id="continue">{t.learn.continueTitle}</span>} />
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
        {q.data.map((c) => (
          <li key={c.courseId} className="flex min-w-0">
            <ContinueCard course={c} plan={subs.data?.find((s) => s.course.id === c.courseId && s.status !== 'INCOMPLETE')} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Recorded courses: the status line under the progress, or null when the API hasn't sent the plan. */
function planLine(c: CourseLearningProgress, t: ReturnType<typeof useI18n>['t'], f: ReturnType<typeof useI18n>['f'], fill: ReturnType<typeof useI18n>['fill']): string | null {
  const sub = c.subscription;
  if (c.type !== 'RECORDED' || !sub) return null;
  if (!sub.hasAccess) return t.recorded.ended;
  if (sub.status === 'PAST_DUE') return t.recorded.pastDue;
  if (!sub.currentPeriodEnd) return null;
  const date = f.dayMonth(sub.currentPeriodEnd);
  return fill(sub.status === 'CANCELLING' || sub.cancelAtPeriodEnd ? t.recorded.ends : t.recorded.renews, { date });
}

function ContinueCard({ course: c, plan }: { course: CourseLearningProgress; plan?: MySubscription }) {
  const { t, f, fill, pick } = useI18n();
  const recorded = c.type === 'RECORDED';
  const lapsed = recorded && !!c.subscription && !c.subscription.hasAccess;
  const status = planLine(c, t, f, fill);
  const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0;
  const done = c.total > 0 && c.completed >= c.total;
  const title = pick(c.titleEn, c.titleAr).text;
  const progressText = fill(t.learn.lessonsProgress, { a: f.number(c.completed), b: f.number(c.total) });
  const next = c.nextLesson;
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {recorded && <Chip tone="ivory">{t.recorded.recordedChip}</Chip>}
          <b className="min-w-0 text-base">{title}</b>
        </div>
        {done ? <CircleCheck className="size-5 shrink-0 text-sun-fg" aria-hidden /> : <span className="timecode text-xs text-muted-foreground">{f.percent(pct)}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Progress value={pct} aria-label={fill(t.learn.progressFor, { course: title })} aria-valuetext={progressText} className="h-1.5 rtl:-scale-x-100 [&_[data-slot=progress-indicator]]:bg-green" />
        <span className="text-[13px] text-muted-foreground">{c.total ? progressText : t.learn.noLessonsYet}</span>
      </div>
      {status && (
        <p className={cn('text-[13px] font-semibold', c.subscription?.status === 'PAST_DUE' || lapsed ? 'rounded-xl bg-peach px-3 py-2 text-ink' : 'text-muted-foreground')}>{status}</p>
      )}
      <div className="mt-auto">
        {lapsed ? (
          <div className="flex flex-wrap items-center gap-2">
            <RenewButton subscription={plan} slug={c.slug} />
            <Link href={`/learn/courses/${c.courseId}`} className="link-sun text-sm">
              {t.learning.lessons.open}
            </Link>
          </div>
        ) : done ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-sm">{t.learn.allDone}</b>
            <Link href="/quizzes" className="link-sun text-sm">
              {t.learn.practice}
            </Link>
          </div>
        ) : next ? (
          <Link
            href={`/learn/courses/${c.courseId}?lesson=${next.id}`}
            className="group flex items-center justify-between gap-3 rounded-[14px] border border-border bg-background p-3 no-underline transition-colors hover:border-green-deep"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-foreground">{fill(t.learn.resume, { title: pick(next.titleEn, next.titleAr).text })}</span>
              <span className="truncate text-[13px] text-muted-foreground">{pick(next.moduleTitleEn, next.moduleTitleAr).text}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function UpcomingRow({ s }: { s: ScheduleItem }) {
  const { f, fill, t } = useI18n();
  const state = sessionState(s);
  return (
    <SessionSlate
      code={`${s.batch.code}·${sessionCode(s.number)}`}
      day={f.weekday(s.startsAt)}
      title={s.title}
      state={state}
      sub={s.movedFrom ? fill(t.schedule.movedFrom, { d: f.dateTime(s.movedFrom) }) : `${f.dayMonth(s.startsAt)} · ${f.time(s.startsAt)}`}
      trailing={<SessionStatusChip state={state} minutes={minutesUntil(s.startsAt)} />}
    />
  );
}

function OnAirHero({ session }: { session: ScheduleItem }) {
  const { t, f, fill, pick } = useI18n();
  const now = useNow();
  const elapsed = session.startedAt ? (now - new Date(session.startedAt).getTime()) / 1000 : 0;
  const course = pick(session.batch.course.titleEn, session.batch.course.titleAr).text;
  return (
    <section aria-labelledby="onair" className="relative flex flex-wrap items-end justify-between gap-8 overflow-hidden rounded-[28px] bg-onair p-[clamp(1.5rem,3vw,2.75rem)] text-onair-ink">
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="ink" dot live>
            {t.learn.onAirChip}
          </Chip>
          <span className="label-mono">
            {course} · <bdi dir="ltr">{session.batch.code}</bdi> · {fill(t.learn.sessionOf, { n: session.number, t: '—' })}
          </span>
        </div>
        <h1 id="onair" className="font-display text-[clamp(3.25rem,7.5vw,7.5rem)] font-extrabold leading-[0.85]">
          {session.title}
        </h1>
        <div className="flex flex-wrap items-center gap-5 text-[15px]">
          {session.batch.teacher && (
            <span className="flex items-center gap-2">
              <InitialsAvatar name={session.batch.teacher.name} src={session.batch.teacher.image} size={32} className="border-2 border-onair-ink" />
              {fill(t.learn.presenting, { name: session.batch.teacher.name })}
            </span>
          )}
          <span className="timecode">
            {f.time(session.startsAt)}–{f.time(session.endsAt)}
          </span>
        </div>
      </div>
      <div className="flex flex-[0_1_320px] flex-col items-start gap-3.5">
        <span className="label-mono">{t.learn.runningFor}</span>
        <span className="timecode text-[clamp(2.5rem,4vw,3.5rem)] leading-none tracking-tight">{timecode(elapsed)}</span>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="ink" size="lg">
            <Link href={`/live/${session.id}`}>
              <Radio /> {t.learn.joinLive}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-ink text-ink hover:bg-ink/10">
            <Link href={`/live/${session.id}?devices=1`}>{t.learn.checkDevices}</Link>
          </Button>
        </div>
      </div>
      <SignalMark size={280} className="pointer-events-none absolute -end-16 -bottom-16 opacity-15" />
    </section>
  );
}

function NextTakeHero({ session }: { session: ScheduleItem }) {
  const { t, f, fill, pick, locale } = useI18n();
  const now = useNow();
  const secs = (new Date(session.startsAt).getTime() - now) / 1000;
  const lobbyOpen = secs <= 15 * 60;
  const course = pick(session.batch.course.titleEn, session.batch.course.titleAr).text;
  return (
    <section aria-labelledby="nexttake" className="flex flex-wrap items-end justify-between gap-8 rounded-[28px] border border-border bg-card p-[clamp(1.5rem,3vw,2.75rem)]">
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone={lobbyOpen ? 'sun' : 'sky'}>{t.learn.nextTake}</Chip>
          <span className="label-mono text-muted-foreground">
            {course} · <bdi dir="ltr">{session.batch.code}·{sessionCode(session.number)}</bdi>
          </span>
        </div>
        <h1 id="nexttake" className="font-display text-[clamp(3rem,6.5vw,6rem)] font-extrabold leading-[0.88]">
          {session.title}
        </h1>
        <span className="text-muted-foreground">{f.dateLong(session.startsAt)} · {f.time(session.startsAt)}</span>
      </div>
      <div className="flex flex-[0_1_320px] flex-col items-start gap-3.5">
        <span className="label-mono text-muted-foreground">{t.learn.startsIn}</span>
        <span className="timecode text-[clamp(2.5rem,4vw,3.5rem)] leading-none text-sun-fg">
          {secs >= 86400
            ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(secs / 86400), 'day')
            : timecode(Math.max(0, secs))}
        </span>
        {lobbyOpen ? (
          <Button asChild variant="onair" size="lg">
            <Link href={`/live/${session.id}`}>
              <Radio /> {t.learn.joinLive}
            </Link>
          </Button>
        ) : (
          <Button size="lg" disabled variant="secondary">
            {fill(t.learn.lobbyOpens, { t: f.time(new Date(new Date(session.startsAt).getTime() - 15 * 60000)) })}
          </Button>
        )}
      </div>
    </section>
  );
}

function EnrolledBatchCard({ enrollment }: { enrollment: Enrollment }) {
  const { t, f, fill, pick } = useI18n();
  const categoryLabel = useCategoryLabel();
  const b = enrollment.batch;
  const total = enrollment.progress.sessionsTotal || b.schedule?.sessionCount || 0;
  const done = enrollment.progress.sessionsDone;
  const pct = enrollment.progress.percent;
  const att = done ? Math.round((enrollment.progress.sessionsAttended / done) * 100) : undefined;
  const active = enrollment.status === 'ACTIVE';
  return (
    <article className="flex min-w-0 flex-wrap overflow-hidden rounded-xl border border-border bg-card">
      <CourseCover course={b.course} size="sm" showMeta={false} className="min-h-[220px] flex-[0_0_168px] rounded-none" />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <b className="font-display text-3xl font-extrabold leading-none" dir="ltr">
            {b.code}
          </b>
          {active ? <Chip tone="ivory">{t.status.batch[b.status]}</Chip> : <EnrollmentStatusChip status={enrollment.status} />}
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-mono text-muted-foreground">{categoryLabel(b.course)}</span>
          <b className="text-base">{pick(b.course.titleEn, b.course.titleAr).text}</b>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {describeRule(b, f)} · <bdi>{b.teacher.name}</bdi>
        </span>
        {active ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]">
                <span>{fill(t.learn.sessionsDone, { a: f.number(done), b: f.number(total) })}</span>
                {att !== undefined && <span className="text-muted-foreground">{fill(t.learn.attendance, { p: f.percent(att) })}</span>}
              </div>
              <div className="h-1.5 rounded-md bg-secondary">
                <div className="h-1.5 rounded-md bg-green" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <Link href={`/learn/classes/${b.id}`}>{t.comms.classPage.openClass}</Link>
              </Button>
              <MessageTeacherButton batchId={b.id} />
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-muted-foreground">{enrollment.nextSession ? fill(t.learn.next, { d: f.dateTime(enrollment.nextSession.startsAt) }) : ''}</span>
              <span className="flex items-center gap-3">
                <Link href={`/learn/courses/${b.course.id}`} className="link-sun">
                  {t.learning.lessons.open}
                </Link>
                <Link href={`/schedule?batch=${b.id}`} className="link-sun">
                  {t.learn.openBatch}
                </Link>
              </span>
            </div>
          </>
        ) : (
          <div className="mt-auto flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{t.learn.pendingEnrollment}</span>
            <Link href="/settings#orders" className="link-sun">
              {t.learn.viewOrder}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function DueSoon() {
  const { t, f, fill, pick } = useI18n();
  const q = useMyAssignments();
  const now = useNow(60_000);
  const due = q.data.filter((a) => !a.mySubmission && new Date(a.dueAt).getTime() > now - 86400_000).slice(0, 4);
  return (
    <Panel aria-labelledby="due">
      <SectionHeader title={<span id="due">{t.learn.dueSoon}</span>} href="/assignments" linkLabel={t.learn.allAssignments} />
      {q.isPending ? (
        <LoadingBlock rows={3} height={56} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : due.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.learn.noAssignments}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {due.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-3.5">
              <div className="min-w-0">
                <b className="block truncate text-[15px]">{a.title}</b>
                <span className="text-[13px] text-muted-foreground">
                  <bdi dir="ltr">{a.enrollment.batch.code}</bdi> · {pick(a.enrollment.batch.course.titleEn, a.enrollment.batch.course.titleAr).text}
                </span>
              </div>
              <Chip tone={new Date(a.dueAt).getTime() < now ? 'danger' : 'sun'}>{fill(t.assignments.due, { d: f.dayMonth(a.dueAt) })}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentRecordings() {
  const { t, f, pick } = useI18n();
  const q = useRecordings();
  return (
    <Panel aria-labelledby="recs">
      <SectionHeader title={<span id="recs">{t.learn.recordings}</span>} href="/library" linkLabel={t.learn.library} />
      <QueryView query={q} loading={<LoadingBlock rows={3} height={56} />} empty={<p className="text-sm text-muted-foreground">{t.learn.noRecordings}</p>}>
        {(list) => (
          <ul className="flex flex-col gap-2">
            {list.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link href={`/library/${r.id}`} className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3 no-underline hover:bg-accent">
                  <CourseCover course={r.batch.course} size="sm" showMeta={false} className="h-14 w-20 shrink-0 p-2 text-[10px] [&>span]:text-base" />
                  <div className="min-w-0">
                    <b className="block truncate text-[15px] text-foreground">{r.title}</b>
                    <span className="text-[13px] text-muted-foreground">
                      <bdi dir="ltr">
                        {r.batch.code}·{sessionCode(r.number)}
                      </bdi>{' '}
                      · {f.dayMonth(r.startsAt)} · {pick(r.batch.course.titleEn, r.batch.course.titleAr).text}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Panel>
  );
}
