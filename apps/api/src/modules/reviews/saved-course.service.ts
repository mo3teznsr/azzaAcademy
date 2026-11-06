import { NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';

/** Wishlist: a user's saved published courses, newest first. */
export class SavedCourseService {
  constructor(private readonly db: Db) {}

  async list(userId: string) {
    const rows = await this.db.savedCourse.findMany({
      where: { userId, course: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          include: { modules: { orderBy: { order: 'asc' } }, categoryRef: { select: { slug: true, nameEn: true, nameAr: true, icon: true } } },
        },
      },
    });
    return { items: rows.map((r) => ({ ...r.course, savedAt: r.createdAt })) };
  }

  async save(userId: string, courseId: string) {
    const course = await this.db.course.findFirst({ where: { id: courseId, status: 'PUBLISHED' }, select: { id: true } });
    if (!course) throw new NotFoundError('Course', courseId);
    await this.db.savedCourse.upsert({ where: { userId_courseId: { userId, courseId } }, create: { userId, courseId }, update: {} });
    return { saved: true };
  }

  async unsave(userId: string, courseId: string) {
    await this.db.savedCourse.deleteMany({ where: { userId, courseId } });
    return { saved: false };
  }
}
