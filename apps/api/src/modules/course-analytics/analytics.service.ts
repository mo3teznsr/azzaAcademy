import { INACTIVE_AFTER_DAYS, type Role } from '@azza/shared';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { LessonAccess } from '../lesson-qa/qa.service';
import { isInstructor } from '../lesson-qa/qa-policy';
import { inactiveLearners, lastActivityByUser, lessonFunnel } from './analytics-math';
import type { CourseAnalyticsRepository } from './analytics.repository';

/**
 * `GET /teacher/courses/:courseId/analytics` — for the author of a recorded course and admins: per lesson in curriculum
 * order (starters, completions, average share watched, drop-off to the next lesson) and the learners on a live plan who
 * have been idle for `INACTIVE_AFTER_DAYS` days. Teachers see learners' names only, never emails.
 */
export class CourseAnalyticsService {
  constructor(
    private readonly repo: CourseAnalyticsRepository,
    private readonly lessons: Pick<LessonAccess, 'courseLessons'>,
    private readonly clock: Clock,
  ) {}

  async forCourse(courseIdOrSlug: string, viewer: { id: string; role: Role }) {
    const found = await this.lessons.courseLessons(courseIdOrSlug);
    if (!found) throw new NotFoundError('Course', courseIdOrSlug);
    const { course, lessons } = found;
    if (!isInstructor(viewer, course)) throw new ForbiddenError('Only the course author can see its analytics');
    if (course.type !== 'RECORDED') throw new BusinessRuleError('Analytics are for recorded courses', 'ANALYTICS_RECORDED_ONLY');

    const now = this.clock.now();
    const [activity, learners] = await Promise.all([this.repo.activity(lessons.map((l) => l.id)), this.repo.liveLearners(course.id)]);
    const funnel = lessonFunnel(lessons, activity);
    const last = lastActivityByUser(activity);
    const inactive = inactiveLearners(learners, last, now);
    return {
      course: { id: course.id, slug: course.slug, titleEn: course.titleEn, titleAr: course.titleAr },
      generatedAt: now,
      liveLearners: learners.length,
      learnersStarted: new Set(activity.map((a) => a.userId)).size,
      inactiveAfterDays: INACTIVE_AFTER_DAYS,
      lessons: funnel,
      inactive: inactive.map((l) => ({ id: l.userId, name: l.name, lastActiveAt: l.lastActiveAt })),
    };
  }
}
