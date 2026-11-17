import type { BlogPostInput, BlogPostStatus, UpdateBlogPostInput } from '@azza/shared';
import { http } from './client';
import type { CategoryRef, Course, CourseReview, ISODate } from './types';

// ───────── Blog ─────────

export interface BlogAuthor {
  id: string;
  name: string;
  image: string | null;
}

/** A related course card at the end of a post. */
export type BlogCourse = Pick<Course, 'id' | 'slug' | 'titleEn' | 'titleAr' | 'coverStyle' | 'coverImageUrl' | 'category' | 'level' | 'type' | 'ratingAvg' | 'ratingCount'> & {
  categoryRef: CategoryRef;
};

/** A list row (no bodies). */
export interface BlogPostSummary {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  excerptAr: string;
  excerptEn: string | null;
  coverImageUrl: string | null;
  categorySlug: string | null;
  category: { slug: string; nameEn: string; nameAr: string | null } | null;
  tags: string[];
  authorId: string | null;
  /** Null: written by Azza. */
  author: BlogAuthor | null;
  status: BlogPostStatus;
  publishedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Both an English title and body exist. */
  hasEn: boolean;
}

export interface BlogPost extends BlogPostSummary {
  bodyAr: string;
  bodyEn: string | null;
  courses: BlogCourse[];
}

export interface BlogPage {
  items: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Categories with at least one live post (the topic filter). */
  categories: { slug: string; nameEn: string; nameAr: string | null }[];
}

/** Admin rows carry whether the post is visible right now (published and its date has passed). */
export type AdminBlogPost = Omit<BlogPost, 'hasEn'> & { live: boolean };
export type AdminBlogRow = BlogPostSummary & { live: boolean };

export const blogApi = {
  list: (p: { page?: number; pageSize?: number; category?: string } = {}) => http.get<BlogPage>('/api/v1/blog', { ...p }),
  get: (slug: string) => http.get<BlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`),
  admin: {
    list: (p: { page?: number; pageSize?: number; status?: BlogPostStatus; q?: string } = {}) =>
      http.get<{ items: AdminBlogRow[]; total: number; page: number; pageSize: number }>('/api/v1/admin/blog', { ...p }),
    get: (id: string) => http.get<AdminBlogPost>(`/api/v1/admin/blog/${id}`),
    create: (input: BlogPostInput) => http.post<AdminBlogPost>('/api/v1/admin/blog', input),
    update: (id: string, input: UpdateBlogPostInput) => http.patch<AdminBlogPost>(`/api/v1/admin/blog/${id}`, input),
    remove: (id: string) => http.del<{ ok: true }>(`/api/v1/admin/blog/${id}`),
  },
};

// ───────── Testimonials (featured course reviews) ─────────

/** Public: the learner's first name, their words and the course. Nothing else. */
export interface Testimonial {
  id: string;
  firstName: string;
  body: string;
  course: { slug: string; titleEn: string; titleAr: string | null };
}

export type AdminTestimonial = CourseReview & {
  course: { id: string; slug: string; titleEn: string; titleAr: string | null };
  firstName: string;
  /** Consent given, visible and long enough to quote. */
  quotable: boolean;
};

export const testimonialsApi = {
  list: (p: { course?: string; limit?: number } = {}) => http.get<{ items: Testimonial[] }>('/api/v1/testimonials', { ...p }),
  admin: {
    list: (p: { featured?: 'true' | 'false'; page?: number; pageSize?: number } = {}) =>
      http.get<{ items: AdminTestimonial[]; total: number; page: number; pageSize: number }>('/api/v1/admin/testimonials', { ...p }),
    setFeatured: (reviewId: string, featured: boolean) => http.put<CourseReview>(`/api/v1/admin/reviews/${reviewId}/featured`, { featured }),
  },
};
