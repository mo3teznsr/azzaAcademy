import 'server-only';
import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { API_URL, toQueryString, type Query } from './client';
import { qk } from '@/lib/query-keys';
import type { Category, Course, Items, TeacherProfile } from './types';
import type { BlogPage, BlogPost, Testimonial } from './blog';

/**
 * Public API reads for server components: page metadata, structured data and the React Query prefetch
 * that puts course, teacher and catalog content in the HTML. Anonymous (no cookies), cached for five minutes.
 * Responses are the same JSON the browser gets, so they can seed the client's query cache as they are.
 */
export async function publicGet<T>(path: string, query?: Query): Promise<T> {
  const res = await fetch(`${API_URL}${path}${toQueryString(query)}`, { headers: { Accept: 'application/json' }, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Deduplicated per request: metadata and the page share one call. Null when missing or the API is down. */
export const getCourse = cache((slug: string) => publicGet<Course>(`/api/v1/courses/${encodeURIComponent(slug)}`).catch(() => null));
export const getTeacher = cache((id: string) => publicGet<TeacherProfile>(`/api/v1/teachers/${encodeURIComponent(id)}`).catch(() => null));
/** A live blog post; null when missing, unpublished or the API is down. */
export const getBlogPost = cache((slug: string) => publicGet<BlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`).catch(() => null));
/** Published posts, newest first; null when the API is down. */
export const getBlogPage = cache((page: number, category: string | undefined) =>
  publicGet<BlogPage>('/api/v1/blog', { page, pageSize: 12, category }).catch(() => null),
);
/** Featured testimonials (all, or one course's); empty when the API is down. */
export const getTestimonials = cache((course?: string) =>
  publicGet<{ items: Testimonial[] }>('/api/v1/testimonials', { course, limit: 6 })
    .then((r) => r.items)
    .catch(() => [] as Testimonial[]),
);
/** Active categories with published-course counts; empty when the API is down. */
export const getCategories = cache(() =>
  publicGet<Items<Category>>('/api/v1/categories')
    .then((r) => r.items)
    .catch(() => [] as Category[]),
);

/** A query client for one server render; dehydrate it into a `HydrationBoundary`. Failed prefetches are left out and the browser retries them. */
export const serverQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });

/** Prefetch a public GET under the query key the client component uses for the same request. */
export const prefetchGet = (qc: QueryClient, queryKey: readonly unknown[], path: string, query?: Query) =>
  qc.prefetchQuery({ queryKey, queryFn: () => publicGet(path, query) });

/** Seed the public category list (category names, footer subject links). */
export async function seedCategories(qc: QueryClient): Promise<Category[]> {
  const list = await getCategories();
  if (list.length) qc.setQueryData(qk.categories(), list);
  return list;
}
