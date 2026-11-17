import type { Db } from '../../infrastructure/db';
import type { TranscodeStatus } from '../../core/ports';

/** The streaming columns of a lesson (kept out of `LessonRecord`, so lesson responses never leak unsigned URLs). */
export interface LessonStream {
  lessonId: string;
  titleEn: string;
  videoUrl: string | null;
  streamStatus: TranscodeStatus | null;
  streamProvider: string | null;
  streamAssetId: string | null;
  streamSourceUrl: string | null;
  hlsUrl: string | null;
  posterUrl: string | null;
  lowMp4Url: string | null;
  durationSec: number | null;
  streamError: string | null;
  streamUpdatedAt: Date | null;
}

export type LessonStreamWrite = Partial<Omit<LessonStream, 'lessonId' | 'titleEn' | 'videoUrl'>>;

/** Persistence port for lesson streaming. */
export interface LessonStreamRepository {
  find(lessonId: string): Promise<LessonStream | null>;
  save(lessonId: string, data: LessonStreamWrite): Promise<void>;
  /** Lessons whose asset at the service has this id. */
  lessonIdsByAsset(assetId: string): Promise<string[]>;
  /** PROCESSING lessons not updated since `before`, oldest first. */
  processing(before: Date, limit: number): Promise<LessonStream[]>;
  /** Lessons with a video and no stream yet (any URL; the service keeps uploaded files only), oldest first. */
  unprepared(limit: number): Promise<LessonStream[]>;
}

const SELECT = {
  id: true,
  titleEn: true,
  videoUrl: true,
  streamStatus: true,
  streamProvider: true,
  streamAssetId: true,
  streamSourceUrl: true,
  hlsUrl: true,
  posterUrl: true,
  lowMp4Url: true,
  durationSec: true,
  streamError: true,
  streamUpdatedAt: true,
} as const;

const toStream = ({ id, ...row }: { id: string } & Omit<LessonStream, 'lessonId'>): LessonStream => ({ lessonId: id, ...row });

export class PrismaLessonStreamRepository implements LessonStreamRepository {
  constructor(private readonly db: Db) {}

  async find(lessonId: string) {
    const row = await this.db.lesson.findUnique({ where: { id: lessonId }, select: SELECT });
    return row && toStream(row);
  }

  async save(lessonId: string, data: LessonStreamWrite) {
    await this.db.lesson.update({ where: { id: lessonId }, data });
  }

  async lessonIdsByAsset(assetId: string) {
    const rows = await this.db.lesson.findMany({ where: { streamAssetId: assetId }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async processing(before: Date, limit: number) {
    const rows = await this.db.lesson.findMany({
      where: { streamStatus: 'PROCESSING', OR: [{ streamUpdatedAt: null }, { streamUpdatedAt: { lt: before } }] },
      orderBy: { streamUpdatedAt: 'asc' },
      take: limit,
      select: SELECT,
    });
    return rows.map(toStream);
  }

  async unprepared(limit: number) {
    const rows = await this.db.lesson.findMany({
      // YouTube and Vimeo links are never transcoded; leaving them out keeps them from filling every batch.
      where: { streamStatus: null, videoUrl: { not: null }, NOT: [{ videoUrl: { contains: 'youtu' } }, { videoUrl: { contains: 'vimeo.com' } }] },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: SELECT,
    });
    return rows.map(toStream);
  }
}
