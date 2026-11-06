import type { LessonInput, ReorderLessonsInput, Role, UpdateLessonInput } from '@azza/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import { assertCanEditCourse } from '../courses/course.service';
import type { LessonCourse, LessonRepository } from './lesson.repository';

type Actor = { id: string; role: Role };

/**
 * Lessons are part of the course curriculum:
 * - written by admins and the proposing teacher, under the course-editing rule (`assertCanEditCourse`);
 * - read by admins, the proposing teacher, teachers of a batch of the course and students with an ACTIVE enrollment
 *   in any batch of the course. Everyone else sees lesson titles only, on the public course page.
 */
export class LessonService {
  constructor(private readonly repo: LessonRepository) {}

  async list(courseIdOrSlug: string, viewer: Actor) {
    const course = await this.course(courseIdOrSlug);
    await this.assertCanRead(course, viewer);
    const lessons = await this.repo.lessonsOfModules(course.modules.map((m) => m.id));
    const { modules, createdById: _c, ...rest } = course;
    return {
      course: rest,
      modules: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) })),
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

  private async assertCanRead(course: LessonCourse, viewer: Actor) {
    if (viewer.role === 'ADMIN' || course.createdById === viewer.id) return;
    if (viewer.role === 'TEACHER' && (await this.repo.teachesCourse(course.id, viewer.id))) return;
    if (await this.repo.isActiveStudent(course.id, viewer.id)) return;
    throw new ForbiddenError('Lessons open once you are enrolled in a batch of this course');
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
