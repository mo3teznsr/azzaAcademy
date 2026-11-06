import type { CourseFaqItem, CourseLevel, CourseSort, CourseStatus, SessionLanguage } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export interface CourseModuleRecord {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
}

export interface CategoryRef {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  icon: string | null;
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
  outcomesEn: string[];
  outcomesAr: string[];
  requirementsEn: string[];
  requirementsAr: string[];
  audienceEn: string[];
  audienceAr: string[];
  faq: unknown;
  featuredRank: number | null;
  ratingAvg: number;
  ratingCount: number;
  categoryRef: CategoryRef;
  status: CourseStatus;
  createdById: string | null;
  reviewNote: string | null;
  submittedAt: Date | null;
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
  outcomesEn?: string[];
  outcomesAr?: string[];
  requirementsEn?: string[];
  requirementsAr?: string[];
  audienceEn?: string[];
  audienceAr?: string[];
  faq?: CourseFaqItem[];
  featuredRank?: number | null;
  status?: CourseStatus;
  createdById?: string | null;
  reviewNote?: string | null;
  submittedAt?: Date | null;
  modules?: Array<{ order: number; titleEn: string; titleAr?: string | null; descriptionEn?: string | null; descriptionAr?: string | null }>;
}

export interface CourseFilter {
  q?: string;
  category?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  createdById?: string;
  language?: SessionLanguage;
  minPriceFils?: number;
  maxPriceFils?: number;
  minRating?: number;
  featured?: boolean;
  sort?: CourseSort;
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
  /** Same category first, then same level; published only. */
  related(course: CourseRecord, take: number): Promise<CourseRecord[]>;
}

const include = {
  modules: { orderBy: { order: 'asc' as const } },
  categoryRef: { select: { slug: true, nameEn: true, nameAr: true, icon: true } },
};

const ORDER: Record<CourseSort, object[]> = {
  newest: [{ createdAt: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  price_asc: [{ priceFils: 'asc' }],
  price_desc: [{ priceFils: 'desc' }],
  popular: [{ ratingCount: 'desc' }, { ratingAvg: 'desc' }],
};

export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly db: Db) {}

  async list(f: CourseFilter) {
    const where = {
      ...(f.status && { status: f.status }),
      ...(f.createdById && { createdById: f.createdById }),
      ...(f.language && { batches: { some: { language: f.language, status: 'ENROLLING' as const } } }),
      ...((f.minPriceFils !== undefined || f.maxPriceFils !== undefined) && {
        priceFils: { ...(f.minPriceFils !== undefined && { gte: f.minPriceFils }), ...(f.maxPriceFils !== undefined && { lte: f.maxPriceFils }) },
      }),
      ...(f.minRating !== undefined && { ratingAvg: { gte: f.minRating } }),
      ...(f.featured && { featuredRank: { not: null } }),
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
      this.db.course.findMany({
        where,
        include,
        skip: f.skip,
        take: f.take,
        orderBy: (f.featured ? [{ featuredRank: 'asc' }, ...ORDER[f.sort ?? 'newest']] : ORDER[f.sort ?? 'newest']) as never,
      }),
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

  create({ modules = [], faq, ...data }: Parameters<CourseRepository['create']>[0]) {
    return this.db.course.create({ data: { ...data, ...(faq && { faq }), modules: { create: modules } }, include });
  }

  async related(course: CourseRecord, take: number) {
    const base = { status: 'PUBLISHED' as const, id: { not: course.id } };
    const same = await this.db.course.findMany({ where: { ...base, category: course.category }, include, take, orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }] });
    if (same.length >= take) return same;
    const more = await this.db.course.findMany({
      where: { ...base, level: course.level, id: { notIn: [course.id, ...same.map((c) => c.id)] } },
      include,
      take: take - same.length,
      orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
    });
    return [...same, ...more];
  }

  async update(id: string, { modules, faq, ...data }: CourseWriteData) {
    return this.db.$transaction(async (tx) => {
      if (modules) {
        await tx.courseModule.deleteMany({ where: { courseId: id } });
        await tx.courseModule.createMany({ data: modules.map((m) => ({ ...m, courseId: id })) });
      }
      return tx.course.update({ where: { id }, data: { ...data, ...(faq && { faq }) }, include });
    });
  }

  countActiveBatches(id: string) {
    return this.db.batch.count({ where: { courseId: id, status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } } });
  }
}
