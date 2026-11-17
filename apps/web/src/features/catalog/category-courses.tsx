'use client';

import Link from 'next/link';
import { CategoryIcon, useCategories } from '@/components/brand/category';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { useI18n, useLocaleHref } from '@/lib/i18n/provider';
import { CourseCard } from './course-card';
import { useCatalogCourses, usePublicBatches } from './use-catalog';

/** A category page's course grid and links to the other subjects (the heading is server-rendered by the page). */
export function CategoryCourses({ slug }: { slug: string }) {
  const { t, pick, f } = useI18n();
  const href = useLocaleHref();
  const courses = useCatalogCourses({ category: slug });
  const batches = usePublicBatches();
  const others = (useCategories().data ?? []).filter((c) => c.slug !== slug && c.courseCount > 0);
  const items = courses.data?.items ?? [];

  return (
    <div className="flex flex-col gap-14">
      {courses.isPending ? (
        <LoadingGrid count={6} height={380} />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t.categoryPage.emptyTitle} body={t.categoryPage.emptyBody} action={{ label: t.categoryPage.allCourses, href: href('/#catalog') }} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
          {items.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} batches={batches.byCourse.get(c.id) ?? []} />
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <nav aria-labelledby="other-subjects" className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 id="other-subjects" className="label-mono text-muted-foreground">
            {t.categoryPage.otherSubjects}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {others.map((c) => (
              <li key={c.slug}>
                <Link
                  href={href(`/categories/${encodeURIComponent(c.slug)}`)}
                  className="flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm text-foreground no-underline transition-colors hover:border-primary"
                >
                  <CategoryIcon name={c.icon} className="size-3.5" />
                  {pick(c.nameEn, c.nameAr).text}
                  <span className="font-mono text-[11px] text-muted-foreground">{f.number(c.courseCount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
