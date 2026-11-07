import type { LessonAttachment } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export interface LessonRecord {
  id: string;
  moduleId: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
  bodyEn: string;
  bodyAr: string | null;
  videoUrl: string | null;
  attachments: LessonAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonCourse {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  status: string;
  createdById: string | null;
  modules: Array<{ id: string; order: number; titleEn: string; titleAr: string | null; descriptionEn: string | null; descriptionAr: string | null }>;
}

export interface LessonWriteData {
  order?: number;
  titleEn?: string;
  titleAr?: string | null;
  bodyEn?: string;
  bodyAr?: string | null;
  videoUrl?: string | null;
  attachments?: LessonAttachment[];
}

/** Persistence port for lessons — services never see Prisma. */
export interface LessonRepository {
  /** By id or slug, with its modules in order. */
  findCourse(idOrSlug: string): Promise<LessonCourse | null>;
  lessonsOfModules(moduleIds: string[]): Promise<LessonRecord[]>;
  find(id: string): Promise<LessonRecord | null>;
  create(moduleId: string, data: LessonWriteData & { titleEn: string; order: number }): Promise<LessonRecord>;
  update(id: string, data: LessonWriteData): Promise<LessonRecord>;
  delete(id: string): Promise<void>;
  /** `ids[i]` gets order `i`. */
  setOrder(ids: string[]): Promise<void>;
  /** ACTIVE enrollment in any batch of the course. */
  isActiveStudent(courseId: string, userId: string): Promise<boolean>;
  /** Teaches a batch of the course. */
  teachesCourse(courseId: string, userId: string): Promise<boolean>;
}

const asRecord = <T extends { attachments: unknown }>(row: T) => ({ ...row, attachments: (row.attachments ?? []) as LessonAttachment[] });

export class PrismaLessonRepository implements LessonRepository {
  constructor(private readonly db: Db) {}

  findCourse(idOrSlug: string) {
    return this.db.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true,
        slug: true,
        titleEn: true,
        titleAr: true,
        status: true,
        createdById: true,
        modules: { orderBy: { order: 'asc' }, select: { id: true, order: true, titleEn: true, titleAr: true, descriptionEn: true, descriptionAr: true } },
      },
    });
  }

  async lessonsOfModules(moduleIds: string[]) {
    const rows = await this.db.lesson.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(asRecord);
  }

  async find(id: string) {
    const row = await this.db.lesson.findUnique({ where: { id } });
    return row && asRecord(row);
  }

  async create(moduleId: string, { attachments, ...data }: LessonWriteData & { titleEn: string; order: number }) {
    return asRecord(await this.db.lesson.create({ data: { ...data, moduleId, attachments: attachments ?? [] } }));
  }

  async update(id: string, { attachments, ...data }: LessonWriteData) {
    return asRecord(await this.db.lesson.update({ where: { id }, data: { ...data, ...(attachments && { attachments }) } }));
  }

  async delete(id: string) {
    await this.db.lesson.delete({ where: { id } });
  }

  async setOrder(ids: string[]) {
    await this.db.$transaction(ids.map((id, order) => this.db.lesson.update({ where: { id }, data: { order } })));
  }

  async isActiveStudent(courseId: string, userId: string) {
    return (await this.db.enrollment.count({ where: { userId, status: 'ACTIVE', batch: { courseId } } })) > 0;
  }

  async teachesCourse(courseId: string, userId: string) {
    return (await this.db.batch.count({ where: { courseId, teacherId: userId } })) > 0;
  }
}
