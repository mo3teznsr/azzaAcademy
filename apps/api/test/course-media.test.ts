import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createCourseInput, isCourseCoverUrl, parseCourseVideoUrl } from '@azza/shared';
import { byteRange } from '../src/app';
import type { FileStorage } from '../src/core/ports';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { courseMediaFile, MAX_COURSE_COVER_BYTES, MAX_COURSE_VIDEO_BYTES } from '../src/modules/admin/course-media-file';
import { adminMediaRoutes } from '../src/modules/admin/course-media.routes';
import { CourseMediaService } from '../src/modules/admin/course-media.service';
import { MemoryFileStorage } from '../src/infrastructure/storage/local-disk-storage';

const HEX = 'a'.repeat(32);

describe('courseMediaFile', () => {
  test('covers: jpg / png / webp up to 8 MB', () => {
    expect(courseMediaFile('course-cover', { type: 'image/jpeg', size: 10 })).toEqual({ folder: 'course-covers', extension: 'jpg' });
    expect(courseMediaFile('course-cover', { type: 'IMAGE/PNG', size: 10 }).extension).toBe('png');
    expect(courseMediaFile('course-cover', { type: 'image/webp', size: MAX_COURSE_COVER_BYTES }).extension).toBe('webp');
    expect(() => courseMediaFile('course-cover', { type: 'image/heic', size: 10 })).toThrow('JPG, PNG, WEBP');
    expect(() => courseMediaFile('course-cover', { type: 'image/svg+xml', size: 10 })).toThrow('JPG, PNG, WEBP');
    expect(() => courseMediaFile('course-cover', { type: 'image/png', size: MAX_COURSE_COVER_BYTES + 1 })).toThrow('8 MB');
  });

  test('videos: mp4 / mov / webm up to 200 MB', () => {
    expect(courseMediaFile('course-video', { type: 'video/mp4', size: 10 })).toEqual({ folder: 'course-videos', extension: 'mp4' });
    expect(courseMediaFile('course-video', { type: 'video/quicktime', size: 10 }).extension).toBe('mov');
    expect(courseMediaFile('course-video', { type: 'video/webm', size: MAX_COURSE_VIDEO_BYTES }).extension).toBe('webm');
    expect(() => courseMediaFile('course-video', { type: 'image/png', size: 10 })).toThrow('MP4, MOV, WEBM');
    expect(() => courseMediaFile('course-video', { type: 'video/mp4', size: 0 })).toThrow('empty');
    expect(() => courseMediaFile('course-video', { type: 'video/mp4', size: MAX_COURSE_VIDEO_BYTES + 1 })).toThrow('200 MB');
  });

  test('refuses an unknown kind', () => {
    for (const kind of [undefined, '', 'avatar', 'course-covers']) {
      expect(() => courseMediaFile(kind, { type: 'image/png', size: 10 })).toThrow('course-cover or course-video');
    }
  });
});

describe('CourseMediaService.upload', () => {
  const file = (type: string, size = 4) => ({ type, size, bytes: async () => new Uint8Array(size) });

  test('stores in the kind folder and returns the storage URL', async () => {
    const storage = new MemoryFileStorage();
    const media = new CourseMediaService(storage);
    const cover = await media.upload('course-cover', file('image/png'));
    const video = await media.upload('course-video', file('video/mp4'));
    expect(cover.url).toMatch(/^http:\/\/files\.test\/course-covers\/[0-9a-f]{32}\.png$/);
    expect(video.url).toMatch(/^http:\/\/files\.test\/course-videos\/[0-9a-f]{32}\.mp4$/);
    expect([...storage.files.values()].map((f) => f.contentType)).toEqual(['image/png', 'video/mp4']);
  });

  test('rejects a bad file before storing anything', async () => {
    let stored = false;
    const storage: FileStorage = { save: async () => ((stored = true), { key: 'k', url: 'u' }), read: async () => null, keyFromUrl: () => null };
    await expect(new CourseMediaService(storage).upload('course-video', file('application/pdf'))).rejects.toThrow();
    expect(stored).toBe(false);
  });
});

