import type { LessonInput, ReorderLessonsInput, Role, UpdateLessonInput, VideoPositionInput } from '@azza/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError, PlanRequiredError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import { assertCanEditCourse } from '../courses/course.service';
import { effectivePreviewLessonId } from '../courses/preview-lesson';
import { canAccessRecorded } from '../subscriptions/access-policy';
import type { LessonCourse, LessonRepository } from './lesson.repository';

type Actor = { id: string; role: Role };

/**
 * Lessons are part of the course curriculum:
 * - written by admins and the proposing teacher, under the course-editing rule (`assertCanEditCourse`);
 * - LIVE courses are read by admins, the proposing teacher, teachers of a batch of the course and students with an ACTIVE
 *   enrollment in any batch of the course. Everyone else sees lesson titles only, on the public course page.
 * - RECORDED courses are read by admins, the author and subscribers (`canAccessRecorded`). Anyone else gets the lesson
 *   titles with `locked: true` and the one preview lesson open (the teacher's choice, else the first lesson in curriculum
 *   order); opening a locked lesson is 403 `PLAN_REQUIRED`.
 */
export class LessonService {
  constructor(
    private readonly repo: LessonRepository,
    private readonly clock: Clock = { now: () => new Date() },
    /** Told after a lesson is completed (the certificate check). Failures are logged, never thrown. */
    private readonly onCourseProgress?: (userId: string, courseId: string) => Promise<unknown>,
  ) {}

