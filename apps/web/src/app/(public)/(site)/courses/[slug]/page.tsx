import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { mediaUrl } from '@/lib/api/client';
import { getCourse, prefetchGet, publicGet, seedCategories, serverQueryClient } from '@/lib/api/server';
import type { BatchSummary, Course, Paged } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { getLocale } from '@/lib/i18n/server';
import { SITE_URL, jsonLd, ogLocale, pageAlternates, pageUrl } from '@/lib/site';
import { CourseDetail } from '@/features/course/course-detail';

/** The course's title and description in the page language (Arabic falls back to English when missing). */
function textOf(c: Course, locale: 'ar' | 'en') {
  const ar = locale === 'ar';
  const title = (ar && c.titleAr) || c.titleEn;
  const description = ((ar && c.descriptionAr) || c.descriptionEn).replace(/\s+/g, ' ').trim().slice(0, 200) || undefined;
  return { title, description };
}

const pathOf = (c: Course) => `/courses/${encodeURIComponent(c.slug)}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [c, locale] = await Promise.all([getCourse(slug), getLocale()]);
  if (!c) return {};
  const { title, description } = textOf(c, locale);
  // Absolute (API or CDN origin): course media is not served by the web app.
  const image = mediaUrl(c.coverImageUrl);
  const url = pageUrl(locale, pathOf(c));
  return {
    title,
    description,
    alternates: pageAlternates(locale, pathOf(c)),
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      locale: ogLocale(locale),
      ...(image && { images: [{ url: image, alt: title }] }),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image && { images: [image] }) },
  };
}

/** schema.org `Course` (with its rating and upcoming classes) and `FAQPage`, so search results can show the course, its stars and its questions. */
function structuredData(c: Course, batches: BatchSummary[], locale: 'ar' | 'en') {
  const { title, description } = textOf(c, locale);
  const url = pageUrl(locale, pathOf(c));
  const image = mediaUrl(c.coverImageUrl);
  const ar = locale === 'ar';
  const instances = batches.length
    ? batches.map((b) => ({
        '@type': 'CourseInstance',
        courseMode: 'online',
        startDate: b.startsOn,
        endDate: b.endsOn,
        inLanguage: b.language === 'AR' ? 'ar' : 'en',
        instructor: { '@type': 'Person', name: b.teacher.name },
      }))
    : { '@type': 'CourseInstance', courseMode: 'online' };
  const course = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: description ?? title,
    url,
    inLanguage: ar ? 'ar' : 'en',
    ...(image && { image }),
    provider: { '@type': 'Organization', name: ar ? 'عازة' : 'Azza', sameAs: SITE_URL },
    hasCourseInstance: instances,
    ...(c.ratingCount > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(c.ratingAvg.toFixed(1)), ratingCount: c.ratingCount, bestRating: 5, worstRating: 1 },
    }),
  };
  const faq = c.faq
    .map((f) => ({ q: (ar && f.qAr) || f.qEn, a: (ar && f.aAr) || f.aEn }))
    .filter((f) => f.q && f.a);
  return [
    course,
    ...(faq.length
      ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
      : []),
  ];
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, locale] = await Promise.all([getCourse(slug), getLocale()]);
  const published = course?.status === 'PUBLISHED' ? course : null;

  // Server-render the course and its classes (title, outcomes, FAQ, teacher, dates) with the same query keys
  // `CourseDetail` reads, so the HTML carries the content and the browser starts from it without refetching.
  const queryClient = serverQueryClient();
  let batches: BatchSummary[] = [];
  await seedCategories(queryClient);
  if (published) {
    queryClient.setQueryData(qk.course(slug), published);
    await prefetchGet(queryClient, qk.testimonials(published.slug), '/api/v1/testimonials', { course: published.slug, limit: 6 });
    if (published.type === 'LIVE') {
      const p = { courseId: published.id, pageSize: 50 };
      await queryClient.prefetchQuery({ queryKey: qk.batches(p), queryFn: () => publicGet<Paged<BatchSummary>>('/api/v1/batches', p) });
      batches = queryClient.getQueryData<Paged<BatchSummary>>(qk.batches(p))?.items ?? [];
    }
  }

  return (
    <>
      {published && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(published, batches, locale)) }} />}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <CourseDetail slug={slug} />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
