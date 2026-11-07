import type { AnnouncementAudience, Role } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { AnnouncementFeedFilter, AnnouncementRecord, AnnouncementRepository, NewAnnouncement } from './announcement.service';

const include = {
  author: { select: { id: true, name: true, image: true } },
  batch: { select: { id: true, code: true, course: { select: { titleEn: true, titleAr: true } } } },
};
const orderBy = [{ pinned: 'desc' as const }, { createdAt: 'desc' as const }];

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly db: Db) {}

  find(id: string) {
    return this.db.announcement.findUnique({ where: { id }, include }) as Promise<AnnouncementRecord | null>;
  }

  create(data: NewAnnouncement) {
    return this.db.announcement.create({ data, include }) as Promise<AnnouncementRecord>;
  }

  update(id: string, data: Partial<Pick<AnnouncementRecord, 'title' | 'body' | 'pinned' | 'audience'>>) {
    return this.db.announcement.update({ where: { id }, data, include }) as Promise<AnnouncementRecord>;
  }

  async delete(id: string) {
    await this.db.announcement.delete({ where: { id } });
  }

  async listForBatch(batchId: string, skip: number, take: number) {
    const where = { scope: 'BATCH' as const, batchId };
    const [items, total] = await this.db.$transaction([
      this.db.announcement.findMany({ where, include, orderBy, skip, take }),
      this.db.announcement.count({ where }),
    ]);
    return { items: items as AnnouncementRecord[], total };
  }

  async feed(filter: AnnouncementFeedFilter, skip: number, take: number) {
    const where = {
      OR: [
        { scope: 'PLATFORM' as const, audience: { in: filter.audiences } },
        ...(filter.batchIds.length ? [{ scope: 'BATCH' as const, batchId: { in: filter.batchIds } }] : []),
      ],
    };
    const [items, total] = await this.db.$transaction([
      this.db.announcement.findMany({ where, include, orderBy, skip, take }),
      this.db.announcement.count({ where }),
    ]);
    return { items: items as AnnouncementRecord[], total };
  }

  async memberBatchIds(user: { id: string; role: Role }) {
    if (user.role === 'TEACHER') {
      return (await this.db.batch.findMany({ where: { teacherId: user.id }, select: { id: true } })).map((b) => b.id);
    }
    return (await this.db.enrollment.findMany({ where: { userId: user.id, status: 'ACTIVE' }, select: { batchId: true } })).map((e) => e.batchId);
  }

  async classMemberIds(batchId: string) {
    const batch = await this.db.batch.findUnique({
      where: { id: batchId },
      select: { teacherId: true, enrollments: { where: { status: 'ACTIVE' }, select: { userId: true } } },
    });
    if (!batch) return [];
    return [...new Set([batch.teacherId, ...batch.enrollments.map((e) => e.userId)])];
  }

  async audienceUserIds(audience: AnnouncementAudience) {
    const roles: Role[] = audience === 'ALL' ? ['STUDENT', 'TEACHER', 'ADMIN'] : audience === 'STUDENTS' ? ['STUDENT'] : ['TEACHER'];
    return (await this.db.user.findMany({ where: { role: { in: roles }, banned: false }, select: { id: true } })).map((u) => u.id);
  }
}
