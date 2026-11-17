import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { LandingPage } from '@/features/landing/landing-page';
import { prefetchGet, seedCategories, serverQueryClient } from '@/lib/api/server';
import { qk } from '@/lib/query-keys';
import { getLocale } from '@/lib/i18n/server';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { SITE_URL, jsonLd, ogLocale, pageAlternates, pageUrl } from '@/lib/site';

/** schema.org `EducationalOrganization` for the home page (name, address and logo in search results). */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Azza',
  alternateName: 'عازة',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  areaServed: 'AE',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = locale === 'ar' ? ar : en;
  return {
    alternates: pageAlternates(locale, '/'),
    // Metadata merges shallowly: the page's Open Graph replaces the layout's, so it is complete here.
    openGraph: { type: 'website', siteName: locale === 'ar' ? 'عازة' : 'Azza', url: pageUrl(locale, '/'), locale: ogLocale(locale), title: t.meta.title, description: t.meta.description },
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Server-render the catalog (featured rail, course grid with next classes, categories) under the keys the
  // landing's client components read. A filtered URL (`?category=…`) is left to the browser.
  const queryClient = serverQueryClient();
  const filtered = Object.keys(await searchParams).length > 0;
  const featured = { featured: true, pageSize: 8 };
  const grid = { pageSize: 48, sort: 'newest' };
  await Promise.all([
    prefetchGet(queryClient, qk.courses(featured), '/api/v1/courses', featured),
    filtered ? null : prefetchGet(queryClient, qk.courses(grid), '/api/v1/courses', grid),
    prefetchGet(queryClient, qk.batches({ pageSize: 100 }), '/api/v1/batches', { pageSize: 100 }),
    seedCategories(queryClient),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ORGANIZATION) }} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <LandingPage />
      </HydrationBoundary>
    </>
  );
}
