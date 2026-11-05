import type { CourseLevel, CourseStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export interface CourseModuleRecord {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
}

export interface CourseRecord {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  category: string;
  level: CourseLevel;
  coverStyle: string;
  coverImageUrl: string | null;
  introVideoUrl: string | null;
  priceFils: number;
  status: CourseStatus;
  modules: CourseModuleRecord[];
  createdAt: Date;
}

export interface CourseWriteData {
  slug?: string;
  titleEn?: string;
  titleAr?: string | null;
  descriptionEn?: string;
  descriptionAr?: string | null;
  category?: string;
  level?: CourseLevel;
  coverStyle?: string;
  coverImageUrl?: string | null;
  introVideoUrl?: string | null;
  priceFils?: number;
  status?: CourseStatus;
  modules?: Array<{ order: number; titleEn: string; titleAr?: string | null }>;
}

export interface CourseFilter {
  q?: string;
  category?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  skip: number;
  take: number;
}

/** Persistence port for courses — services never see Prisma. */
export interface CourseRepository {
  list(filter: CourseFilter): Promise<{ items: CourseRecord[]; total: number }>;
  findById(id: string): Promise<CourseRecord | null>;
  findBySlug(slug: string): Promise<CourseRecord | null>;
  create(data: CourseWriteData & Required<Pick<CourseWriteData, 'slug' | 'titleEn' | 'category' | 'level' | 'priceFils'>>): Promise<CourseRecord>;
  update(id: string, data: CourseWriteData): Promise<CourseRecord>;
  countActiveBatches(id: string): Promise<number>;
}

const include = { modules: { orderBy: { order: 'asc' as const } } };

export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly db: Db) {}

  async list(f: CourseFilter) {
    const where = {
      ...(f.status && { status: f.status }),
      ...(f.category && { category: f.category }),
      ...(f.level && { level: f.level }),
      ...(f.q && {
        OR: [
          { titleEn: { contains: f.q, mode: 'insensitive' as const } },
          { titleAr: { contains: f.q } },
          { category: { contains: f.q, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [items, total] = await this.db.$transaction([
      this.db.course.findMany({ where, include, skip: f.skip, take: f.take, orderBy: { createdAt: 'desc' } }),
      this.db.course.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.db.course.findUnique({ where: { id }, include });
  }

  findBySlug(slug: string) {
    return this.db.course.findUnique({ where: { slug }, include });
  }

  create({ modules = [], ...data }: Parameters<CourseRepository['create']>[0]) {
    return this.db.course.create({ data: { ...data, modules: { create: modules } }, include });
  }

  async update(id: string, { modules, ...data }: CourseWriteData) {
    return this.db.$transaction(async (tx) => {
      if (modules) {
        await tx.courseModule.deleteMany({ where: { courseId: id } });
        await tx.courseModule.createMany({ data: modules.map((m) => ({ ...m, courseId: id })) });
      }
      return tx.course.update({ where: { id }, data, include });
    });
  }

  countActiveBatches(id: string) {
    return this.db.batch.count({ where: { courseId: id, status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } } });
  }
}
