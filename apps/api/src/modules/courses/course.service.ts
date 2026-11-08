import {
  aedToFils,
  appleRecordedProductId,
  type AppleProductsInput,
  type CreateCourseInput,
  type PreviewLessonInput,
  type RecordedPricingInput,
  type ReviewDecisionInput, type Role,
  type UpdateCourseInput,
} from '@azza/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock, PaymentGateway } from '../../core/ports';
import type { Notifier } from '../notifications/notification.types';
import type { CourseFilter, CourseRecord, CourseRepository, CourseWriteData } from './course.repository';
import { effectivePreviewLessonId } from './preview-lesson';

/** What clients get: Stripe ids stay server-side, Apple ids come as one block. */
export type CourseDto<T extends CourseRecord = CourseRecord> = Omit<T, 'stripeProductId' | 'stripeMonthlyPriceId' | 'stripeYearlyPriceId' | 'teacherCutPercent' | 'appleSyncStatus' | 'appleSyncDetail' | 'appleSyncedAt'> & {
  appleProducts: { monthly: string | null; yearly: string | null } | null;
  /** Only admins and the course's author get this; everyone else gets no such field. */
  teacherCutPercent?: number | null;
  /** Last App Store product sync; only admins and the author get these (the detail is on the admin App Store status). */
  appleSyncStatus?: string | null;
  appleSyncedAt?: Date | null;
};

export type Viewer = { id: string; role: Role } | null;
type Actor = { id: string; role: Role };

/** The teacher's cut is private to admins and the author. */
const canSeeCut = (course: Pick<CourseRecord, 'createdById'>, viewer: Viewer) => viewer?.role === 'ADMIN' || (!!viewer && course.createdById === viewer.id);

export function present<T extends CourseRecord>(course: T, viewer: Viewer = null): CourseDto<T> {
  const { stripeProductId: _p, stripeMonthlyPriceId: _m, stripeYearlyPriceId: _y, teacherCutPercent, appleSyncStatus, appleSyncDetail: _d, appleSyncedAt, ...rest } = course;
  const monthly = course.appleMonthlyProductId ?? null;
  const yearly = course.appleYearlyProductId ?? null;
  return {
    ...rest,
    previewLessonId: previewLessonOf(course),
    ...(canSeeCut(course, viewer) && {
      teacherCutPercent: teacherCutPercent ?? null,
      appleSyncStatus: appleSyncStatus ?? null,
      appleSyncedAt: appleSyncedAt ?? null,
    }),
    type: course.type ?? 'LIVE',
    appleProducts: monthly || yearly ? { monthly, yearly } : null,
  } as unknown as CourseDto<T>;
}

/**
 * The preview lesson clients see on a recorded course: the effective one (the teacher's choice, else the first lesson), so the
 * "Watch the free lesson" buttons work without a choice. Without the syllabus loaded the stored value is kept.
 */
function previewLessonOf(course: CourseRecord): string | null {
  const stored = course.previewLessonId ?? null;
  if (course.type !== 'RECORDED' || !course.modules?.length || course.modules.some((m) => !m.lessons)) return stored;
  const lessons = course.modules.flatMap((m) => (m.lessons ?? []).map((l) => ({ id: l.id, order: l.order, moduleId: m.id })));
  return effectivePreviewLessonId(stored, course.modules, lessons);
}

