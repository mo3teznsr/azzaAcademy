'use client';

import { useQuery } from '@tanstack/react-query';
import { testimonialsApi, type Testimonial } from '@/lib/api/blog';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

export const TESTIMONIAL_LIMIT = 6;

/** Featured testimonials for the landing page (no course) or one course page; the same key the server prefetches. */
export function useTestimonials(course?: string) {
  return useQuery({
    queryKey: qk.testimonials(course),
    // The raw `{ items }` response, as the server prefetch stores it.
    queryFn: () => testimonialsApi.list({ course, limit: TESTIMONIAL_LIMIT }),
    staleTime: 5 * 60_000,
  });
}

/**
 * A calm strip of real learner words: first name and course only, never stars, counts or invented text.
 * Renders nothing until an admin has featured a consented review.
 */
export function TestimonialsStrip({ course, className }: { course?: string; className?: string }) {
  const { t, pick, fill } = useI18n();
  const q = useTestimonials(course);
  const items = q.data?.items ?? [];
  if (!items.length) return null;
  const titleId = course ? 'course-testimonials-title' : 'testimonials-title';
  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col gap-8', className)}>
      <div className="flex flex-col gap-2">
        <span className="label-mono text-muted-foreground">{t.testimonials.kicker}</span>
        <h2 id={titleId} className={cn('font-display font-extrabold leading-none', course ? 'text-[44px]' : 'text-[clamp(40px,5.5vw,72px)]')}>
          {course ? t.testimonials.courseTitle : t.testimonials.title}
        </h2>
      </div>
      <ul className={cn('grid gap-5', items.length > 1 && 'md:grid-cols-2', items.length > 2 && 'lg:grid-cols-3')}>
        {items.map((it) => (
          <Quote key={it.id} item={it} attribution={fill(t.testimonials.attribution, { name: it.firstName, course: pick(it.course.titleEn, it.course.titleAr).text })} />
        ))}
      </ul>
    </section>
  );
}

function Quote({ item, attribution }: { item: Testimonial; attribution: string }) {
  return (
    <li className="flex">
      <figure className="flex w-full flex-col justify-between gap-6 rounded-[22px] border border-border bg-card p-6">
        <blockquote dir="auto" className="text-[17px] leading-[1.75] text-foreground">
          <p>{item.body}</p>
        </blockquote>
        <figcaption className="flex items-center gap-3 text-sm text-muted-foreground">
          <span aria-hidden className="size-2.5 shrink-0 rounded-[3px] bg-primary" />
          <span dir="auto">{attribution}</span>
        </figcaption>
      </figure>
    </li>
  );
}