  async list(courseIdOrSlug: string, viewer: Actor) {
    const course = await this.course(courseIdOrSlug);
    const denied = await this.denial(course, viewer);
    if (denied && course.type !== 'RECORDED') throw denied;
    // Drafts and other unpublished recorded courses stay staff-only: no titles, no preview.
    if (denied && course.status !== 'PUBLISHED') throw new NotFoundError('Course', courseIdOrSlug);
    const lessons = await this.repo.lessonsOfModules(course.modules.map((m) => m.id));
    const done = new Set(await this.repo.completedLessonIds(viewer.id, lessons.map((l) => l.id)));
    const { modules, createdById: _c, ...rest } = course;
    // The teacher's preview lesson, or the first lesson when none (or a deleted one) is set.
    const previewLessonId = course.type === 'RECORDED' ? effectivePreviewLessonId(course.previewLessonId, modules, lessons) : course.previewLessonId;
    const present = (l: (typeof lessons)[number]) => {
      const completed = done.has(l.id);
      if (course.type !== 'RECORDED') return { ...l, completed };
      if (!denied || l.id === previewLessonId) return { ...l, completed, locked: false as const };
      return { id: l.id, moduleId: l.moduleId, order: l.order, titleEn: l.titleEn, titleAr: l.titleAr, completed, locked: true as const };
    };
    return {
      course: { ...rest, previewLessonId },
      progress: this.summary(course, lessons, done),
      modules: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id).map(present) })),
    };
  }

  /** `GET /lessons/:id` — one lesson for a reader, with their saved video position. */
  async get(lessonId: string, viewer: Actor) {
    const { lesson, course } = await this.lessonOf(lessonId);
    await this.assertCanRead(course, viewer);
    const [done, position] = await Promise.all([this.repo.completedLessonIds(viewer.id, [lessonId]), this.repo.videoPosition(viewer.id, lessonId)]);
    return { ...lesson, courseId: course.id, completed: done.length > 0, videoPositionSec: position ?? 0 };
  }

  /** `GET /lessons/:id/preview` — public: only the preview lesson (the teacher's choice, else the first lesson) of a PUBLISHED recorded course. */
  async preview(lessonId: string) {
    const lesson = await this.repo.find(lessonId);
    const courseId = lesson ? await this.repo.courseOfLesson(lessonId) : null;
    const course = courseId ? await this.repo.findCourse(courseId) : null;
    if (!lesson || !course || course.type !== 'RECORDED' || course.status !== 'PUBLISHED') throw new NotFoundError('Lesson', lessonId);
    const lessons = await this.repo.lessonsOfModules(course.modules.map((m) => m.id));
    if (effectivePreviewLessonId(course.previewLessonId, course.modules, lessons) !== lessonId) throw new NotFoundError('Lesson', lessonId);
    return { ...lesson, courseId: course.id, locked: false as const };
  }

  /** `PUT /lessons/:id/video-position` — under the same read rule as the lesson. */
  async saveVideoPosition(lessonId: string, input: VideoPositionInput, viewer: Actor) {
    const { course } = await this.lessonOf(lessonId);
    await this.assertCanRead(course, viewer);
    await this.repo.setVideoPosition(viewer.id, lessonId, input.positionSec);
    return { lessonId, positionSec: input.positionSec };
  }

  /** `PUT|DELETE /lessons/:id/complete` — the reader marks a lesson done (or undone). */
  async setCompleted(lessonId: string, completed: boolean, viewer: Actor) {
    const courseId = await this.repo.courseOfLesson(lessonId);
    if (!courseId) throw new NotFoundError('Lesson', lessonId);
    await this.assertCanRead(await this.course(courseId), viewer);
    await this.repo.setCompleted(viewer.id, lessonId, completed);
    if (completed && this.onCourseProgress) {
      try {
        await this.onCourseProgress(viewer.id, courseId);
      } catch (err) {
        console.error('[certificates] issue after lesson completion failed', err);
      }
    }
    return { lessonId, completed };
  }

  /**
   * `GET /me/learning-progress` — per course: lessons done / total and the next lesson to open. Recorded courses carry
   * the learner's plan (`subscription`, null when they never had one); a lapsed course with progress is still listed.
   */
  async myProgress(viewer: Actor) {
    const items = [];
    const now = this.clock.now();
    for (const courseId of await this.repo.activeCourseIds(viewer.id)) {
      const course = await this.repo.findCourse(courseId);
      if (!course) continue;
      const lessons = await this.repo.lessonsOfModules(course.modules.map((m) => m.id));
      const done = new Set(await this.repo.completedLessonIds(viewer.id, lessons.map((l) => l.id)));
      const base = { courseId: course.id, slug: course.slug, titleEn: course.titleEn, titleAr: course.titleAr, type: course.type, ...this.summary(course, lessons, done) };
      if (course.type !== 'RECORDED') {
        items.push(base);
        continue;
      }
      const sub = await this.repo.learnerSubscription(course.id, viewer.id);
      // Staff read their own course without a plan (as on the lesson routes).
      const staff = viewer.role === 'ADMIN' || course.createdById === viewer.id;
      items.push({
        ...base,
        subscription: sub
          ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, hasAccess: staff || canAccessRecorded(sub, now) }
          : null,
      });
    }
    return { items };
  }

  /** Lessons in curriculum order (module order, then lesson order); the next one is the first not done. */
  private summary(course: LessonCourse, lessons: Array<{ id: string; moduleId: string; order: number; titleEn: string; titleAr: string | null }>, done: Set<string>) {
    const moduleOrder = new Map(course.modules.map((m, i) => [m.id, i]));
    const ordered = [...lessons].sort((a, b) => (moduleOrder.get(a.moduleId) ?? 0) - (moduleOrder.get(b.moduleId) ?? 0) || a.order - b.order);
    const next = ordered.find((l) => !done.has(l.id)) ?? null;
    const mod = next ? course.modules.find((m) => m.id === next.moduleId) : null;
    return {
      completed: ordered.filter((l) => done.has(l.id)).length,
      total: ordered.length,
      nextLesson: next && mod ? { id: next.id, titleEn: next.titleEn, titleAr: next.titleAr, moduleId: mod.id, moduleTitleEn: mod.titleEn, moduleTitleAr: mod.titleAr } : null,
    };
  }

  async create(courseId: string, moduleId: string, input: LessonInput, actor: Actor) {
    const course = await this.editableModule(courseId, moduleId, actor);
    const siblings = await this.repo.lessonsOfModules([moduleId]);
    const { order, videoUrl, ...data } = input;
    const lesson = await this.repo.create(moduleId, { ...data, videoUrl: videoUrl ?? null, order: order ?? siblings.length });
    if (order !== undefined && order < siblings.length) {
      const ids = siblings.map((l) => l.id);
      ids.splice(order, 0, lesson.id);
      await this.repo.setOrder(ids);
      return { ...lesson, order, courseId: course.id };
    }
    return { ...lesson, courseId: course.id };
  }

  async update(courseId: string, moduleId: string, lessonId: string, input: UpdateLessonInput, actor: Actor) {
    await this.editableModule(courseId, moduleId, actor);
    await this.lessonIn(moduleId, lessonId);
    const { order: _order, ...data } = input; // position changes go through `reorder`
    return this.repo.update(lessonId, data);
  }

  async remove(courseId: string, moduleId: string, lessonId: string, actor: Actor) {
    await this.editableModule(courseId, moduleId, actor);
    await this.lessonIn(moduleId, lessonId);
    await this.repo.delete(lessonId);
    const rest = await this.repo.lessonsOfModules([moduleId]);
    if (rest.length) await this.repo.setOrder(rest.map((l) => l.id));
    return { ok: true };
  }

  async reorder(courseId: string, moduleId: string, input: ReorderLessonsInput, actor: Actor) {
    await this.editableModule(courseId, moduleId, actor);
    const current = await this.repo.lessonsOfModules([moduleId]);
    const same = input.ids.length === current.length && new Set(input.ids).size === current.length && current.every((l) => input.ids.includes(l.id));
    if (!same) throw new BusinessRuleError('Send every lesson of the module exactly once', 'LESSON_ORDER_MISMATCH');
    await this.repo.setOrder(input.ids);
    return { items: await this.repo.lessonsOfModules([moduleId]) };
  }

  private async course(idOrSlug: string) {
    const course = await this.repo.findCourse(idOrSlug);
    if (!course) throw new NotFoundError('Course', idOrSlug);
    return course;
  }

  private async lessonOf(lessonId: string) {
    const lesson = await this.repo.find(lessonId);
    const courseId = lesson ? await this.repo.courseOfLesson(lessonId) : null;
    if (!lesson || !courseId) throw new NotFoundError('Lesson', lessonId);
    return { lesson, course: await this.course(courseId) };
  }

  private async assertCanRead(course: LessonCourse, viewer: Actor) {
    const denied = await this.denial(course, viewer);
    if (denied) throw denied;
  }

  /** Why this viewer cannot read the course's lessons, or null when they can. */
  private async denial(course: LessonCourse, viewer: Actor) {
    if (viewer.role === 'ADMIN' || course.createdById === viewer.id) return null;
    if (course.type === 'RECORDED') {
      if (canAccessRecorded(await this.repo.recordedSubscription(course.id, viewer.id), this.clock.now())) return null;
      return new PlanRequiredError(course.slug, await this.repo.hadSubscription(course.id, viewer.id));
    }
    if (viewer.role === 'TEACHER' && (await this.repo.teachesCourse(course.id, viewer.id))) return null;
    if (await this.repo.isActiveStudent(course.id, viewer.id)) return null;
    return new ForbiddenError('Lessons open once you are enrolled in a batch of this course');
  }

  private async editableModule(courseId: string, moduleId: string, actor: Actor) {
    const course = await this.course(courseId);
    if (course.id !== courseId) throw new NotFoundError('Course', courseId);
    assertCanEditCourse(course, actor);
    if (!course.modules.some((m) => m.id === moduleId)) throw new NotFoundError('Module', moduleId);
    return course;
  }

  private async lessonIn(moduleId: string, lessonId: string) {
    const lesson = await this.repo.find(lessonId);
    if (!lesson || lesson.moduleId !== moduleId) throw new NotFoundError('Lesson', lessonId);
    return lesson;
  }
}