/** Admin-only service methods present with the admin's view. */
const ADMIN_VIEWER: Viewer = { id: 'admin', role: 'ADMIN' };

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
    /** Syncs recorded-course prices to Stripe (omitted in unit tests that don't care). */
    private readonly payments?: Pick<PaymentGateway, 'upsertRecordedProduct'>,
    /** Creates the course's App Store products after its prices are set (fire-and-forget; omitted in most tests). */
    private readonly appleSync?: { recordedPricingChanged(courseId: string): void },
  ) {}

  /** Students see published courses; a teacher with `mine` sees their own proposals; admins see everything. */
  async list(
    filter: Omit<CourseFilter, 'status' | 'minPriceFils' | 'maxPriceFils'> & { status?: CourseFilter['status']; mine?: boolean; minPriceAed?: number; maxPriceAed?: number },
    viewer: Viewer,
  ) {
    const { mine, minPriceAed, maxPriceAed, ...f } = filter;
    const rest = {
      ...f,
      ...(minPriceAed !== undefined && { minPriceFils: aedToFils(minPriceAed) }),
      ...(maxPriceAed !== undefined && { maxPriceFils: aedToFils(maxPriceAed) }),
    };
    if (viewer?.role === 'ADMIN') return this.presentPage(await this.courses.list(rest), viewer);
    if (viewer?.role === 'TEACHER' && mine) return this.presentPage(await this.courses.list({ ...rest, createdById: viewer.id }), viewer);
    return this.presentPage(await this.courses.list({ ...rest, status: 'PUBLISHED' }), viewer);
  }

  private presentPage(page: { items: CourseRecord[]; total: number }, viewer: Viewer) {
    return { ...page, items: page.items.map((c) => present(c, viewer)) };
  }

  async get(idOrSlug: string, viewer: Viewer): Promise<CourseDto> {
    return present(await this.find(idOrSlug, viewer), viewer);
  }

  private async find(idOrSlug: string, viewer: Viewer): Promise<CourseRecord> {
    const course = (await this.courses.findById(idOrSlug)) ?? (await this.courses.findBySlug(idOrSlug));
    const visible = course && (course.status === 'PUBLISHED' || viewer?.role === 'ADMIN' || (viewer && course.createdById === viewer.id));
    if (!visible) throw new NotFoundError('Course', idOrSlug);
    return course;
  }

  /** Up to 4 published courses in the same category, then the same level. */
  async related(idOrSlug: string) {
    const course = await this.find(idOrSlug, null);
    return { items: (await this.courses.related(course, 4)).map((c) => present(c)) };
  }

  /** ADMIN creates in any state; a TEACHER's course starts as their DRAFT proposal. */
  async create(input: CreateCourseInput, actor: Actor) {
    await this.assertCategory(input.category);
    if (actor.role !== 'ADMIN') delete input.featuredRank;
    const slug = input.slug ?? (await this.freeSlug(slugify(input.titleEn)));
    if (await this.courses.findBySlug(slug)) throw new ConflictError(`Slug "${slug}" is taken`);
    return present(
      await this.courses.create({
        ...input,
        slug,
        ...(actor.role === 'TEACHER' && { status: 'DRAFT' as const, createdById: actor.id }),
      }),
      actor,
    );
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
    if (input.status === 'PUBLISHED') this.assertRecordedReady(existing);
    const wasPublished = existing.status === 'PUBLISHED';
    const updated = await this.courses.update(id, input);
    if (input.status === 'PUBLISHED' && !wasPublished) this.syncApple(updated);
    return present(updated, actor);
  }

  /** A recorded course that just went live (and has prices) gets its App Store products. Fire-and-forget. */
  private syncApple(course: CourseRecord) {
    if (course.type === 'RECORDED' && course.monthlyPriceFils && course.yearlyPriceFils) this.appleSync?.recordedPricingChanged(course.id);
  }

  /** ADMIN: store the plan prices and sync the course's Stripe Product and Prices. Changed amounts get new Prices. */
  async setRecordedPricing(id: string, input: RecordedPricingInput) {
    const course = await this.requireRecorded(id);
    const { monthlyPriceFils: monthly, yearlyPriceFils: yearly } = input;
    const synced = course.stripeProductId && course.stripeMonthlyPriceId && course.stripeYearlyPriceId;
    const unchanged = course.monthlyPriceFils === monthly && course.yearlyPriceFils === yearly;
    const stripe =
      this.payments && !(synced && unchanged)
        ? await this.payments.upsertRecordedProduct({
            productId: course.stripeProductId ?? undefined,
            name: course.titleEn,
            courseId: course.id,
            monthlyFils: monthly,
            yearlyFils: yearly,
            currentMonthlyPriceId: course.stripeMonthlyPriceId ?? undefined,
            currentYearlyPriceId: course.stripeYearlyPriceId ?? undefined,
          })
        : null;
    const updated = await this.courses.update(id, {
      monthlyPriceFils: monthly,
      yearlyPriceFils: yearly,
      priceFils: monthly,
      ...(stripe && { stripeProductId: stripe.productId, stripeMonthlyPriceId: stripe.monthlyPriceId, stripeYearlyPriceId: stripe.yearlyPriceId }),
    });
    this.appleSync?.recordedPricingChanged(id);
    return present(updated, ADMIN_VIEWER);
  }

  /**
   * ADMIN (after a VAT change): re-syncs the Stripe Prices of every published recorded course that has plan prices.
   * Stripe Prices are VAT-inclusive, so `upsertRecordedProduct` (which reads the VAT at call time) creates new Prices
   * for changed inclusive amounts and archives the old ones; subscribers keep theirs. One course failing never stops the rest.
   */
  async resyncRecordedStripePrices(log: (message: string, error?: unknown) => void = (m, e) => (e ? console.error(m, e) : console.info(m))) {
    const totals = { synced: 0, failed: 0, skipped: 0 };
    if (!this.payments) return totals;
    const { items } = await this.courses.list({ type: 'RECORDED', status: 'PUBLISHED', skip: 0, take: 10_000 });
    for (const course of items) {
      if (!course.monthlyPriceFils || !course.yearlyPriceFils) {
        totals.skipped++;
        continue;
      }
      try {
        const stripe = await this.payments.upsertRecordedProduct({
          productId: course.stripeProductId ?? undefined,
          name: course.titleEn,
          courseId: course.id,
          monthlyFils: course.monthlyPriceFils,
          yearlyFils: course.yearlyPriceFils,
          currentMonthlyPriceId: course.stripeMonthlyPriceId ?? undefined,
          currentYearlyPriceId: course.stripeYearlyPriceId ?? undefined,
        });
        await this.courses.update(course.id, { stripeProductId: stripe.productId, stripeMonthlyPriceId: stripe.monthlyPriceId, stripeYearlyPriceId: stripe.yearlyPriceId });
        totals.synced++;
      } catch (e) {
        totals.failed++;
        log(`[stripe] re-syncing the prices of course ${course.id} failed`, e);
      }
    }
    return totals;
  }

  /** Course editors: the one lesson anyone can watch. It must belong to this course. */
  async setPreviewLesson(id: string, input: PreviewLessonInput, actor: Actor) {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError('Course', id);
    assertCanEditCourse(course, actor);
    if (input.lessonId !== null && !course.modules.some((m) => m.lessons?.some((l) => l.id === input.lessonId))) {
      throw new NotFoundError('Lesson', input.lessonId);
    }
    return present(await this.courses.update(id, { previewLessonId: input.lessonId }), actor);
  }

  /** ADMIN: the App Store product ids of a recorded course. Each must be the id derived from the course slug. */
  async setAppleProducts(id: string, input: AppleProductsInput) {
    const course = await this.requireRecorded(id);
    const data: CourseWriteData = {};
    for (const [plan, key, value] of [
      ['MONTHLY', 'appleMonthlyProductId', input.monthly],
      ['YEARLY', 'appleYearlyProductId', input.yearly],
    ] as const) {
      if (value === undefined) continue;
      if (value !== null && value !== appleRecordedProductId(course.slug, plan)) {
        throw new BusinessRuleError(`Expected ${appleRecordedProductId(course.slug, plan)}`, 'APPLE_PRODUCT_MISMATCH');
      }
      data[key] = value;
    }
    return present(await this.courses.update(id, data), ADMIN_VIEWER);
  }

  private async requireRecorded(id: string) {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError('Course', id);
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Only recorded courses have plans', 'NOT_RECORDED');
    return course;
  }

  /** A RECORDED course goes live only with both prices and at least one lesson. */
  private assertRecordedReady(course: CourseRecord) {
    if (course.type !== 'RECORDED') return;
    const missing: Array<'PRICES' | 'LESSONS'> = [];
    if (!course.monthlyPriceFils || !course.yearlyPriceFils) missing.push('PRICES');
    if (!course.modules.some((m) => (m.lessons?.length ?? 0) > 0)) missing.push('LESSONS');
    if (missing.length) throw new BusinessRuleError('Add prices and a lesson before publishing', 'RECORDED_NOT_READY', { missing });
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
    return present(updated, actor);
  }

  /** ADMIN: approve (→ PUBLISHED) or send back with a note (→ DRAFT). */
  async review(id: string, decision: ReviewDecisionInput) {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError('Course', id);
    if (course.status !== 'PENDING_REVIEW') throw new BusinessRuleError('This course is not waiting for review', 'NOT_PENDING_REVIEW');
    if (decision.approve) this.assertRecordedReady(course);
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
    if (decision.approve) this.syncApple(updated);
    return present(updated, ADMIN_VIEWER);
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
