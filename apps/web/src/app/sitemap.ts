import type { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';

// Rebuilt at most once an hour.
export const revalidate = 3600;

type Listed = { slug: string; updatedAt?: string };

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

async function teachers(): Promise<{ id: string }[]> {
  const res = await fetch(`${API_URL}/api/v1/teachers`, { next: { revalidate } }).catch(() => null);
  if (!res?.ok) return [];
  return ((await res.json()) as { items: { id: string }[] }).items;
}

/** Public pages, every published course and every teacher profile. The API being down still yields the static pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, people] = await Promise.all([publishedCourses(), teachers()]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/teachers`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/teach`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    ...courses.map((c) => ({
      url: `${SITE_URL}/courses/${encodeURIComponent(c.slug)}`,
      ...(c.updatedAt && { lastModified: new Date(c.updatedAt) }),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...people.map((t) => ({ url: `${SITE_URL}/teachers/${encodeURIComponent(t.id)}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
