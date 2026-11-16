import type { Metadata } from 'next';
import { Suspense } from 'react';
import { API_URL, mediaUrl } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';
import { getLocale } from '@/lib/i18n/server';
import { SITE_URL, jsonLd } from '@/lib/site';
import { CourseDetail } from '@/features/course/course-detail';

async function loadCourse(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/courses/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as Course) : null;
  } catch {
    return null;
  }
}

/** The course's title and description in the page language (Arabic falls back to English when missing). */
function textOf(c: Course, locale: 'ar' | 'en') {
  const ar = locale === 'ar';
  const title = (ar && c.titleAr) || c.titleEn;
  const description = ((ar && c.descriptionAr) || c.descriptionEn).replace(/\s+/g, ' ').trim().slice(0, 200) || undefined;
  return { title, description };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadCourse(slug);
  if (!c) return {};
  const { title, description } = textOf(c, await getLocale());
  // Absolute (API or CDN origin): course media is not served by the web app.
  const image = mediaUrl(c.coverImageUrl);
  const url = `${SITE_URL}/courses/${encodeURIComponent(c.slug)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      ...(image && { images: [{ url: image, alt: title }] }),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image && { images: [image] }) },
  };
}

/** schema.org `Course` (with its rating) and `FAQPage`, so search results can show the course, its stars and its questions. */
function structuredData(c: Course, locale: 'ar' | 'en') {
  const { title, description } = textOf(c, locale);
  const url = `${SITE_URL}/courses/${encodeURIComponent(c.slug)}`;
  const image = mediaUrl(c.coverImageUrl);
  const ar = locale === 'ar';
  const course = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: description ?? title,
    url,
    inLanguage: ar ? 'ar' : 'en',
    ...(image && { image }),
    provider: { '@type': 'Organization', name: ar ? 'عازة' : 'Azza', sameAs: SITE_URL },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
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
  const [course, locale] = await Promise.all([loadCourse(slug), getLocale()]);
  return (
    <>
      {course && course.status === 'PUBLISHED' && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(course, locale)) }} />
      )}
      <Suspense>
        <CourseDetail slug={slug} />
      </Suspense>
    </>
  );
}
