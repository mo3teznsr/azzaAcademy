'use client';

import Link from 'next/link';
import { CourseCover } from '@/components/brand/course-cover';
import { useCategoryLabel } from '@/components/brand/category';
import { RatingInline } from '@/components/brand/rating';
import type { BlogCourse } from '@/lib/api/blog';
import { useI18n, useLocaleHref } from '@/lib/i18n/provider';

/** "Learn it properly": the post's related courses as cards (cover, category, title, level). */
export function RelatedCourses({ courses }: { courses: BlogCourse[] }) {
  const { t, pick } = useI18n();
  const href = useLocaleHref();
  const categoryLabel = useCategoryLabel();
  if (!courses.length) return null;
  return (
    <section aria-labelledby="related-courses" className="flex flex-col gap-6 border-t border-border pt-10">
      <div className="flex flex-col gap-2">
        <span className="label-mono text-muted-foreground">{t.blog.relatedKicker}</span>
        <h2 id="related-courses" className="font-display text-3xl font-extrabold">
          {t.blog.relatedTitle}
        </h2>
        <p className="text-muted-foreground">{t.blog.relatedIntro}</p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const title = pick(c.titleEn, c.titleAr);
          return (
            <li key={c.id}>
              <Link
                href={href(`/courses/${c.slug}`)}
                className="group flex h-full flex-col gap-4 rounded-[18px] border border-border bg-card p-3 no-underline transition-[translate,box-shadow] duration-300 ease-(--ease-expo) hover:-translate-y-1 hover:shadow-card"
              >
                <CourseCover course={c} showMeta={false} className="h-44" />
                <div className="flex flex-col gap-1.5 px-2 pb-2">
                  <span className="label-mono truncate text-muted-foreground">{categoryLabel(c)}</span>
                  <b className="text-lg leading-tight text-foreground">{title.text}</b>
                  {c.ratingCount > 0 && <RatingInline avg={c.ratingAvg} count={c.ratingCount} />}
                  <span className="text-sm text-muted-foreground">
                    {t.status.level[c.level]}
                    {c.type === 'RECORDED' && <> · {t.catalog.recordedMarker}</>}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
