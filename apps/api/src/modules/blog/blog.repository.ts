import type { BlogPostStatus, Role } from '@azza/shared';
import type { Prisma } from '../../generated/prisma/client';
import type { Db } from '../../infrastructure/db';
import type { BlogPostData, BlogPostRecord, BlogRepository } from './blog.service';

const include = {
  author: { select: { id: true, name: true, image: true } },
  category: { select: { slug: true, nameEn: true, nameAr: true } },
  courses: {
    orderBy: { position: 'asc' },
    select: {
      course: {
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          coverStyle: true,
          coverImageUrl: true,
          category: true,
          categoryRef: { select: { slug: true, nameEn: true, nameAr: true, icon: true, imageUrl: true } },
          level: true,
          type: true,
          status: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
    },
  },
} satisfies Prisma.BlogPostInclude;

type Row = Prisma.BlogPostGetPayload<{ include: typeof include }>;

const toRecord = ({ courses, ...row }: Row): BlogPostRecord => ({ ...row, courses: courses.map((c) => c.course) });

const live = (now: Date): Prisma.BlogPostWhereInput => ({ status: 'PUBLISHED', publishedAt: { lte: now } });

export class PrismaBlogRepository implements BlogRepository {
  constructor(private readonly db: Db) {}

  async listPublished(o: { now: Date; category?: string; skip: number; take: number }) {
    const where: Prisma.BlogPostWhereInput = { ...live(o.now), ...(o.category ? { categorySlug: o.category } : {}) };
    const [rows, total] = await this.db.$transaction([
      this.db.blogPost.findMany({ where, include, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], skip: o.skip, take: o.take }),
      this.db.blogPost.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async findPublishedBySlug(slug: string, now: Date) {
    const row = await this.db.blogPost.findFirst({ where: { slug, ...live(now) }, include });
    return row ? toRecord(row) : null;
  }

  liveCategories(now: Date) {
    return this.db.category.findMany({
      where: { blogPosts: { some: live(now) } },
      select: { slug: true, nameEn: true, nameAr: true },
      orderBy: [{ order: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async publishedSlugs(now: Date) {
    const rows = await this.db.blogPost.findMany({
      where: live(now),
      select: { slug: true, updatedAt: true, titleEn: true, bodyEn: true, categorySlug: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt, hasEn: !!r.titleEn && !!r.bodyEn?.trim(), categorySlug: r.categorySlug }));
  }

  async listAll(o: { status?: BlogPostStatus; q?: string; skip: number; take: number }) {
    const where: Prisma.BlogPostWhereInput = {
      ...(o.status ? { status: o.status } : {}),
      ...(o.q
        ? {
            OR: [
              { titleAr: { contains: o.q, mode: 'insensitive' } },
              { titleEn: { contains: o.q, mode: 'insensitive' } },
              { slug: { contains: o.q.toLowerCase() } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.blogPost.findMany({ where, include, orderBy: { updatedAt: 'desc' }, skip: o.skip, take: o.take }),
      this.db.blogPost.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async find(id: string) {
    const row = await this.db.blogPost.findUnique({ where: { id }, include });
    return row ? toRecord(row) : null;
  }

  async slugOwner(slug: string) {
    return (await this.db.blogPost.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }

  async categoryExists(slug: string) {
    return (await this.db.category.count({ where: { slug } })) > 0;
  }

  async userRole(id: string) {
    return ((await this.db.user.findUnique({ where: { id }, select: { role: true } }))?.role as Role | undefined) ?? null;
  }

  async existingCourseIds(ids: string[]) {
    return (await this.db.course.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((c) => c.id);
  }

  async create(data: BlogPostData, courseIds: string[]) {
    const row = await this.db.blogPost.create({
      data: { ...data, courses: { create: courseIds.map((courseId, position) => ({ courseId, position })) } },
      include,
    });
    return toRecord(row);
  }

  async update(id: string, data: Partial<BlogPostData>, courseIds?: string[]) {
    const row = await this.db.blogPost.update({
      where: { id },
      data: {
        ...data,
        ...(courseIds && { courses: { deleteMany: {}, create: courseIds.map((courseId, position) => ({ courseId, position })) } }),
      },
      include,
    });
    return toRecord(row);
  }

  async delete(id: string) {
    await this.db.blogPost.delete({ where: { id } });
  }
}
