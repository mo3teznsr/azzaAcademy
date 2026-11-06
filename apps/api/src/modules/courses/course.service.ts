import { aedToFils, type CreateCourseInput, type ReviewDecisionInput, type Role, type UpdateCourseInput } from '@azza/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { Notifier } from '../notifications/notification.types';
import type { CourseFilter, CourseRecord, CourseRepository } from './course.repository';

type Viewer = { id: string; role: Role } | null;
type Actor = { id: string; role: Role };

/** Statuses in which the proposing teacher may still change their course. */
const TEACHER_EDITABLE = ['DRAFT', 'PENDING_REVIEW'] as const;

/**
 * The course-editing rule, shared with lessons: admins always; the proposing teacher only while their course
 * is DRAFT or PENDING_REVIEW (403 for anyone else, 422 `COURSE_LOCKED` once published).
 */
export function assertCanEditCourse(course: { status: string; createdById: string | null }, actor: Actor) {
  if (actor.role === 'ADMIN') return;
  if (actor.role !== 'TEACHER' || course.createdById !== actor.id) throw new ForbiddenError('Only the teacher who proposed this course can change it');
  if (!(TEACHER_EDITABLE as readonly string[]).includes(course.status)) {
    throw new BusinessRuleError('Published courses are changed by an admin', 'COURSE_LOCKED');
  }
}

export function slugify(title: string) {
  return (
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'course'
  );
}

export class CourseService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
    /** Validates `category` against the managed list (omitted in unit tests). */
    private readonly categories?: { exists(slug: string): Promise<boolean> },
  ) {}

  /** Students see published courses; a teacher with `mine` sees their own proposals; admins see everything. */
  list(
    filter: Omit<CourseFilter, 'status' | 'minPriceFils' | 'maxPriceFils'> & { status?: CourseFilter['status']; mine?: boolean; minPriceAed?: number; maxPriceAed?: number },
    viewer: Viewer,
  ) {
    const { mine, minPriceAed, maxPriceAed, ...f } = filter;
    const rest = {
      ...f,
      ...(minPriceAed !== undefined && { minPriceFils: aedToFils(minPriceAed) }),
      ...(maxPriceAed !== undefined && { maxPriceFils: aedToFils(maxPriceAed) }),
    };
    if (viewer?.role === 'ADMIN') return this.courses.list(rest);
    if (viewer?.role === 'TEACHER' && mine) return this.courses.list({ ...rest, createdById: viewer.id });
    return this.courses.list({ ...rest, status: 'PUBLISHED' });
  }

  async get(idOrSlug: string, viewer: Viewer): Promise<CourseRecord> {
    const course = (await this.courses.findById(idOrSlug)) ?? (await this.courses.findBySlug(idOrSlug));
    const visible = course && (course.status === 'PUBLISHED' || viewer?.role === 'ADMIN' || (viewer && course.createdById === viewer.id));
    if (!visible) throw new NotFoundError('Course', idOrSlug);
    return course;
  }

  /** Up to 4 published courses in the same category, then the same level. */
  async related(idOrSlug: string) {
    const course = await this.get(idOrSlug, null);
    return { items: await this.courses.related(course, 4) };
  }

  /** ADMIN creates in any state; a TEACHER's course starts as their DRAFT proposal. */
  async create(input: CreateCourseInput, actor: Actor) {
    await this.assertCategory(input.category);
    if (actor.role !== 'ADMIN') delete input.featuredRank;
    const slug = input.slug ?? (await this.freeSlug(slugify(input.titleEn)));
    if (await this.courses.findBySlug(slug)) throw new ConflictError(`Slug "${slug}" is taken`);
    return this.courses.create({
      ...input,
      slug,
      ...(actor.role === 'TEACHER' && { status: 'DRAFT' as const, createdById: actor.id }),
    });
  }

  async update(id: string, input: UpdateCourseInput, actor: Actor) {
    const existing = await this.courses.findById(id);
    if (!existing) throw new NotFoundError('Course', id);
    if (actor.role !== 'ADMIN') this.assertTeacherCanEdit(existing, actor);
    if (actor.role !== 'ADMIN' && input.status) throw new ForbiddenError('Submit the course for review instead of changing its status');
    if (actor.role !== 'ADMIN') delete input.featuredRank;
    if (input.category && input.category !== existing.category) await this.assertCategory(input.category);
    if (input.slug && input.slug !== existing.slug && (await this.courses.findBySlug(input.slug))) {
      throw new ConflictError(`Slug "${input.slug}" is taken`);
    }
    if (input.status === 'ARCHIVED' && (await this.courses.countActiveBatches(id)) > 0) {
      throw new BusinessRuleError('Close or complete active batches before archiving this course', 'COURSE_HAS_ACTIVE_BATCHES');
    }
    return this.courses.update(id, input);
  }

  /** TEACHER: send a DRAFT proposal to the admins. */
  async submit(id: string, actor: Actor) {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError('Course', id);
    this.assertTeacherCanEdit(course, actor);
    if (course.status !== 'DRAFT') throw new BusinessRuleError('This course is already waiting for review', 'ALREADY_SUBMITTED');
    if (course.descriptionEn.trim().length < 20 || course.modules.length === 0) {
      throw new BusinessRuleError('Add a description and at least one module before submitting', 'COURSE_INCOMPLETE');
    }
    const updated = await this.courses.update(id, { status: 'PENDING_REVIEW', submittedAt: this.clock.now(), reviewNote: null });
    await this.notifier.notifyRole('ADMIN', {
      type: 'COURSE_SUBMITTED',
      title: 'Course waiting for review',
      body: `${course.titleEn} was submitted by a teacher`,
      data: { courseId: id },
    });
    return updated;
  }

  /** ADMIN: approve (→ PUBLISHED) or send back with a note (→ DRAFT). */
  async review(id: string, decision: ReviewDecisionInput) {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError('Course', id);
    if (course.status !== 'PENDING_REVIEW') throw new BusinessRuleError('This course is not waiting for review', 'NOT_PENDING_REVIEW');
    const updated = await this.courses.update(
      id,
      decision.approve ? { status: 'PUBLISHED', reviewNote: null } : { status: 'DRAFT', reviewNote: decision.note ?? null },
    );
    if (course.createdById) {
      await this.notifier.notify([course.createdById], {
        type: decision.approve ? 'COURSE_APPROVED' : 'COURSE_CHANGES_REQUESTED',
        title: decision.approve ? 'Your course is live' : 'Your course needs changes',
        body: decision.approve ? `${course.titleEn} is now published` : `${course.titleEn}: ${decision.note}`,
        data: { courseId: id },
      });
    }
    return updated;
  }

  private assertTeacherCanEdit(course: CourseRecord, actor: Actor) {
    if (actor.role !== 'TEACHER') throw new ForbiddenError('Only the teacher who proposed this course can change it');
    assertCanEditCourse(course, actor);
  }

  private async assertCategory(slug: string) {
    if (this.categories && !(await this.categories.exists(slug))) {
      throw new BusinessRuleError('Pick a category from the list', 'UNKNOWN_CATEGORY');
    }
  }

  private async freeSlug(base: string) {
    for (let n = 1; n < 50; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      if (!(await this.courses.findBySlug(slug))) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
