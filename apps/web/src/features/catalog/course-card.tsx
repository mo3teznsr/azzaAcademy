'use client';

import Link from 'next/link';
import { CourseCover } from '@/components/brand/course-cover';
import { useCategoryLabel } from '@/components/brand/category';
import { RatingInline } from '@/components/brand/rating';
import { useI18n } from '@/lib/i18n/provider';
import { Price } from '@/components/brand/price';
import { batchPriceFils } from '@/lib/schedule';
import type { BatchSummary, Course } from '@/lib/api/types';
import { SaveToggle } from '../saved/use-saved';

/** Catalog card: cover, category, rating, next batch and the lowest price. The heart sits outside the link. */
export function CourseCard({ course, batches }: { course: Course; batches: BatchSummary[] }) {
  const { t, f, pick } = useI18n();
  const categoryLabel = useCategoryLabel();
  const title = pick(course.titleEn, course.titleAr);
  const next = batches.find((b) => b.status === 'ENROLLING') ?? batches[0];
  // "From" = the lowest listed batch price; the course's own derived price when no batches came with it.
  const recorded = course.type === 'RECORDED';
  const minPrice = recorded ? (course.monthlyPriceFils ?? course.priceFils) : batches.length ? Math.min(...batches.map(batchPriceFils)) : course.priceFils;
  return (
    <article className="group relative h-full">
      <Link href={`/courses/${course.slug}`} className="flex h-full flex-col gap-4 rounded-[18px] border border-border bg-card p-3 no-underline transition-[translate,box-shadow] duration-300 ease-(--ease-expo) group-hover:-translate-y-1 group-hover:shadow-card">
        <CourseCover course={course} showMeta={false} className="h-56" />
        <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="label-mono truncate text-muted-foreground">{categoryLabel(course)}</span>
            {recorded ? (
              <span className="label-mono shrink-0 rounded-full bg-sage px-2.5 py-1 text-ink">{t.catalog.recordedMarker}</span>
            ) : (
              <span className="label-mono shrink-0 rounded-full border border-border px-2.5 py-1 text-muted-foreground">{f.plural(batches.length, t.catalog.batches)}</span>
            )}
          </div>
          <b className="text-lg leading-tight text-foreground">{title.text}</b>
          {title.fallback && <span className="label-mono text-muted-foreground">{t.common.englishOnly}</span>}
          {course.ratingCount > 0 && <RatingInline avg={course.ratingAvg} count={course.ratingCount} />}
          <span className="text-sm text-muted-foreground">
            {t.status.level[course.level]}
            {!recorded && <> · {f.plural(course.modules.length || (next?.schedule?.sessionCount ?? 0), t.common.sessions)}</>}
          </span>
          <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3 text-sm">
            {recorded ? (
              <span className="min-w-0 text-foreground">{t.catalog.startAnyTime}</span>
            ) : (
              <span className="text-muted-foreground">
                <span className="label-mono block">{t.catalog.nextBatch}</span>
                <span className="text-foreground">{next ? `${next.code} · ${f.dayMonth(next.startsOn, next.timezone)}` : t.catalog.noUpcoming}</span>
              </span>
            )}
            {minPrice === null ? (
              <span className="text-end text-muted-foreground">{t.money.noOpenBatches}</span>
            ) : (
              <span className="text-end text-muted-foreground">
                {t.catalog.from}
                <Price fils={minPrice} compact align="end" className="flex text-base font-bold text-foreground" />
                {recorded && <span className="text-xs"> / {t.catalog.perMonth}</span>}
              </span>
            )}
          </div>
        </div>
      </Link>
      <SaveToggle course={course} className="absolute end-5 top-5 rounded-full border-transparent bg-background/85 backdrop-blur-sm transition-transform group-hover:-translate-y-1" />
    </article>
  );
}

/** Horizontal rail of course cards (featured, related, saved). */
export function CourseRail({ courses, byCourse }: { courses: Course[]; byCourse: Map<string, BatchSummary[]> }) {
  return (
    <ul className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2">
      {courses.map((c) => (
        <li key={c.id} className="w-[min(85vw,320px)] shrink-0 snap-start">
          <CourseCard course={c} batches={byCourse.get(c.id) ?? []} />
        </li>
      ))}
    </ul>
  );
}
