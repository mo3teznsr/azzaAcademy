import { TESTIMONIAL_MIN_LENGTH, type CourseReviewInput, type Role } from '@azza/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Notifier } from '../notifications/notification.types';

type Actor = { id: string; role: Role };

export interface ReviewRecord {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  body: string;
  teacherReply: string | null;
  repliedAt: Date | null;
  hidden: boolean;
  /** The learner agreed that Azza may quote this review on its website. */
  quoteConsent: boolean;
  /** Set while an admin features the review as a testimonial. */
  featuredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; image: string | null };
}

/** What the learner writes; `featuredAt: null` unfeatures in the same write. */
export type ReviewWrite = { rating: number; body: string; quoteConsent?: boolean; featuredAt?: null };
export type ReviewPatch = Partial<Pick<ReviewRecord, 'teacherReply' | 'repliedAt' | 'hidden' | 'featuredAt'>>;

/** A review with its course, for the testimonial lists. */
export type TestimonialRecord = ReviewRecord & { course: { id: string; slug: string; titleEn: string; titleAr: string | null } };

/** True when a review may be shown as a testimonial: consent given, visible, and enough text to quote. */
export function quotable(r: Pick<ReviewRecord, 'quoteConsent' | 'hidden' | 'body'>): boolean {
  return r.quoteConsent && !r.hidden && r.body.trim().length >= TESTIMONIAL_MIN_LENGTH;
}

/** Arabic compound first names ("عبد الله", "أبو بكر") keep both words. */
const COMPOUND_PREFIX = new Set(['عبد', 'عبدال', 'أبو', 'ابو', 'abd', 'abdul', 'abu']);

/** The learner's first name only; testimonials never show the full name. */
export function firstName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.length > 1 && COMPOUND_PREFIX.has(words[0]!.toLowerCase()) ? `${words[0]} ${words[1]}` : words[0]!;
}

export interface ReviewRepository {
  courseExists(courseId: string): Promise<{ id: string; titleEn: string; titleAr?: string | null } | null>;
  list(courseId: string, opts: { includeHidden: boolean; skip: number; take: number }): Promise<{ items: ReviewRecord[]; total: number }>;
  distribution(courseId: string): Promise<Record<1 | 2 | 3 | 4 | 5, number>>;
  find(id: string): Promise<ReviewRecord | null>;
  findMine(courseId: string, userId: string): Promise<ReviewRecord | null>;
  /** Student has an ACTIVE enrollment in a batch of this course that has delivered at least one session. */
  canReview(courseId: string, userId: string): Promise<boolean>;
  upsert(courseId: string, userId: string, input: ReviewWrite): Promise<ReviewRecord>;
  delete(id: string): Promise<void>;
  update(id: string, data: ReviewPatch): Promise<ReviewRecord>;
  /** Featured, consented, visible reviews of published courses (one course or all), newest pick first. */
  featured(opts: { courseId?: string; take: number }): Promise<TestimonialRecord[]>;
  /** ADMIN: reviews whose authors consented to be quoted. */
  consented(opts: { featured?: boolean; courseId?: string; skip: number; take: number }): Promise<{ items: TestimonialRecord[]; total: number }>;
  /** Recomputes `Course.ratingAvg` / `ratingCount` from visible reviews. */
  refreshAggregate(courseId: string): Promise<{ ratingAvg: number; ratingCount: number }>;
  teacherIds(courseId: string): Promise<string[]>;
}

