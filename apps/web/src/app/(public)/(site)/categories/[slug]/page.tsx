import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getCategories, prefetchGet, seedCategories, serverQueryClient } from '@/lib/api/server';
import type { Category, Course, Paged } from '@/lib/api/types';
import { qk } from '@/lib/query-keys';
import { getLocale } from '@/lib/i18n/server';
import { fill, makeFormatters } from '@/lib/i18n/format';
import { localePath } from '@/lib/i18n/routing';
import en from '@/lib/i18n/dictionaries/en';
import ar from '@/lib/i18n/dictionaries/ar';
import { jsonLd, ogLocale, pageAlternates, pageUrl } from '@/lib/site';
import { CategoryThumb } from '@/components/brand/category';
import { CategoryCourses } from '@/features/catalog/category-courses';

const pathOf = (slug: string) => `/categories/${encodeURIComponent(slug)}`;
const nameOf = (c: Category, locale: 'ar' | 'en') => (locale === 'ar' && c.nameAr?.trim()) || c.nameEn;

async function findCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [category, locale] = await Promise.all([findCategory(slug), getLocale()]);
  if (!category) return {};
  const t = locale === 'ar' ? ar : en;
  const name = nameOf(category, locale);
  const title = fill(t.categoryPage.metaTitle, { name });
  const description = fill(t.categoryPage.metaDescription, { name });
  return {
    title,
    description,
    alternates: pageAlternates(locale, pathOf(slug)),
    openGraph: { type: 'website', url: pageUrl(locale, pathOf(slug)), title, description, locale: ogLocale(locale) },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, locale] = await Promise.all([findCategory(slug), getLocale()]);
  if (!category) notFound();
  const t = locale === 'ar' ? ar : en;
  const f = makeFormatters(locale);
  const name = nameOf(category, locale);

  // Same keys as `CategoryCourses` (useCatalogCourses adds pageSize 48; usePublicBatches asks for 100).
  const queryClient = serverQueryClient();
  const coursesKey = { pageSize: 48, category: slug };
  await Promise.all([
    prefetchGet(queryClient, qk.courses(coursesKey), '/api/v1/courses', coursesKey),
    prefetchGet(queryClient, qk.batches({ pageSize: 100 }), '/api/v1/batches', { pageSize: 100 }),
    seedCategories(queryClient),
  ]);
  const courses = queryClient.getQueryData<Paged<Course>>(qk.courses(coursesKey))?.items ?? [];

  /** schema.org `ItemList` of the category's courses, in the page language. */
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: fill(t.categoryPage.title, { name }),
    url: pageUrl(locale, pathOf(slug)),
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: pageUrl(locale, `/courses/${encodeURIComponent(c.slug)}`),
      name: (locale === 'ar' && c.titleAr) || c.titleEn,
    })),
  };

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={localePath(locale, '/#catalog')} className="hover:text-foreground">
          {t.nav.public.courses}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">{name}</span>
      </nav>
      <header className="grid items-end gap-6 md:grid-cols-[auto_1fr]">
        <CategoryThumb category={category} className="size-24 rounded-[24px]" />
        <div className="flex min-w-0 flex-col gap-3">
          <span className="label-mono text-muted-foreground">
            {t.categoryPage.kicker} · {f.plural(category.courseCount, t.categoryPage.courses)}
          </span>
          <h1 className="font-display text-[clamp(44px,7vw,96px)] leading-[0.9] font-extrabold">{fill(t.categoryPage.title, { name })}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{fill(t.categoryPage.intro, { name })}</p>
        </div>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CategoryCourses slug={slug} />
      </HydrationBoundary>
    </div>
  );
}
