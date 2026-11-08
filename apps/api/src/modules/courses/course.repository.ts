import type { CourseFaqItem, CourseLevel, CourseType, CourseSort, CourseStatus, SessionLanguage } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

export interface CourseModuleRecord {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  /** Syllabus preview: lesson titles only (bodies are gated, see `GET /courses/:id/lessons`). */
  lessons?: Array<{ id: string; order: number; titleEn: string; titleAr: string | null }>;
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
  /** Fixed at creation. */
  type: CourseType;
  coverStyle: string;
  coverImageUrl: string | null;
  introVideoUrl: string | null;
  /** The "from" price: the lowest public batch price (LIVE) or the monthly price (RECORDED); null while there is none. */
  priceFils: number | null;
  /** RECORDED only, before VAT. */
  monthlyPriceFils: number | null;
  yearlyPriceFils: number | null;
  teacherCutPercent: number | null;
  previewLessonId: string | null;
  stripeProductId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  appleMonthlyProductId: string | null;
  appleYearlyProductId: string | null;
  appleSyncStatus: string | null;
  appleSyncDetail: string | null;
  appleSyncedAt: Date | null;
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
  type?: CourseType;
  coverStyle?: string;
  coverImageUrl?: string | null;
  introVideoUrl?: string | null;
  priceFils?: number | null;
  monthlyPriceFils?: number | null;
  yearlyPriceFils?: number | null;
  previewLessonId?: string | null;
  stripeProductId?: string | null;
  stripeMonthlyPriceId?: string | null;
  stripeYearlyPriceId?: string | null;
  appleMonthlyProductId?: string | null;
  appleYearlyProductId?: string | null;
  appleSyncStatus?: string | null;
  appleSyncDetail?: string | null;
  appleSyncedAt?: Date | null;
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
  /** Modules with an `id` of this course are kept (with their lessons) and updated; the rest are created; missing ones are deleted. */
  modules?: Array<{ id?: string; order: number; titleEn: string; titleAr?: string | null; descriptionEn?: string | null; descriptionAr?: string | null }>;
}

export interface CourseFilter {
  q?: string;
  category?: string;
  level?: CourseLevel;
  type?: CourseType;
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
  create(data: CourseWriteData & Required<Pick<CourseWriteData, 'slug' | 'titleEn' | 'category' | 'level'>>): Promise<CourseRecord>;
  /** Recomputes the course's "from" price: from its public batches (LIVE), or the monthly price (RECORDED). */
  refreshFromPrice(courseId: string): Promise<void>;
  update(id: string, data: CourseWriteData): Promise<CourseRecord>;
  countActiveBatches(id: string): Promise<number>;
  /** Same category first, then same level; published only. */
  related(course: CourseRecord, take: number): Promise<CourseRecord[]>;
}

const include = {
  modules: {
    orderBy: { order: 'asc' as const },
    include: { lessons: { orderBy: { order: 'asc' as const }, select: { id: true, order: true, titleEn: true, titleAr: true } } },
  },
  categoryRef: { select: { slug: true, nameEn: true, nameAr: true, icon: true } },
};

const ORDER: Record<CourseSort, object[]> = {
  newest: [{ createdAt: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  price_asc: [{ priceFils: { sort: 'asc', nulls: 'last' } }],
  price_desc: [{ priceFils: { sort: 'desc', nulls: 'last' } }],
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
      ...(f.type && { type: f.type }),
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
    return this.db.course.create({ data: { ...data, ...(faq && { faq }), modules: { create: modules.map(({ id: _id, ...m }) => m) } }, include });
  }

  async refreshFromPrice(courseId: string) {
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { type: true, monthlyPriceFils: true } });
    if (course?.type === 'RECORDED') {
      await this.db.course.update({ where: { id: courseId }, data: { priceFils: course.monthlyPriceFils } });
      return;
    }
    const agg = await this.db.batch.aggregate({
      where: { courseId, status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } },
      _min: { priceFils: true },
    });
    await this.db.course.update({ where: { id: courseId }, data: { priceFils: agg._min.priceFils ?? null } });
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
        // Update in place so lessons and quiz links survive a curriculum save.
        const existing = await tx.courseModule.findMany({ where: { courseId: id }, orderBy: { order: 'asc' }, select: { id: true } });
        const known = new Set(existing.map((m) => m.id));
        // Clients that never send ids (older apps) keep the existing modules by position.
        const byPosition = modules.every((m) => !m.id);
        const plan = modules.map((m, i) => {
          const { id: moduleId, ...data } = m;
          const keep = byPosition ? existing[i]?.id : moduleId && known.has(moduleId) ? moduleId : undefined;
          return { keep, data };
        });
        const kept = new Set(plan.flatMap((p) => (p.keep ? [p.keep] : [])));
        await tx.courseModule.deleteMany({ where: { courseId: id, id: { notIn: [...kept] } } });
        // Park kept rows on negative orders first: (courseId, order) is unique.
        for (const [i, p] of plan.entries()) if (p.keep) await tx.courseModule.update({ where: { id: p.keep }, data: { order: -1 - i } });
        for (const p of plan) {
          if (p.keep) await tx.courseModule.update({ where: { id: p.keep }, data: p.data });
          else await tx.courseModule.create({ data: { ...p.data, courseId: id } });
        }
      }
      return tx.course.update({ where: { id }, data: { ...data, ...(faq && { faq }) }, include });
    });
  }

  countActiveBatches(id: string) {
    return this.db.batch.count({ where: { courseId: id, status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } } });
  }
}