export class ReviewService {
  constructor(
    private readonly repo: ReviewRepository,
    private readonly notifier: Notifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(idOrSlug: string, page: number, pageSize: number, viewer: Actor | null) {
    const course = await this.repo.courseExists(idOrSlug);
    if (!course) throw new NotFoundError('Course', idOrSlug);
    const courseId = course.id;
    const includeHidden = viewer?.role === 'ADMIN';
    const [{ items, total }, distribution, mine, canReview] = await Promise.all([
      this.repo.list(courseId, { includeHidden, skip: (page - 1) * pageSize, take: pageSize }),
      this.repo.distribution(courseId),
      viewer ? this.repo.findMine(courseId, viewer.id) : null,
      viewer?.role === 'STUDENT' ? this.repo.canReview(courseId, viewer.id) : false,
    ]);
    const count = Object.values(distribution).reduce((a, b) => a + b, 0);
    const sum = Object.entries(distribution).reduce((a, [k, v]) => a + Number(k) * v, 0);
    return {
      items,
      total,
      page,
      pageSize,
      summary: { ratingAvg: count ? Math.round((sum / count) * 10) / 10 : 0, ratingCount: count, distribution },
      mine,
      canReview,
    };
  }

  /** STUDENT: create or edit their one review for the course. */
  async upsert(idOrSlug: string, input: CourseReviewInput, actor: Actor) {
    const course = await this.repo.courseExists(idOrSlug);
    if (!course) throw new NotFoundError('Course', idOrSlug);
    const courseId = course.id;
    if (actor.role !== 'STUDENT') throw new ForbiddenError('Only students review courses');
    if (!(await this.repo.canReview(courseId, actor.id))) {
      throw new BusinessRuleError('You can review this course after attending a session', 'REVIEW_NOT_ELIGIBLE');
    }
    const existed = await this.repo.findMine(courseId, actor.id);
    const write: ReviewWrite = { rating: input.rating, body: input.body };
    if (input.quoteConsent !== undefined) write.quoteConsent = input.quoteConsent;
    // A featured review leaves the website as soon as it stops being quotable (consent withdrawn, text cut short).
    if (existed?.featuredAt && !quotable({ quoteConsent: input.quoteConsent ?? existed.quoteConsent, hidden: existed.hidden, body: input.body })) {
      write.featuredAt = null;
    }
    const review = await this.repo.upsert(courseId, actor.id, write);
    await this.repo.refreshAggregate(courseId);
    if (!existed) {
      const teachers = await this.repo.teacherIds(courseId);
      if (teachers.length) {
        await this.notifier.notify(teachers, {
          type: 'COURSE_REVIEWED',
          title: `New ${input.rating}★ review`,
          body: `${course.titleEn}${input.body ? `: ${input.body.slice(0, 120)}` : ''}`,
          ar: { title: `تقييم جديد ${input.rating}★`, body: `${course.titleAr ?? course.titleEn}${input.body ? `: ${input.body.slice(0, 120)}` : ''}` },
          data: { courseId, reviewId: review.id },
        });
      }
    }
    return review;
  }

  async deleteMine(idOrSlug: string, actor: Actor) {
    const courseId = (await this.repo.courseExists(idOrSlug))?.id ?? idOrSlug;
    const mine = await this.repo.findMine(courseId, actor.id);
    if (!mine) throw new NotFoundError('Review', courseId);
    await this.repo.delete(mine.id);
    await this.repo.refreshAggregate(courseId);
    return { ok: true };
  }

  /** A teacher of the course (or an admin) answers publicly; an empty reply is not allowed, edit by replying again. */
  async reply(id: string, reply: string, actor: Actor) {
    const review = await this.repo.find(id);
    if (!review) throw new NotFoundError('Review', id);
    if (actor.role !== 'ADMIN' && !(await this.repo.teacherIds(review.courseId)).includes(actor.id)) throw new ForbiddenError();
    const updated = await this.repo.update(id, { teacherReply: reply, repliedAt: this.now() });
    await this.notifier.notify([review.userId], {
      type: 'COURSE_REVIEW_REPLIED',
      title: 'Your review got a reply',
      body: reply.slice(0, 140),
      ar: { title: 'وصلك ردّ على تقييمك', body: reply.slice(0, 140) },
      data: { courseId: review.courseId, reviewId: id },
    });
    return updated;
  }

  /** ADMIN moderation: hidden reviews drop out of the public list and the average. */
  async moderate(id: string, hidden: boolean) {
    const review = await this.repo.find(id);
    if (!review) throw new NotFoundError('Review', id);
    const updated = await this.repo.update(id, hidden ? { hidden, featuredAt: null } : { hidden });
    await this.repo.refreshAggregate(review.courseId);
    return updated;
  }

  /**
   * ADMIN: feature or unfeature a review as a testimonial. Only genuine reviews qualify: the learner attended
   * (still enrolled in a class that has met), agreed to be quoted, the review is visible and has text to quote.
   */
  async feature(id: string, featured: boolean) {
    const review = await this.repo.find(id);
    if (!review) throw new NotFoundError('Review', id);
    if (!featured) return this.repo.update(id, { featuredAt: null });
    if (!review.quoteConsent) throw new BusinessRuleError('The learner has not agreed to be quoted', 'TESTIMONIAL_NO_CONSENT');
    if (review.hidden) throw new BusinessRuleError('Hidden reviews cannot be featured', 'TESTIMONIAL_HIDDEN');
    if (review.body.trim().length < TESTIMONIAL_MIN_LENGTH) throw new BusinessRuleError('The review is too short to quote', 'TESTIMONIAL_TOO_SHORT');
    if (!(await this.repo.canReview(review.courseId, review.userId))) {
      throw new BusinessRuleError('The learner is no longer enrolled in this course', 'TESTIMONIAL_NOT_ELIGIBLE');
    }
    return review.featuredAt ? review : this.repo.update(id, { featuredAt: this.now() });
  }

  /** Public: featured testimonials, with the learner's first name and the course only. */
  async testimonials(courseIdOrSlug: string | undefined, limit: number) {
    let courseId: string | undefined;
    if (courseIdOrSlug) {
      const course = await this.repo.courseExists(courseIdOrSlug);
      if (!course) return { items: [] };
      courseId = course.id;
    }
    const rows = await this.repo.featured({ courseId, take: limit });
    return {
      items: rows.filter(quotable).map((r) => ({
        id: r.id,
        firstName: firstName(r.user.name),
        body: r.body.trim(),
        course: { slug: r.course.slug, titleEn: r.course.titleEn, titleAr: r.course.titleAr },
      })),
    };
  }

  /** ADMIN: consented reviews, with whether each can be featured right now. */
  async consented(opts: { featured?: boolean; courseId?: string; page: number; pageSize: number }) {
    const { items, total } = await this.repo.consented({ featured: opts.featured, courseId: opts.courseId, skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize });
    return {
      items: items.map((r) => ({ ...r, firstName: firstName(r.user.name), quotable: quotable(r) })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }
}
