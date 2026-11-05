import { AppError } from '../../core/errors';
import type { FileStorage } from '../../core/ports';
import { courseMediaFile } from './course-media-file';

/** Course cover photos and intro videos uploaded by admins; the URL is then saved on the course. */
export class CourseMediaService {
  constructor(private readonly storage?: FileStorage) {}

  /** Validate → store under `course-covers/` or `course-videos/` → `{ url }`. Nothing is stored for a bad file. */
  async upload(kind: unknown, file: { type: string; size: number; bytes: () => Promise<Uint8Array> }): Promise<{ url: string }> {
    const { folder, extension } = courseMediaFile(kind, file);
    if (!this.storage) throw new AppError('File storage is not configured', 500, 'STORAGE_UNAVAILABLE');
    const stored = await this.storage.save({ folder, extension, contentType: file.type.toLowerCase(), bytes: await file.bytes() });
    return { url: stored.url };
  }
}
