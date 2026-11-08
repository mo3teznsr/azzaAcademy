import type { CourseType, LessonAttachment } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { AccessSubscription } from '../subscriptions/access-policy';
import { everSubscribed, learnerSubscription, newestLiveSubscription, type LearnerSubscription } from '../subscriptions/recorded-subscription';

export type RecordedSubscription = AccessSubscription;

export interface LessonRecord {
  id: string;
  moduleId: string;
  order: number;
  titleEn: string;
  titleAr: string | null;
  bodyEn: string;
  bodyAr: string | null;
  videoUrl: string | null;
  attachments: LessonAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonCourse {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  status: string;
  createdById: string | null;
  type: CourseType;
  /** A recorded course's free lesson; may point at a deleted lesson. */
  previewLessonId: string | null;
  modules: Array<{ id: string; order: number; titleEn: string; titleAr: string | null; descriptionEn: string | null; descriptionAr: string | null }>;
}

export interface LessonWriteData {
  order?: number;
  titleEn?: string;
  titleAr?: string | null;
  bodyEn?: string;
  bodyAr?: string | null;
  videoUrl?: string | null;
  attachments?: LessonAttachment[];
}

/** Persistence port for lessons — services never see Prisma. */
export interface LessonRepository {
  /** By id or slug, with its modules in order. */
  findCourse(idOrSlug: string): Promise<LessonCourse | null>;
  lessonsOfModules(moduleIds: string[]): Promise<LessonRecord[]>;
  find(id: string): Promise<LessonRecord | null>;
  create(moduleId: string, data: LessonWriteData & { titleEn: string; order: number }): Promise<LessonRecord>;
  update(id: string, data: LessonWriteData): Promise<LessonRecord>;
  delete(id: string): Promise<void>;
  /** `ids[i]` gets order `i`. */
  setOrder(ids: string[]): Promise<void>;
  /** ACTIVE enrollment in any batch of the course. */
  isActiveStudent(courseId: string, userId: string): Promise<boolean>;
  /** Teaches a batch of the course. */
  teachesCourse(courseId: string, userId: string): Promise<boolean>;
  /** Ids of the given lessons the user completed. */
  completedLessonIds(userId: string, lessonIds: string[]): Promise<string[]>;
  setCompleted(userId: string, lessonId: string, completed: boolean): Promise<void>;
  /**
   * Courses the user is learning: an ACTIVE enrollment, or a recorded course with a live plan or any lesson progress
   * (progress outlives a lapsed plan).
   */
  activeCourseIds(userId: string): Promise<string[]>;
  /** The plan shown on the user's progress list: the one that decides access, else the newest ended one. */
  learnerSubscription(courseId: string, userId: string): Promise<LearnerSubscription | null>;
  /** The course a lesson belongs to. */
  courseOfLesson(lessonId: string): Promise<string | null>;
  /** The user's newest subscription to a recorded course that has not EXPIRED. */
  recordedSubscription(courseId: string, userId: string): Promise<RecordedSubscription | null>;
  /** The user once had a paid period on the course (even one that has expired); an abandoned checkout does not count. */
  hadSubscription(courseId: string, userId: string): Promise<boolean>;
  /** Saved video position in seconds; null when never saved. */
  videoPosition(userId: string, lessonId: string): Promise<number | null>;
  setVideoPosition(userId: string, lessonId: string, positionSec: number): Promise<void>;
}

const asRecord = <T extends { attachments: unknown }>(row: T) => ({ ...row, attachments: (row.attachments ?? []) as LessonAttachment[] });

export class PrismaLessonRepository implements LessonRepository {
  constructor(private readonly db: Db) {}

  findCourse(idOrSlug: string) {
    return this.db.course.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true,
        slug: true,
        titleEn: true,
        titleAr: true,
        status: true,
        createdById: true,
        type: true,
        previewLessonId: true,
        modules: { orderBy: { order: 'asc' }, select: { id: true, order: true, titleEn: true, titleAr: true, descriptionEn: true, descriptionAr: true } },
      },
    });
  }

  async lessonsOfModules(moduleIds: string[]) {
    const rows = await this.db.lesson.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(asRecord);
  }

  async find(id: string) {
    const row = await this.db.lesson.findUnique({ where: { id } });
    return row && asRecord(row);
  }

  async create(moduleId: string, { attachments, ...data }: LessonWriteData & { titleEn: string; order: number }) {
    return asRecord(await this.db.lesson.create({ data: { ...data, moduleId, attachments: attachments ?? [] } }));
  }

  async update(id: string, { attachments, ...data }: LessonWriteData) {
    return asRecord(await this.db.lesson.update({ where: { id }, data: { ...data, ...(attachments && { attachments }) } }));
  }

  async delete(id: string) {
    await this.db.lesson.delete({ where: { id } });
  }

  async setOrder(ids: string[]) {
    await this.db.$transaction(ids.map((id, order) => this.db.lesson.update({ where: { id }, data: { order } })));
  }

  async isActiveStudent(courseId: string, userId: string) {
    return (await this.db.enrollment.count({ where: { userId, status: 'ACTIVE', batch: { courseId } } })) > 0;
  }

  async teachesCourse(courseId: string, userId: string) {
    return (await this.db.batch.count({ where: { courseId, teacherId: userId } })) > 0;
  }

  async completedLessonIds(userId: string, lessonIds: string[]) {
    if (!lessonIds.length) return [];
    const rows = await this.db.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true } });
    return rows.map((r) => r.lessonId);
  }

  async setCompleted(userId: string, lessonId: string, completed: boolean) {
    if (completed) {
      await this.db.lessonProgress.upsert({ where: { userId_lessonId: { userId, lessonId } }, create: { userId, lessonId }, update: {} });
    } else {
      await this.db.lessonProgress.deleteMany({ where: { userId, lessonId } });
    }
  }

  async activeCourseIds(userId: string) {
    const [enrolled, plans, progress] = await Promise.all([
      this.db.enrollment.findMany({ where: { userId, status: 'ACTIVE' }, select: { batch: { select: { courseId: true } } } }),
      // A lapsed plan counts only through lesson progress below.
      this.db.subscription.findMany({ where: { userId, status: { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] }, course: { type: 'RECORDED' } }, select: { courseId: true } }),
      this.db.course.findMany({ where: { type: 'RECORDED', modules: { some: { lessons: { some: { progress: { some: { userId } } } } } } }, select: { id: true } }),
    ]);
    return [...new Set([...enrolled.map((r) => r.batch.courseId), ...plans.map((p) => p.courseId), ...progress.map((c) => c.id)])];
  }

  learnerSubscription(courseId: string, userId: string) {
    return learnerSubscription(this.db, courseId, userId);
  }

  async courseOfLesson(lessonId: string) {
    const l = await this.db.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
    return l?.module.courseId ?? null;
  }

  recordedSubscription(courseId: string, userId: string) {
    return newestLiveSubscription(this.db, courseId, userId);
  }

  hadSubscription(courseId: string, userId: string) {
    return everSubscribed(this.db, courseId, userId);
  }

  async videoPosition(userId: string, lessonId: string) {
    const row = await this.db.lessonVideoPosition.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { positionSec: true } });
    return row?.positionSec ?? null;
  }

  async setVideoPosition(userId: string, lessonId: string, positionSec: number) {
    await this.db.lessonVideoPosition.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, positionSec },
      update: { positionSec },
    });
  }
}
