import { aedToFils, type CreateCourseInput, type Role, type UpdateCourseInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../core/errors';
import type { CourseFilter, CourseRecord, CourseRepository } from './course.repository';

export class CourseService {
  constructor(private readonly courses: CourseRepository) {}

  /** Students only ever see published courses. */
  list(filter: Omit<CourseFilter, 'status'> & { status?: CourseFilter['status'] }, viewerRole: Role | null) {
    const status = viewerRole === 'ADMIN' ? filter.status : 'PUBLISHED';
    return this.courses.list({ ...filter, status });
  }

  async get(idOrSlug: string, viewerRole: Role | null): Promise<CourseRecord> {
    const course = (await this.courses.findById(idOrSlug)) ?? (await this.courses.findBySlug(idOrSlug));
    if (!course || (course.status !== 'PUBLISHED' && viewerRole !== 'ADMIN')) throw new NotFoundError('Course', idOrSlug);
    return course;
  }

  async create(input: CreateCourseInput) {
    if (await this.courses.findBySlug(input.slug)) throw new ConflictError(`Slug "${input.slug}" is taken`);
    const { priceAed, ...rest } = input;
    return this.courses.create({ ...rest, priceFils: aedToFils(priceAed) });
  }

  async update(id: string, input: UpdateCourseInput) {
    const existing = await this.courses.findById(id);
    if (!existing) throw new NotFoundError('Course', id);
    if (input.slug && input.slug !== existing.slug && (await this.courses.findBySlug(input.slug))) {
      throw new ConflictError(`Slug "${input.slug}" is taken`);
    }
    if (input.status === 'ARCHIVED' && (await this.courses.countActiveBatches(id)) > 0) {
      throw new BusinessRuleError('Close or complete active batches before archiving this course', 'COURSE_HAS_ACTIVE_BATCHES');
    }
    const { priceAed, ...rest } = input;
    return this.courses.update(id, { ...rest, ...(priceAed !== undefined && { priceFils: aedToFils(priceAed) }) });
  }
}
