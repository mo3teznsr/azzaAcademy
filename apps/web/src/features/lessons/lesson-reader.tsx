'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, CircleCheck, Link2, Lock, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CourseIntroVideo, type VideoResume } from '@/components/brand/course-intro-video';
import { Markdown } from '@/components/brand/markdown';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, learningApi, subscriptionsApi, type CourseLessons, type Lesson, type LessonProgress } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { LockedLessonPanel } from '../subscriptions/locked-panel';
import { PlanBanner } from '../subscriptions/plan-banner';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** Module → lessons reader for enrolled students (also opens for the course's teachers and admins). */
export function LessonReader({ courseId, initialLessonId }: { courseId: string; initialLessonId?: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.lessons(courseId), queryFn: () => learningApi.lessons(courseId), retry: false });

  if (q.isPending) return <LoadingBlock rows={4} height={96} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.isForbidden) {
      const d = (q.error.details ?? {}) as { courseSlug?: string; lapsed?: boolean };
      // A recorded course without a plan: back to its plans, not a dead end.
      if (q.error.code === 'PLAN_REQUIRED') {
        if (d.courseSlug) return <LockedLessonPanel slug={d.courseSlug} lapsed={!!d.lapsed} />;
        return <EmptyState title={t.recorded.lockedTitle} body={d.lapsed ? t.recorded.lockedLapsed : t.recorded.lockedBody} action={{ label: t.recorded.seePlans, href: '/plans' }} />;
      }
      return <EmptyState title={t.learning.lessons.locked} body={t.learning.lessons.lockedBody} action={{ label: t.learning.lessons.backToLearn, href: '/learn' }} />;
    }
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <Reader courseKey={courseId} data={q.data} initialLessonId={initialLessonId} />;
}

/** The lessons with one lesson's `completed` flipped, and `progress` recomputed the way the API does (module order, then lesson order). */
function withCompletion(data: CourseLessons, lessonId: string, completed: boolean): CourseLessons {
  const modules = data.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l)) }));
  const rows = modules.flatMap((m) => m.lessons.map((l) => ({ l, m })));
  const next = rows.find((r) => !r.l.completed);
  return {
    ...data,
    modules,
    progress: {
      completed: rows.filter((r) => r.l.completed).length,
      total: rows.length,
      nextLesson: next ? { id: next.l.id, titleEn: next.l.titleEn, titleAr: next.l.titleAr, moduleId: next.m.id, moduleTitleEn: next.m.titleEn, moduleTitleAr: next.m.titleAr } : null,
    },
  };
}

/** Toggles a lesson's completion with an optimistic update; rolls back on error and refreshes progress everywhere once settled. */
function useLessonCompletion(courseKey: string) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const queryKey = qk.lessons(courseKey);
  const mutationKey = ['lesson-complete', courseKey];
  return useMutation({
    mutationKey,
    mutationFn: ({ lessonId, completed }: { lessonId: string; completed: boolean }) => learningApi.setLessonComplete(lessonId, completed),
    onMutate: async ({ lessonId, completed }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CourseLessons>(queryKey);
      if (previous) qc.setQueryData<CourseLessons>(queryKey, withCompletion(previous, lessonId, completed));
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(t.learning.lessons.completeError);
    },
    onSettled: () => {
      // Refetch once the last of several quick toggles lands, so an older response can't overwrite a newer optimistic state.
      if (qc.isMutating({ mutationKey }) > 1) return;
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: qk.learningProgress });
    },
  });
}

