import type { CategoryInput, UpdateCategoryInput } from '@azza/shared';
import { AppError, ConflictError, NotFoundError } from '../../core/errors';
import type { FileStorage } from '../../core/ports';
import type { Db } from '../../infrastructure/db';
import { courseMediaFile } from '../admin/course-media-file';

/** Category images follow the course-cover rules (JPG/PNG/WEBP, same size limit) in their own folder. */
export const CATEGORY_IMAGE_FOLDER = 'category-images';

export interface CategoryRecord {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  icon: string | null;
  imageUrl: string | null;
  order: number;
  active: boolean;
}

export interface CategoryRepository {
  list(includeInactive: boolean): Promise<Array<CategoryRecord & { courseCount: number }>>;
  find(slug: string): Promise<CategoryRecord | null>;
  create(input: CategoryInput): Promise<CategoryRecord>;
  update(slug: string, input: UpdateCategoryInput): Promise<CategoryRecord>;
  delete(slug: string): Promise<void>;
  setImage(slug: string, imageUrl: string | null): Promise<CategoryRecord>;
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
  setImage(slug: string, imageUrl: string | null) {
    return this.db.category.update({ where: { slug }, data: { imageUrl } });
  }
  courseCount(slug: string) {
    return this.db.course.count({ where: { category: slug } });
  }
}

/** Managed course categories: public list with published-course counts, admin CRUD. */
export class CategoryService {
  constructor(
    private readonly repo: CategoryRepository,
    /** Where category images go (local disk in dev, S3 in production); omitted in tests that don't upload. */
    private readonly storage?: FileStorage,
    private readonly log: (message: string, error?: unknown) => void = (m, e) => console.error(m, e),
  ) {}

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
    const category = await this.repo.find(slug);
    if (!category) throw new NotFoundError('Category', slug);
    if ((await this.repo.courseCount(slug)) > 0) throw new ConflictError('Move its courses first, or hide the category instead');
    await this.repo.delete(slug);
    await this.removeStoredFile(category.imageUrl);
    return { ok: true };
  }

  /** ADMIN: validate (course-cover rules) → store under `category-images/` → set `imageUrl`; a replaced file of ours is deleted. */
  async uploadImage(slug: string, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }): Promise<CategoryRecord> {
    const category = await this.repo.find(slug);
    if (!category) throw new NotFoundError('Category', slug);
    const previous = category.imageUrl;
    const { extension } = courseMediaFile('course-cover', file);
    if (!this.storage) throw new AppError('File storage is not configured', 500, 'STORAGE_UNAVAILABLE');
    const stored = await this.storage.save({ folder: CATEGORY_IMAGE_FOLDER, extension, contentType: file.type.toLowerCase(), bytes: await file.bytes() });
    const updated = await this.repo.setImage(slug, stored.url);
    if (previous !== stored.url) await this.removeStoredFile(previous);
    return updated;
  }

  /** ADMIN: clears `imageUrl` and deletes the stored file when it is ours (the icon is shown again). */
  async removeImage(slug: string): Promise<CategoryRecord> {
    const category = await this.repo.find(slug);
    if (!category) throw new NotFoundError('Category', slug);
    const previous = category.imageUrl;
    const updated = previous === null ? category : await this.repo.setImage(slug, null);
    await this.removeStoredFile(previous);
    return updated;
  }

  /** Best effort: a file we can't delete is only orphaned, never an error for the admin. */
  private async removeStoredFile(url: string | null) {
    if (!url || !this.storage?.delete) return;
    const key = this.storage.keyFromUrl(url);
    if (!key) return;
    try {
      await this.storage.delete(key);
    } catch (e) {
      this.log(`[categories] could not delete ${key}`, e);
    }
  }
}
