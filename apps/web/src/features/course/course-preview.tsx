'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseIntroVideo } from '@/components/brand/course-intro-video';
import { Markdown } from '@/components/brand/markdown';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { coursesApi, learningApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';

/** The one lesson of a recorded course anyone can watch, signed in or not. */
export function CoursePreview({ slug }: { slug: string }) {
  const { t, pick, locale } = useI18n();
  const course = useQuery({ queryKey: qk.course(slug), queryFn: () => coursesApi.get(slug) });
  const lessonId = course.data?.previewLessonId ?? null;
  const lesson = useQuery({ queryKey: ['lesson-preview', lessonId], queryFn: () => learningApi.previewLesson(lessonId!), enabled: !!lessonId, retry: false });
  const wrap = 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 sm:px-6';

  if (course.isPending || (lessonId && lesson.isPending))
    return (
      <div className={wrap}>
        <LoadingBlock rows={3} height={140} />
      </div>
    );
  if (course.isError)
    return (
      <div className={wrap}>
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </div>
    );
  const c = course.data;
  const courseTitle = pick(c.titleEn, c.titleAr).text;
  if (!lessonId || lesson.isError || !lesson.data)
    return (
      <div className={wrap}>
        <EmptyState title={t.course.notFound} action={{ label: t.recorded.previewBack, href: `/courses/${c.slug}` }} />
      </div>
    );
  const l = lesson.data;
  const title = pick(l.titleEn, l.titleAr).text;
  const body = pick(l.bodyEn || null, l.bodyAr);
  const bodyDir = locale === 'ar' ? (body.fallback ? 'ltr' : 'rtl') : body.fallback ? 'rtl' : 'ltr';
  return (
    <article className={wrap}>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/courses/${c.slug}`} className="hover:text-foreground">
          {courseTitle}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">{t.recorded.previewTitle}</span>
      </nav>
      <header className="flex flex-col gap-2">
        <span className="label-mono text-muted-foreground">{t.recorded.previewTitle}</span>
        <h1 className="font-display text-[clamp(32px,5vw,48px)] font-extrabold leading-tight">{title}</h1>
      </header>
      <CourseIntroVideo url={l.videoUrl} title={title} />
      {body.text.trim() && <Markdown source={body.text} dir={bodyDir} className="max-w-[70ch]" />}
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5">
        <b className="text-lg">{t.recorded.tagline}</b>
        <Button asChild size="lg">
          <Link href={`/courses/${c.slug}#plan`}>{t.recorded.previewCta}</Link>
        </Button>
      </div>
    </article>
  );
}
