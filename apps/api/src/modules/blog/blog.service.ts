import type { BlogPostInput, BlogPostStatus, Role, UpdateBlogPostInput } from '@azza/shared';
import { AppError, BusinessRuleError, NotFoundError } from '../../core/errors';

export interface BlogCategoryRef {
  slug: string;
  nameEn: string;
  nameAr: string | null;
}

/** A course card at the end of a post. */
export interface BlogRelatedCourse {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  coverStyle: string;
  coverImageUrl: string | null;
  category: string;
  categoryRef: BlogCategoryRef & { icon: string | null; imageUrl: string | null };
  level: string;
  type: string;
  status: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface BlogPostRecord {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  excerptAr: string;
  excerptEn: string | null;
  bodyAr: string;
  bodyEn: string | null;
  coverImageUrl: string | null;
  categorySlug: string | null;
  category: BlogCategoryRef | null;
  tags: string[];
  authorId: string | null;
  author: { id: string; name: string; image: string | null } | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** In display order. */
  courses: BlogRelatedCourse[];
}

export type BlogPostData = Omit<BlogPostInput, 'courseIds' | 'publishedAt'> & { publishedAt: Date | null };

export interface BlogRepository {
  listPublished(o: { now: Date; category?: string; skip: number; take: number }): Promise<{ items: BlogPostRecord[]; total: number }>;
  findPublishedBySlug(slug: string, now: Date): Promise<BlogPostRecord | null>;
  /** Slugs of every live post, with whether it has an English version (sitemap). */
  publishedSlugs(now: Date): Promise<{ slug: string; updatedAt: Date; hasEn: boolean; categorySlug: string | null }[]>;
  listAll(o: { status?: BlogPostStatus; q?: string; skip: number; take: number }): Promise<{ items: BlogPostRecord[]; total: number }>;
  find(id: string): Promise<BlogPostRecord | null>;
  slugOwner(slug: string): Promise<string | null>;
  categoryExists(slug: string): Promise<boolean>;
  userRole(id: string): Promise<Role | null>;
  existingCourseIds(ids: string[]): Promise<string[]>;
  create(data: BlogPostData, courseIds: string[]): Promise<BlogPostRecord>;
  /** `courseIds` replaces the related courses when given. */
  update(id: string, data: Partial<BlogPostData>, courseIds?: string[]): Promise<BlogPostRecord>;
  delete(id: string): Promise<void>;
}

/** A list row: no bodies. */
const summary = ({ bodyAr: _a, bodyEn: _e, courses: _c, ...rest }: BlogPostRecord) => ({ ...rest, hasEn: !!rest.titleEn && hasEnglishBody(_e) });
const hasEnglishBody = (body: string | null) => !!body?.trim();
const isLive = (p: Pick<BlogPostRecord, 'status' | 'publishedAt'>, now: Date) => p.status === 'PUBLISHED' && !!p.publishedAt && p.publishedAt <= now;

export class BlogService {
  constructor(
    private readonly repo: BlogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---------- Public ----------

  async list(o: { page: number; pageSize: number; category?: string }) {
    const { items, total } = await this.repo.listPublished({ now: this.now(), category: o.category, skip: (o.page - 1) * o.pageSize, take: o.pageSize });
    return { items: items.map(summary), total, page: o.page, pageSize: o.pageSize, pageCount: Math.max(1, Math.ceil(total / o.pageSize)) };
  }

  /** A live post with its published related courses. Drafts and scheduled posts are not found. */
  async get(slug: string) {
    const post = await this.repo.findPublishedBySlug(slug, this.now());
    if (!post || !isLive(post, this.now())) throw new NotFoundError('Post', slug);
    return { ...post, hasEn: !!post.titleEn && hasEnglishBody(post.bodyEn), courses: post.courses.filter((c) => c.status === 'PUBLISHED') };
  }

  async sitemap() {
    return { items: await this.repo.publishedSlugs(this.now()) };
  }

  // ---------- Admin ----------

  async adminList(o: { page: number; pageSize: number; status?: BlogPostStatus; q?: string }) {
    const { items, total } = await this.repo.listAll({ status: o.status, q: o.q, skip: (o.page - 1) * o.pageSize, take: o.pageSize });
    const now = this.now();
    return { items: items.map((p) => ({ ...summary(p), live: isLive(p, now) })), total, page: o.page, pageSize: o.pageSize };
  }

  async adminGet(id: string) {
    const post = await this.repo.find(id);
    if (!post) throw new NotFoundError('Post', id);
    return { ...post, live: isLive(post, this.now()) };
  }

  async create(input: BlogPostInput) {
    await this.check(input, null);
    const { courseIds, publishedAt, ...data } = input;
    const post = await this.repo.create({ ...data, publishedAt: this.publishDate(input.status, publishedAt, null) }, courseIds);
    return { ...post, live: isLive(post, this.now()) };
  }

  async update(id: string, input: UpdateBlogPostInput) {
    const current = await this.repo.find(id);
    if (!current) throw new NotFoundError('Post', id);
    await this.check(input, id);
    const { courseIds, publishedAt, ...data } = input;
    const status = input.status ?? current.status;
    const patch: Partial<BlogPostData> = { ...data };
    if (publishedAt !== undefined || status === 'PUBLISHED') patch.publishedAt = this.publishDate(status, publishedAt, current.publishedAt);
    const post = await this.repo.update(id, patch, courseIds);
    return { ...post, live: isLive(post, this.now()) };
  }

  async delete(id: string) {
    if (!(await this.repo.find(id))) throw new NotFoundError('Post', id);
    await this.repo.delete(id);
    return { ok: true };
  }

  /**
   * Publishing without a date means now; a post keeps its first publish date when it is edited or
   * unpublished and published again. A date given explicitly always wins (a future one schedules it).
   */
  private publishDate(status: BlogPostStatus, given: Date | null | undefined, current: Date | null): Date | null {
    if (given !== undefined && given !== null) return given;
    if (given === null && status === 'DRAFT') return null;
    return status === 'PUBLISHED' ? (current ?? this.now()) : current;
  }

  private async check(input: UpdateBlogPostInput, id: string | null) {
    if (input.slug) {
      const owner = await this.repo.slugOwner(input.slug);
      if (owner && owner !== id) throw new AppError('Another post already uses this address', 409, 'BLOG_SLUG_TAKEN');
    }
    if (input.categorySlug && !(await this.repo.categoryExists(input.categorySlug))) {
      throw new BusinessRuleError('Unknown category', 'BLOG_CATEGORY_UNKNOWN');
    }
    if (input.authorId && (await this.repo.userRole(input.authorId)) !== 'TEACHER') {
      throw new BusinessRuleError('The author must be a teacher', 'BLOG_AUTHOR_NOT_TEACHER');
    }
    if (input.courseIds?.length) {
      const found = new Set(await this.repo.existingCourseIds(input.courseIds));
      const missing = input.courseIds.filter((c) => !found.has(c));
      if (missing.length) throw new BusinessRuleError('Some related courses do not exist', 'BLOG_COURSE_UNKNOWN', { missing });
    }
    // An English version is all or nothing on the page: a title without a body (or the reverse) is a mistake.
    if ((input.titleEn && input.bodyEn === null) || (input.bodyEn && input.titleEn === null)) {
      throw new BusinessRuleError('The English version needs both a title and a body', 'BLOG_ENGLISH_INCOMPLETE');
    }
  }
}
