import { NotFoundError } from '../../core/errors';
import type { Role } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { present } from '../courses/course.service';
import type { CourseRecord } from '../courses/course.repository';

/** Wishlist: a user's saved published courses, newest first. */
export class SavedCourseService {
  constructor(private readonly db: Db) {}

  /** Courses go through the catalog presenter: Stripe ids never leave, and the teacher's cut only reaches admins and the author. */
  async list(userId: string, role: Role = 'STUDENT') {
    const rows = await this.db.savedCourse.findMany({
      where: { userId, course: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          include: { modules: { orderBy: { order: 'asc' } }, categoryRef: { select: { slug: true, nameEn: true, nameAr: true, icon: true } } },
        },
      },
    });
    return { items: rows.map((r) => ({ ...present(r.course as unknown as CourseRecord, { id: userId, role }), savedAt: r.createdAt })) };
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
