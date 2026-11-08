import type { CourseCutInput, CutSettingsInput, Role } from '@azza/shared';
import { ForbiddenError, NotFoundError } from '../../core/errors';
import type { CutSettings, SettingsRepository } from './settings.repository';

type Actor = { id: string; role: Role };
type CourseType = 'LIVE' | 'RECORDED';

/** The teacher's cut for a course: its own override when set, else the default for its type. */
export function cutFor(course: { type: CourseType; teacherCutPercent: number | null }, cuts: CutSettings): number {
  if (course.teacherCutPercent !== null) return course.teacherCutPercent;
  return course.type === 'RECORDED' ? cuts.recordedCutPercent : cuts.liveCutPercent;
}

/** Cuts are read at payment time; changing them never touches earnings that were already accrued. */
export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  cuts(): Promise<CutSettings> {
    return this.repo.getCuts();
  }

  async updateCuts(input: CutSettingsInput, actor: Actor): Promise<CutSettings> {
    if (actor.role !== 'ADMIN') throw new ForbiddenError('Only admins can change the teacher cuts');
    return this.repo.saveCuts({ liveCutPercent: input.liveCutPercent, recordedCutPercent: input.recordedCutPercent });
  }

  async setCourseCut(courseId: string, input: CourseCutInput, actor: Actor) {
    if (actor.role !== 'ADMIN') throw new ForbiddenError('Only admins can change a course cut');
    const course = await this.repo.setCourseCut(courseId, input.teacherCutPercent);
    if (!course) throw new NotFoundError('Course', courseId);
    return course;
  }
}