function Reader({ courseKey, data, initialLessonId }: { courseKey: string; data: CourseLessons; initialLessonId?: string }) {
  const { t, f, fill, pick } = useI18n();
  const router = useRouter();
  const flat = useMemo(() => data.modules.flatMap((m) => m.lessons), [data]);
  // Open the requested lesson, else resume at the first one not done yet.
  const [selected, setSelected] = useState<string | undefined>(() => (flat.some((l) => l.id === initialLessonId) ? initialLessonId : (data.progress.nextLesson?.id ?? flat[0]?.id)));
  const index = flat.findIndex((l) => l.id === selected);
  const lesson = flat[index];
  const course = pick(data.course.titleEn, data.course.titleAr).text;
  const completion = useLessonCompletion(courseKey);
  const { completed: doneCount, total } = data.progress;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const progressText = fill(t.learning.lessons.progress, { a: f.number(doneCount), b: f.number(total) });
  // After this lesson: the next one not done yet (else the course's first open lesson), and whether it closes its module.
  const upNext = flat.slice(index + 1).find((l) => !l.completed) ?? flat.find((l) => l.id === data.progress.nextLesson?.id && l.id !== selected);
  const moduleLessons = data.modules.find((m) => m.id === lesson?.moduleId)?.lessons ?? [];
  const lastInModule = !!lesson && moduleLessons[moduleLessons.length - 1]?.id === lesson.id;
  // Recorded courses: the plan banner (payment failed, or ending) and whether a locked lesson is a lapsed plan.
  const recorded = data.course.type === 'RECORDED';
  const subs = useQuery({ queryKey: qk.mySubscriptions, queryFn: subscriptionsApi.mine, enabled: recorded, retry: false });
  const planRow = subs.data?.find((s) => s.course.id === data.course.id && s.status !== 'INCOMPLETE') ?? null;
  const lapsedRow = planRow && !planRow.hasAccess ? planRow : null;

  const go = (id: string) => {
    setSelected(id);
    router.replace(`?lesson=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6">
      {recorded && <PlanBanner subscription={planRow} />}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground">
          {t.learning.lessons.backToLearn}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">{course}</span>
      </nav>
      {flat.length === 0 ? (
        <EmptyState title={t.learning.lessons.empty} body={t.learning.lessons.emptyBody} />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside aria-label={t.learning.lessons.contents} className="flex flex-col gap-5 lg:sticky lg:top-24">
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-sm">{t.learning.lessons.progressLabel}</b>
                <span className="timecode text-xs text-muted-foreground">{f.percent(pct)}</span>
              </div>
              {/* Radix moves the indicator with translateX, so mirror the bar to fill from the start side in RTL. */}
              <Progress value={pct} aria-label={t.learning.lessons.progressLabel} aria-valuetext={progressText} className="h-1.5 rtl:-scale-x-100 [&_[data-slot=progress-indicator]]:bg-green" />
              <span className="text-[13px] text-muted-foreground" aria-live="polite">
                {progressText}
              </span>
            </div>
            {data.modules.map((m, mi) => (
              <section key={m.id} className="flex flex-col gap-1.5">
                <span className="label-mono text-muted-foreground">{fill(t.learning.lessons.module, { n: f.number(mi + 1) })}</span>
                <b className="text-[15px]">{pick(m.titleEn, m.titleAr).text}</b>
                {m.lessons.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">{t.learning.lessons.noModuleLessons}</span>
                ) : (
                  <ol className="flex flex-col">
                    {m.lessons.map((l) => {
                      const active = l.id === selected;
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => go(l.id)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-start text-sm transition-colors hover:bg-accent',
                              active && 'bg-accent font-bold text-foreground',
                            )}
                          >
                            {l.locked ? (
                              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            ) : l.completed ? (
                              <CircleCheck className="size-4 shrink-0 text-sun-fg" aria-hidden />
                            ) : (
                              <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
                                <span className={cn('size-1.5 rounded-full', active ? 'bg-green' : 'bg-border')} />
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate">{pick(l.titleEn, l.titleAr).text}</span>
                            {l.completed && <span className="sr-only">{t.learning.lessons.doneSr}</span>}
                            {l.locked && <span className="sr-only">{t.recorded.lockedSr}</span>}
                            {l.videoUrl && <PlayCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            ))}
          </aside>
          {lesson?.locked ? (
            <LockedLessonPanel slug={data.course.slug} lapsed={!!lapsedRow} embedded />
          ) : (
            lesson && (
              <LessonView
                key={lesson.id}
                courseId={data.course.id}
                recorded={recorded}
                lesson={lesson}
                position={index + 1}
                total={flat.length}
                prev={flat[index - 1]}
                next={flat[index + 1]}
                upNext={upNext}
                lastInModule={lastInModule}
                progress={data.progress}
                onGo={go}
                onToggle={(completed) => completion.mutate({ lessonId: lesson.id, completed })}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function LessonView({
  courseId,
  recorded,
  lesson,
  position,
  total,
  prev,
  next,
  upNext,
  lastInModule,
  progress,
  onGo,
  onToggle,
}: {
  courseId: string;
  recorded: boolean;
  lesson: Lesson;
  position: number;
  total: number;
  prev?: Lesson;
  next?: Lesson;
  upNext?: Lesson;
  lastInModule: boolean;
  progress: LessonProgress;
  onGo: (id: string) => void;
  onToggle: (completed: boolean) => void;
}) {
  const { t, f, fill, pick, locale } = useI18n();
  const completed = !!lesson.completed;
  // Recorded lessons remember where the viewer stopped (the list payload may not carry it, so ask for the lesson).
  const saved = useQuery({ queryKey: ['lesson', lesson.id], queryFn: () => learningApi.lesson(lesson.id), enabled: recorded && !!lesson.videoUrl, staleTime: 0, gcTime: 0, retry: false });
  // Always the fresh value from the server; the video waits for it (or its failure) so it never seeks from a cached spot.
  const startSec = saved.data?.videoPositionSec ?? 0;
  const positionReady = !recorded || !lesson.videoUrl || !saved.isPending;
  const resume = useMemo<VideoResume | undefined>(
    () =>
      recorded
        ? {
            startSec,
            onSave: (sec) => void learningApi.saveVideoPosition(lesson.id, sec).catch(() => undefined),
            onExit: (sec) => learningApi.saveVideoPositionOnExit(lesson.id, sec),
          }
        : undefined,
    [recorded, startSec, lesson.id],
  );
  const [announce, setAnnounce] = useState('');
  const toggle = () => {
    onToggle(!completed);
    setAnnounce(completed ? t.learning.lessons.markedIncomplete : t.learning.lessons.markedComplete);
  };
  const title = pick(lesson.titleEn, lesson.titleAr).text;
  const body = pick(lesson.bodyEn || null, lesson.bodyAr);
  // Text in the other language keeps its own direction.
  const bodyDir = locale === 'ar' ? (body.fallback ? 'ltr' : 'rtl') : body.fallback ? 'rtl' : 'ltr';
  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="label-mono text-muted-foreground">{fill(t.learning.lessons.lessonOf, { a: f.number(position), b: f.number(total) })}</span>
        <h1 className="font-display text-4xl font-extrabold leading-tight">{title}</h1>
      </header>
      {positionReady ? <CourseIntroVideo url={lesson.videoUrl} title={title} resume={resume} /> : <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" aria-hidden />}
      {body.text.trim() ? (
        <Markdown source={body.text} dir={bodyDir} className="max-w-[70ch]" />
      ) : (
        <p className="text-sm text-muted-foreground">{t.learning.lessons.noBody}</p>
      )}
      {lesson.attachments.length > 0 && (
        <section aria-labelledby={`att-${lesson.id}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
          <h2 id={`att-${lesson.id}`} className="font-bold">
            {t.learning.lessons.attachments}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {lesson.attachments.map((a, i) => (
              <li key={i}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="link-sun inline-flex items-center gap-2 text-sm">
                  <Link2 className="size-4" aria-hidden /> {a.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label={t.learning.lessons.finishLabel} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{completed ? t.learning.lessons.completedHint : t.learning.lessons.finishHint}</p>
          <Button variant={completed ? 'outline' : 'default'} aria-pressed={completed} onClick={toggle}>
            {completed ? <CircleCheck className="text-sun-fg" aria-hidden /> : <Check aria-hidden />}
            {completed ? t.learning.lessons.completed : t.learning.lessons.markComplete}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
        {completed && <NextStep courseId={courseId} lesson={lesson} upNext={upNext} lastInModule={lastInModule} progress={progress} onGo={onGo} />}
      </section>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
        {prev ? (
          <Button variant="outline" onClick={() => onGo(prev.id)}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.learning.lessons.prev}
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button variant={completed ? 'outline' : 'default'} onClick={() => onGo(next.id)}>
            {t.learning.lessons.next} <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        )}
      </footer>
    </article>
  );
}

/** What to do after finishing a lesson: the module's quiz when one is open, else the next lesson; at 100% the course is done. */
function NextStep({
  courseId,
  lesson,
  upNext,
  lastInModule,
  progress,
  onGo,
}: {
  courseId: string;
  lesson: Lesson;
  upNext?: Lesson;
  lastInModule: boolean;
  progress: LessonProgress;
  onGo: (id: string) => void;
}) {
  const { t, pick } = useI18n();
  const courseDone = progress.total > 0 && progress.completed >= progress.total;
  // Quizzes belong to a class; a student's open ones carry the course and module they practise.
  const quizzes = useQuery({ queryKey: qk.myQuizzes, queryFn: learningApi.myQuizzes, enabled: lastInModule && !courseDone, retry: false });
  const quiz = quizzes.data?.find((q) => q.batch.course.id === courseId && q.moduleId === lesson.moduleId && (q.mine.status === 'OPEN' || q.mine.status === 'IN_PROGRESS'));

  if (courseDone) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <h2 className="font-display text-2xl font-extrabold">{t.learning.lessons.courseComplete}</h2>
        <p className="max-w-[60ch] text-sm text-muted-foreground">{t.learning.lessons.courseCompleteBody}</p>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="sun">
            <Link href="/certificates">{t.learning.lessons.certificateRules}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/quizzes">{t.learning.lessons.practice}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (quiz) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <span className="label-mono text-muted-foreground">{t.learning.lessons.upNext}</span>
        <div className="flex flex-col gap-1">
          <b className="text-base">{t.learning.lessons.moduleQuiz}</b>
          <span className="text-sm text-muted-foreground">{quiz.title}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href={`/quizzes/${quiz.id}`}>{t.learning.lessons.takeQuiz}</Link>
          </Button>
          {upNext && (
            <Button variant="outline" onClick={() => onGo(upNext.id)}>
              {t.learning.lessons.next} <ChevronRight className="rtl:rotate-180" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!upNext) return null;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="label-mono text-muted-foreground">{t.learning.lessons.upNext}</span>
        <b className="truncate text-base">{pick(upNext.titleEn, upNext.titleAr).text}</b>
      </div>
      <Button onClick={() => onGo(upNext.id)}>
        {t.learning.lessons.next} <ChevronRight className="rtl:rotate-180" aria-hidden />
      </Button>
    </div>
  );
}
