import type { Db } from '../../infrastructure/db';

export interface CutSettings {
  liveCutPercent: number;
  recordedCutPercent: number;
}

/** Used until an admin changes it, and when the settings row is missing (a fresh database). */
export const DEFAULT_CUTS: CutSettings = { liveCutPercent: 60, recordedCutPercent: 60 };

export interface SettingsRepository {
  getCuts(): Promise<CutSettings>;
  saveCuts(cuts: CutSettings): Promise<CutSettings>;
  /** Returns null when the course does not exist. */
  setCourseCut(courseId: string, teacherCutPercent: number | null): Promise<{ id: string; type: 'LIVE' | 'RECORDED'; teacherCutPercent: number | null } | null>;
}

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  async getCuts(): Promise<CutSettings> {
    const row = await this.db.platformSettings.findUnique({ where: { id: 'default' }, select: { liveCutPercent: true, recordedCutPercent: true } });
    return row ?? { ...DEFAULT_CUTS };
  }

  saveCuts(cuts: CutSettings): Promise<CutSettings> {
    return this.db.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...cuts },
      update: cuts,
      select: { liveCutPercent: true, recordedCutPercent: true },
    });
  }

  async setCourseCut(courseId: string, teacherCutPercent: number | null) {
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) return null;
    return this.db.course.update({ where: { id: courseId }, data: { teacherCutPercent }, select: { id: true, type: true, teacherCutPercent: true } });
  }
}
