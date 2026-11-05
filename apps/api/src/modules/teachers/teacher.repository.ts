import type { Db } from '../../infrastructure/db';
import { SEAT_HOLDING } from '../payments/enrollment-state';

export class PrismaTeacherRepository {
  constructor(private readonly db: Db) {}

  findTeacher(id: string) {
    return this.db.user.findFirst({
      where: { id, role: 'TEACHER', banned: false },
      select: { id: true, name: true, image: true, headline: true, bio: true },
    });
  }

  /** Every non-draft, non-cancelled batch of the teacher on a PUBLISHED course (courses + languages come from these). */
  publicBatches(teacherId: string) {
    return this.db.batch.findMany({
      where: { teacherId, status: { notIn: ['DRAFT', 'CANCELLED'] }, course: { status: 'PUBLISHED' } },
      orderBy: { startsOn: 'asc' },
      select: {
        id: true,
        code: true,
        status: true,
        language: true,
        capacity: true,
        priceFils: true,
        startsOn: true,
        timezone: true,
        schedule: { select: { weekdays: true, startTime: true, sessionCount: true } },
        course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverImageUrl: true, introVideoUrl: true, category: true, priceFils: true } },
      },
    });
  }

  async heldSeats(batchIds: string[]) {
    if (!batchIds.length) return new Map<string, number>();
    const rows = await this.db.enrollment.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds }, status: { in: SEAT_HOLDING } }, _count: true });
    return new Map(rows.map((r) => [r.batchId, r._count]));
  }
}

export type TeacherRepository = PrismaTeacherRepository;
