import type { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api/client';
import { LOCALES } from '@/lib/i18n/routing';
import { SITE_URL, languageUrls, pageUrl } from '@/lib/site';

// Rebuilt at most once an hour.
export const revalidate = 3600;

type Listed = { slug: string; updatedAt?: string };
type Entry = MetadataRoute.Sitemap[number];

async function publishedCourses(): Promise<Listed[]> {
  const out: Listed[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${API_URL}/api/v1/courses?page=${page}&pageSize=100`, { next: { revalidate } }).catch(() => null);
    if (!res?.ok) break;
    const body = (await res.json()) as { items: Listed[]; pageCount?: number };
    out.push(...body.items);
    if (!body.pageCount || page >= body.pageCount) break;
  }
  return out;
}

async function list<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } }).catch(() => null);
  if (!res?.ok) return [];
  return ((await res.json()) as { items: T[] }).items;
}

/** One entry per language (`/ar/...` and `/en/...`), each listing every language version for hreflang. */
function localized(path: string, extra: Omit<Entry, 'url' | 'alternates'>): Entry[] {
  const languages = languageUrls(path);
  return LOCALES.map((locale) => ({ url: pageUrl(locale, path), alternates: { languages }, ...extra }));
}

/** Public pages, every category, published course and teacher profile, in Arabic and English. The API being down still yields the static pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, people, categories, posts] = await Promise.all([
    publishedCourses(),
    list<{ id: string }>('/api/v1/teachers'),
    list<{ slug: string; courseCount: number }>('/api/v1/categories'),
    list<{ slug: string; updatedAt: string; hasEn: boolean }>('/api/v1/blog/sitemap'),
  ]);
  return [
    ...localized('/', { changeFrequency: 'daily', priority: 1 }),
    ...localized('/teachers', { changeFrequency: 'weekly', priority: 0.6 }),
    ...localized('/teach', { changeFrequency: 'monthly', priority: 0.5 }),
    ...localized('/blog', { changeFrequency: 'weekly', priority: 0.6 }),
    // Arabic-only posts have just the Arabic URL (their English URL's canonical points to it).
    ...posts.flatMap((p) => {
      const path = `/blog/${encodeURIComponent(p.slug)}`;
      const extra = { lastModified: new Date(p.updatedAt), changeFrequency: 'monthly' as const, priority: 0.6 };
      if (p.hasEn) return localized(path, extra);
      const ar = pageUrl('ar', path);
      return [{ url: ar, alternates: { languages: { ar, 'x-default': ar } }, ...extra }];
    }),
    ...categories
      .filter((c) => c.courseCount > 0)
      .flatMap((c) => localized(`/categories/${encodeURIComponent(c.slug)}`, { changeFrequency: 'weekly', priority: 0.7 })),
    ...courses.flatMap((c) =>
      localized(`/courses/${encodeURIComponent(c.slug)}`, {
        ...(c.updatedAt && { lastModified: new Date(c.updatedAt) }),
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    ),
    ...people.flatMap((t) => localized(`/teachers/${encodeURIComponent(t.id)}`, { changeFrequency: 'weekly', priority: 0.5 })),
    // Legal pages have no language URLs.
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
  ];
}
