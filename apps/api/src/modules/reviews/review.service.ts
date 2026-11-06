import type { CourseReviewInput, Role } from '@azza/shared';
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
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; image: string | null };
}

export interface ReviewRepository {
  courseExists(courseId: string): Promise<{ id: string; titleEn: string } | null>;
  list(courseId: string, opts: { includeHidden: boolean; skip: number; take: number }): Promise<{ items: ReviewRecord[]; total: number }>;
  distribution(courseId: string): Promise<Record<1 | 2 | 3 | 4 | 5, number>>;
  find(id: string): Promise<ReviewRecord | null>;
  findMine(courseId: string, userId: string): Promise<ReviewRecord | null>;
  /** Student has an ACTIVE enrollment in a batch of this course that has delivered at least one session. */
  canReview(courseId: string, userId: string): Promise<boolean>;
  upsert(courseId: string, userId: string, input: CourseReviewInput): Promise<ReviewRecord>;
  delete(id: string): Promise<void>;
  update(id: string, data: Partial<Pick<ReviewRecord, 'teacherReply' | 'repliedAt' | 'hidden'>>): Promise<ReviewRecord>;
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
    const review = await this.repo.upsert(courseId, actor.id, input);
    await this.repo.refreshAggregate(courseId);
    if (!existed) {
      const teachers = await this.repo.teacherIds(courseId);
      if (teachers.length) {
        await this.notifier.notify(teachers, {
          type: 'COURSE_REVIEWED',
          title: `New ${input.rating}★ review`,
          body: `${course.titleEn}${input.body ? `: ${input.body.slice(0, 120)}` : ''}`,
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
      data: { courseId: review.courseId, reviewId: id },
    });
    return updated;
  }

  /** ADMIN moderation: hidden reviews drop out of the public list and the average. */
  async moderate(id: string, hidden: boolean) {
    const review = await this.repo.find(id);
    if (!review) throw new NotFoundError('Review', id);
    const updated = await this.repo.update(id, { hidden });
    await this.repo.refreshAggregate(review.courseId);
    return updated;
  }
}
