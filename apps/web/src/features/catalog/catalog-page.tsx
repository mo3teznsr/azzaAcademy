'use client';

import { useDeferredValue, useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { coursesApi } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { CategoryChips, FilterBar, toListParams, useCatalogFilters } from './catalog-filters';
import { CourseCard, CourseRail } from './course-card';
import { useCatalogCourses, usePublicBatches } from './use-catalog';

/*
 * The working catalog: the featured rail and the filterable grid (URL-synced filters, `#catalog`).
 * The landing page (features/landing) composes these; `Catalog` reads the URL, so render it under Suspense.
 */

/** Admin-picked courses (`featuredRank`), hidden when there are none. */
export function FeaturedRail() {
  const { t } = useI18n();
  const p = { featured: true, pageSize: 8 };
  const q = useQuery({ queryKey: qk.courses(p), queryFn: () => coursesApi.list(p) });
  const batches = usePublicBatches();
  if (!q.data?.items.length) return null;
  return (
    <section aria-labelledby="featured-title" className="flex flex-col gap-6">
      <div>
        <span className="section-kicker text-sun-fg">{t.catalog.featuredKicker}</span>
        <h2 id="featured-title" className="mt-2 font-display text-[clamp(40px,5vw,64px)] font-extrabold leading-[0.9]">
          {t.catalog.featuredTitle}
        </h2>
      </div>
      <CourseRail courses={q.data.items} byCourse={batches.byCourse} />
    </section>
  );
}

export function Catalog() {
  const { t } = useI18n();
  const api = useCatalogFilters();
  const params = useDeferredValue(useMemo(() => toListParams(api.filters), [api.filters]));
  const courses = useCatalogCourses(params);
  const batches = usePublicBatches();
  const items = courses.data?.items ?? [];

  return (
    <section id="catalog" aria-labelledby="catalog-title" className="flex scroll-mt-8 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="catalog-title" className="font-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[0.9]">
          {t.catalog.catalogTitle}
        </h2>
        <label className="flex h-12 w-full max-w-sm items-center gap-2.5 rounded-full border border-border bg-card px-4 text-muted-foreground">
          <Search className="size-5" />
          <span className="sr-only">{t.catalog.searchPlaceholder}</span>
          <input
            type="search"
            value={api.filters.q}
            onChange={(e) => api.set({ q: e.target.value })}
            placeholder={t.catalog.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <CategoryChips api={api} />
      <FilterBar api={api} />
      {courses.isPending ? (
        <LoadingGrid count={6} height={380} />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t.catalog.emptyTitle} body={t.catalog.emptyBody} action={api.anyActive ? { label: t.catalog.clearFilters, onClick: api.clear } : undefined} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
          {items.map((c, i) => (
            <li key={c.id} className="catalog-item" style={{ '--i': i } as CSSProperties}>
              <CourseCard course={c} batches={batches.byCourse.get(c.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
