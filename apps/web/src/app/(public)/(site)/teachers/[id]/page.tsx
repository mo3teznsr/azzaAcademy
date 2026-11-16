import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { mediaUrl } from '@/lib/api/client';
import { getTeacher, seedCategories, serverQueryClient } from '@/lib/api/server';
import { qk } from '@/lib/query-keys';
import { getLocale } from '@/lib/i18n/server';
import { SITE_URL, jsonLd, ogLocale, pageAlternates, pageUrl } from '@/lib/site';
import { TeacherProfile } from '@/features/teachers/teacher-profile';

const pathOf = (id: string) => `/teachers/${encodeURIComponent(id)}`;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [p, locale] = await Promise.all([getTeacher(id), getLocale()]);
  if (!p) return {};
  const image = mediaUrl(p.image);
  const description = p.headline ?? p.bio?.slice(0, 200) ?? undefined;
  return {
    title: p.name,
    description,
    alternates: pageAlternates(locale, pathOf(p.id)),
    openGraph: { type: 'profile', url: pageUrl(locale, pathOf(p.id)), title: p.name, description, locale: ogLocale(locale), ...(image && { images: [{ url: image, alt: p.name }] }) },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, locale] = await Promise.all([getTeacher(id), getLocale()]);
  const image = p && mediaUrl(p.image);
  // Server-render the profile (name, bio, courses, upcoming classes) under the key `TeacherProfile` reads.
  const queryClient = serverQueryClient();
  if (p) queryClient.setQueryData(qk.teacher(id), p);
  await seedCategories(queryClient);
  return (
    <>
      {p && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: p.name,
              url: pageUrl(locale, pathOf(p.id)),
              ...(p.headline && { jobTitle: p.headline }),
              ...(p.bio && { description: p.bio.slice(0, 500) }),
              ...(image && { image }),
              worksFor: { '@type': 'Organization', name: locale === 'ar' ? 'عازة' : 'Azza', url: SITE_URL },
            }),
          }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TeacherProfile id={id} />
      </HydrationBoundary>
    </>
  );
}
