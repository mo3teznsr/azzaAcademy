import type { Db } from '../../infrastructure/db';
import type { ReviewPatch, ReviewRecord, ReviewRepository, ReviewWrite, TestimonialRecord } from './review.service';

const include = { user: { select: { id: true, name: true, image: true } } };
const withCourse = { ...include, course: { select: { id: true, slug: true, titleEn: true, titleAr: true } } };

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly db: Db) {}

  courseExists(courseId: string) {
    return this.db.course.findFirst({ where: { OR: [{ id: courseId }, { slug: courseId }] }, select: { id: true, titleEn: true, titleAr: true } });
  }

  async list(courseId: string, o: { includeHidden: boolean; skip: number; take: number }) {
    const where = { courseId, ...(!o.includeHidden && { hidden: false }) };
    const [items, total] = await this.db.$transaction([
      this.db.courseReview.findMany({ where, include, skip: o.skip, take: o.take, orderBy: { createdAt: 'desc' } }),
      this.db.courseReview.count({ where }),
    ]);
    return { items: items as ReviewRecord[], total };
  }

  async distribution(courseId: string) {
    const rows = await this.db.courseReview.groupBy({ by: ['rating'], where: { courseId, hidden: false }, _count: { _all: true } });
    const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rows) out[r.rating as 1] = r._count._all;
    return out;
  }

  find(id: string) {
    return this.db.courseReview.findUnique({ where: { id }, include }) as Promise<ReviewRecord | null>;
  }

  findMine(courseId: string, userId: string) {
    return this.db.courseReview.findUnique({ where: { courseId_userId: { courseId, userId } }, include }) as Promise<ReviewRecord | null>;
  }

  async canReview(courseId: string, userId: string) {
    const n = await this.db.enrollment.count({
      where: { userId, status: 'ACTIVE', batch: { courseId, sessions: { some: { status: 'ENDED' } } } },
    });
    return n > 0;
  }

  upsert(courseId: string, userId: string, input: ReviewWrite) {
    const { featuredAt: _unfeature, ...create } = input;
    return this.db.courseReview.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, ...create },
      update: input,
      include,
    }) as Promise<ReviewRecord>;
  }

  async delete(id: string) {
    await this.db.courseReview.delete({ where: { id } });
  }

  update(id: string, data: ReviewPatch) {
    return this.db.courseReview.update({ where: { id }, data, include }) as Promise<ReviewRecord>;
  }

  featured(o: { courseId?: string; take: number }) {
    return this.db.courseReview.findMany({
      where: {
        featuredAt: { not: null },
        quoteConsent: true,
        hidden: false,
        ...(o.courseId ? { courseId: o.courseId } : {}),
        course: { status: 'PUBLISHED' },
      },
      include: withCourse,
      orderBy: { featuredAt: 'desc' },
      take: o.take,
    }) as Promise<TestimonialRecord[]>;
  }

  async consented(o: { featured?: boolean; courseId?: string; skip: number; take: number }) {
    const where = {
      quoteConsent: true,
      ...(o.courseId ? { courseId: o.courseId } : {}),
      ...(o.featured === true ? { featuredAt: { not: null } } : o.featured === false ? { featuredAt: null } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.courseReview.findMany({ where, include: withCourse, orderBy: [{ featuredAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], skip: o.skip, take: o.take }),
      this.db.courseReview.count({ where }),
    ]);
    return { items: items as TestimonialRecord[], total };
  }

  async refreshAggregate(courseId: string) {
    const agg = await this.db.courseReview.aggregate({ where: { courseId, hidden: false }, _avg: { rating: true }, _count: { _all: true } });
    const data = { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all };
    await this.db.course.update({ where: { id: courseId }, data });
    return data;
  }

  async teacherIds(courseId: string) {
    const [batches, course] = await Promise.all([
      this.db.batch.findMany({ where: { courseId, status: { notIn: ['DRAFT', 'PENDING_REVIEW', 'CANCELLED'] } }, select: { teacherId: true }, distinct: ['teacherId'] }),
      this.db.course.findUnique({ where: { id: courseId }, select: { createdById: true } }),
    ]);
    return [...new Set([...batches.map((b) => b.teacherId), ...(course?.createdById ? [course.createdById] : [])])];
  }
}
