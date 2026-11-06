import type { CourseReviewInput } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { ReviewRecord, ReviewRepository } from './review.service';

const include = { user: { select: { id: true, name: true, image: true } } };

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly db: Db) {}

  courseExists(courseId: string) {
    return this.db.course.findFirst({ where: { OR: [{ id: courseId }, { slug: courseId }] }, select: { id: true, titleEn: true } });
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

  upsert(courseId: string, userId: string, input: CourseReviewInput) {
    return this.db.courseReview.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, ...input },
      update: input,
      include,
    }) as Promise<ReviewRecord>;
  }

  async delete(id: string) {
    await this.db.courseReview.delete({ where: { id } });
  }

  update(id: string, data: Partial<Pick<ReviewRecord, 'teacherReply' | 'repliedAt' | 'hidden'>>) {
    return this.db.courseReview.update({ where: { id }, data, include }) as Promise<ReviewRecord>;
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
