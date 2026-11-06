import type { CategoryInput, UpdateCategoryInput } from '@azza/shared';
import { ConflictError, NotFoundError } from '../../core/errors';
import type { Db } from '../../infrastructure/db';

export interface CategoryRecord {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  icon: string | null;
  order: number;
  active: boolean;
}

export interface CategoryRepository {
  list(includeInactive: boolean): Promise<Array<CategoryRecord & { courseCount: number }>>;
  find(slug: string): Promise<CategoryRecord | null>;
  create(input: CategoryInput): Promise<CategoryRecord>;
  update(slug: string, input: UpdateCategoryInput): Promise<CategoryRecord>;
  delete(slug: string): Promise<void>;
  courseCount(slug: string): Promise<number>;
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async list(includeInactive: boolean) {
    const rows = await this.db.category.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ order: 'asc' }, { nameEn: 'asc' }],
      include: { _count: { select: { courses: { where: { status: 'PUBLISHED' } } } } },
    });
    return rows.map(({ _count, createdAt: _c, ...c }) => ({ ...c, courseCount: _count.courses }));
  }
  find(slug: string) {
    return this.db.category.findUnique({ where: { slug } });
  }
  create(input: CategoryInput) {
    return this.db.category.create({ data: input });
  }
  update(slug: string, input: UpdateCategoryInput) {
    return this.db.category.update({ where: { slug }, data: input });
  }
  async delete(slug: string) {
    await this.db.category.delete({ where: { slug } });
  }
  courseCount(slug: string) {
    return this.db.course.count({ where: { category: slug } });
  }
}

/** Managed course categories: public list with published-course counts, admin CRUD. */
export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  list(includeInactive = false) {
    return this.repo.list(includeInactive).then((items) => ({ items }));
  }

  async exists(slug: string) {
    return !!(await this.repo.find(slug));
  }

  async create(input: CategoryInput) {
    if (await this.repo.find(input.slug)) throw new ConflictError(`Category "${input.slug}" exists`);
    return this.repo.create(input);
  }

  async update(slug: string, input: UpdateCategoryInput) {
    if (!(await this.repo.find(slug))) throw new NotFoundError('Category', slug);
    return this.repo.update(slug, input);
  }

  /** Only empty categories can go; otherwise hide them with `active: false`. */
  async delete(slug: string) {
    if (!(await this.repo.find(slug))) throw new NotFoundError('Category', slug);
    if ((await this.repo.courseCount(slug)) > 0) throw new ConflictError('Move its courses first, or hide the category instead');
    await this.repo.delete(slug);
    return { ok: true };
  }
}
