import { z } from 'zod';
import { isCourseCoverUrl } from './course-media';

// ---------- Blog (admin-written articles) ----------

/** Latin slug shared by both language URLs: `/ar/blog/<slug>` and `/en/blog/<slug>`. */
export const BLOG_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BLOG_BODY_MAX = 60_000;
export const BLOG_RELATED_COURSES_MAX = 6;
export const BLOG_TAGS_MAX = 8;

export const BLOG_POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

/** Blank strings become null, so "no English version" is one state. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const blogFields = {
  slug: z.string().trim().toLowerCase().min(3).max(80).regex(BLOG_SLUG, 'Use latin letters, digits and dashes'),
  titleAr: z.string().trim().min(3).max(160),
  titleEn: optionalText(160),
  excerptAr: z.string().trim().max(300),
  excerptEn: optionalText(300),
  bodyAr: z.string().trim().min(1).max(BLOG_BODY_MAX),
  bodyEn: optionalText(BLOG_BODY_MAX),
  coverImageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(isCourseCoverUrl, 'Upload an image or use an https link')
    .nullish()
    .transform((v) => v || null),
  categorySlug: z.string().trim().max(60).nullish().transform((v) => v || null),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(BLOG_TAGS_MAX)
    .transform((tags) => [...new Set(tags)]),
  /** A teacher shown as the author; null = Azza. */
  authorId: z.string().trim().max(60).nullish().transform((v) => v || null),
  /** Related course ids, in display order. */
  courseIds: z
    .array(z.string().min(1).max(60))
    .max(BLOG_RELATED_COURSES_MAX)
    .transform((ids) => [...new Set(ids)]),
  status: z.enum(BLOG_POST_STATUSES),
  /** ISO date; publishing without one means "now". A future date schedules the post. */
  publishedAt: z.coerce.date().nullish(),
};

/** POST /admin/blog. Arabic is required, English is optional. */
export const blogPostInput = z.object({
  ...blogFields,
  excerptAr: blogFields.excerptAr.default(''),
  tags: blogFields.tags.default([]),
  courseIds: blogFields.courseIds.default([]),
  status: blogFields.status.default('DRAFT'),
});
export type BlogPostInput = z.infer<typeof blogPostInput>;

/** PATCH /admin/blog/:id — any subset (no defaults). The English fields are cleared with null or an empty string. */
export const updateBlogPostInput = z.object(blogFields).partial();
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostInput>;

/** GET /blog — published posts, newest first. */
export const blogListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().trim().max(60).optional(),
});
export type BlogListQuery = z.infer<typeof blogListQuery>;

/** GET /admin/blog */
export const adminBlogListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  status: z.enum(BLOG_POST_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});
export type AdminBlogListQuery = z.infer<typeof adminBlogListQuery>;

// ---------- Testimonials (featured course reviews) ----------

/** PUT /admin/reviews/:id/featured */
export const reviewFeatureInput = z.object({ featured: z.boolean() });
export type ReviewFeatureInput = z.infer<typeof reviewFeatureInput>;

/** GET /admin/testimonials — reviews whose authors agreed to be quoted. */
export const adminTestimonialQuery = z.object({
  featured: z.enum(['true', 'false']).optional(),
  courseId: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type AdminTestimonialQuery = z.infer<typeof adminTestimonialQuery>;

/** GET /testimonials — featured reviews for the landing page (no course) or one course page. */
export const testimonialQuery = z.object({
  course: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});
export type TestimonialQuery = z.infer<typeof testimonialQuery>;

/** Shortest review text worth quoting. */
export const TESTIMONIAL_MIN_LENGTH = 20;
