import type { Metadata } from 'next';
import { Suspense } from 'react';
import { API_URL, mediaUrl } from '@/lib/api/client';
import type { Course } from '@/lib/api/types';
import { CourseDetail } from '@/features/course/course-detail';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/api/v1/courses/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (!res.ok) return {};
    const c = (await res.json()) as Course;
    const description = c.descriptionEn.slice(0, 200) || undefined;
    // Absolute (API origin) — the app sets no `metadataBase`, so relative OG URLs would not resolve.
    const image = mediaUrl(c.coverImageUrl);
    return {
      title: c.titleEn,
      description,
      openGraph: {
        type: 'website',
        title: c.titleEn,
        description,
        ...(image && { images: [{ url: image, alt: c.titleEn }] }),
      },
      twitter: { card: image ? 'summary_large_image' : 'summary', title: c.titleEn, description, ...(image && { images: [image] }) },
    };
  } catch {
    return {};
  }
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <CourseDetail slug={slug} />
    </Suspense>
  );
}
