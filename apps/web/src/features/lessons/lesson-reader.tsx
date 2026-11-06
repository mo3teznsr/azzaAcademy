'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Link2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseIntroVideo } from '@/components/brand/course-intro-video';
import { Markdown } from '@/components/brand/markdown';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { ApiError, learningApi, type CourseLessons, type Lesson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/** Module → lessons reader for enrolled students (also opens for the course's teachers and admins). */
export function LessonReader({ courseId, initialLessonId }: { courseId: string; initialLessonId?: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.lessons(courseId), queryFn: () => learningApi.lessons(courseId), retry: false });

  if (q.isPending) return <LoadingBlock rows={4} height={96} />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.isForbidden) {
      return <EmptyState title={t.learning.lessons.locked} body={t.learning.lessons.lockedBody} action={{ label: t.learning.lessons.backToLearn, href: '/learn' }} />;
    }
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  return <Reader data={q.data} initialLessonId={initialLessonId} />;
}

function Reader({ data, initialLessonId }: { data: CourseLessons; initialLessonId?: string }) {
  const { t, f, fill, pick } = useI18n();
  const router = useRouter();
  const flat = useMemo(() => data.modules.flatMap((m) => m.lessons), [data]);
  const [selected, setSelected] = useState<string | undefined>(() => (flat.some((l) => l.id === initialLessonId) ? initialLessonId : flat[0]?.id));
  const index = flat.findIndex((l) => l.id === selected);
  const lesson = flat[index];
  const course = pick(data.course.titleEn, data.course.titleAr).text;

  const go = (id: string) => {
    setSelected(id);
    router.replace(`?lesson=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6">
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
                            <span className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-green' : 'bg-border')} aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{pick(l.titleEn, l.titleAr).text}</span>
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
          {lesson && <LessonView key={lesson.id} lesson={lesson} position={index + 1} total={flat.length} prev={flat[index - 1]} next={flat[index + 1]} onGo={go} />}
        </div>
      )}
    </div>
  );
}

function LessonView({ lesson, position, total, prev, next, onGo }: { lesson: Lesson; position: number; total: number; prev?: Lesson; next?: Lesson; onGo: (id: string) => void }) {
  const { t, f, fill, pick, locale } = useI18n();
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
      <CourseIntroVideo url={lesson.videoUrl} title={title} />
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
      <footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
        {prev ? (
          <Button variant="outline" onClick={() => onGo(prev.id)}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden /> {t.learning.lessons.prev}
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button onClick={() => onGo(next.id)}>
            {t.learning.lessons.next} <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        )}
      </footer>
    </article>
  );
}
