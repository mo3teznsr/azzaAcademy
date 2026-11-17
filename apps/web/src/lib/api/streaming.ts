import type { LessonStreamStatus } from '@azza/shared';
import { http } from './client';
import type { ISODate } from './types';

/** Admin view of a lesson's adaptive stream (`status: null` = plays the uploaded file). */
export interface LessonStreamAdmin {
  lessonId: string;
  status: LessonStreamStatus | null;
  provider: string | null;
  assetId: string | null;
  hlsUrl: string | null;
  lowMp4Url: string | null;
  durationSec: number | null;
  error: string | null;
  updatedAt: ISODate | null;
}

export const streamingApi = {
  status: (lessonId: string) => http.get<LessonStreamAdmin>(`/api/v1/admin/lessons/${lessonId}/stream`),
  /** "Prepare for streaming" (again, after a failure). 503 `TRANSCODER_DISABLED` when no video service is configured. */
  prepare: (lessonId: string) => http.post<LessonStreamAdmin>(`/api/v1/admin/lessons/${lessonId}/stream`),
  refresh: (lessonId: string) => http.post<LessonStreamAdmin>(`/api/v1/admin/lessons/${lessonId}/stream/refresh`),
  /** Sends the next batch of older uploaded videos to the video service. */
  backfill: (limit = 10) => http.post<{ started: number; skipped: number }>('/api/v1/admin/lessons-streaming/backfill', { limit }),
};