describe('POST /admin/media', () => {
  const user = (role: CurrentUser['role']): CurrentUser => ({ id: 'u1', name: 'U', email: 'u@x.test', role, locale: 'en', timezone: 'Asia/Dubai' });
  const app = (who: CurrentUser | null) => {
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => (c.set('user', who), next()));
    a.route('/admin', adminMediaRoutes(new CourseMediaService(new MemoryFileStorage())));
    return a;
  };
  const body = (kind: string, type = 'image/jpeg') => {
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', new File([new Uint8Array(16)], type.startsWith('video/') ? 'intro.mp4' : 'cover.jpg', { type }));
    return { method: 'POST', body: form };
  };

  test('admins get the stored URL', async () => {
    const res = await app(user('ADMIN')).request('/admin/media', body('course-cover'));
    expect(res.status).toBe(201);
    expect(((await res.json()) as { url: string }).url).toMatch(/\/course-covers\/[0-9a-f]{32}\.jpg$/);
  });

  test('signed-out → 401, students and teachers → 403', async () => {
    expect((await app(null).request('/admin/media', body('course-cover'))).status).toBe(401);
    expect((await app(user('STUDENT')).request('/admin/media', body('course-cover'))).status).toBe(403);
    expect((await app(user('TEACHER')).request('/admin/media', body('course-cover'))).status).toBe(403);
  });

  test('bad kind, type or missing file → 422 COURSE_MEDIA_INVALID', async () => {
    const admin = app(user('ADMIN'));
    const reasons: string[] = [];
    for (const init of [body('poster'), body('course-video', 'image/png'), { method: 'POST', body: new FormData() }]) {
      const res = await admin.request('/admin/media', init);
      expect(res.status).toBe(422);
      const json = (await res.json()) as { error: { code: string; details: { reason: string } } };
      expect(json.error.code).toBe('COURSE_MEDIA_INVALID');
      reasons.push(json.error.details.reason);
    }
    expect(reasons).toEqual(['KIND', 'TYPE', 'MISSING']);
  });

  test('a body over the video limit is refused from Content-Length', async () => {
    const res = await app(user('ADMIN')).request('/admin/media', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(MAX_COURSE_VIDEO_BYTES * 2) },
      body: '--x--',
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { details: { reason: string } } }).error.details.reason).toBe('TOO_LARGE');
  });
});

describe('course media URLs', () => {
  const base = { slug: 'x', titleEn: 'Course', category: 'Design', level: 'BEGINNER' as const, priceAed: 100 };

  test('covers accept files our storage returned (local disk and CDN)', () => {
    for (const url of [`http://localhost:4000/uploads/course-covers/${HEX}.jpg`, `/uploads/course-covers/${HEX}.webp`, `https://cdn.azza.test/course-covers/${HEX}.png`]) {
      expect(isCourseCoverUrl(url)).toBe(true);
      expect(createCourseInput.safeParse({ ...base, coverImageUrl: url }).success).toBe(true);
    }
    for (const url of [`http://localhost:4000/uploads/course-videos/${HEX}.mp4`, `http://evil.test/uploads/course-covers/${HEX}.svg`, `/uploads/course-covers/../x.jpg`]) {
      expect(isCourseCoverUrl(url)).toBe(false);
    }
  });

  test('intro video: uploads, YouTube, Vimeo and direct https files', () => {
    expect(parseCourseVideoUrl(`http://localhost:4000/uploads/course-videos/${HEX}.mp4`)).toEqual({ kind: 'file', url: `http://localhost:4000/uploads/course-videos/${HEX}.mp4` });
    expect(parseCourseVideoUrl('https://cdn.azza.test/course-videos/x.webm')?.kind).toBe('file');
    for (const yt of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']) {
      expect(parseCourseVideoUrl(yt)).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0' });
    }
    expect(parseCourseVideoUrl('https://vimeo.com/76979871')).toEqual({ kind: 'vimeo', id: '76979871', embedUrl: 'https://player.vimeo.com/video/76979871?dnt=1' });
    expect(parseCourseVideoUrl('https://player.vimeo.com/video/76979871')?.kind).toBe('vimeo');
  });

  test('intro video: refuses other links', () => {
    for (const url of ['http://example.com/a.mp4', 'https://example.com/page', 'javascript:alert(1)', 'https://youtube.com/watch?v=short', 'https://vimeo.com/channels', `/uploads/course-covers/${HEX}.jpg`]) {
      expect(parseCourseVideoUrl(url)).toBeNull();
      expect(createCourseInput.safeParse({ ...base, introVideoUrl: url }).success).toBe(false);
    }
    expect(createCourseInput.safeParse({ ...base, introVideoUrl: null }).success).toBe(true);
  });
});

describe('byteRange', () => {
  test('parses single ranges for video seeking', () => {
    expect(byteRange(undefined, 100)).toBeNull();
    expect(byteRange('bytes=0-', 100)).toEqual([0, 99]);
    expect(byteRange('bytes=10-19', 100)).toEqual([10, 19]);
    expect(byteRange('bytes=90-500', 100)).toEqual([90, 99]);
    expect(byteRange('bytes=-10', 100)).toEqual([90, 99]);
    expect(byteRange('bytes=200-', 100)).toBe('invalid');
    expect(byteRange('bytes=0-1,5-6', 100)).toBeNull();
  });
});
