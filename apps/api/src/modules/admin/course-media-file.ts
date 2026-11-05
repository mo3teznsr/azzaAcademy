import { BusinessRuleError } from '../../core/errors';

export const COURSE_MEDIA_KINDS = ['course-cover', 'course-video'] as const;
export type CourseMediaKind = (typeof COURSE_MEDIA_KINDS)[number];

const MB = 1024 * 1024;
export const MAX_COURSE_COVER_BYTES = 8 * MB;
export const MAX_COURSE_VIDEO_BYTES = 200 * MB;

const RULES: Record<CourseMediaKind, { folder: string; maxBytes: number; label: string; types: Record<string, string>; accepted: string }> = {
  'course-cover': {
    folder: 'course-covers',
    maxBytes: MAX_COURSE_COVER_BYTES,
    label: 'photo',
    types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
    accepted: 'JPG, PNG, WEBP',
  },
  'course-video': {
    folder: 'course-videos',
    maxBytes: MAX_COURSE_VIDEO_BYTES,
    label: 'video',
    types: { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' },
    accepted: 'MP4, MOV, WEBM',
  },
};

export function isCourseMediaKind(v: unknown): v is CourseMediaKind {
  return typeof v === 'string' && (COURSE_MEDIA_KINDS as readonly string[]).includes(v);
}

/**
 * Pure: which course covers / intro videos we accept. Returns the storage folder + extension or throws
 * 422 `COURSE_MEDIA_INVALID` with `details.reason` = KIND | TYPE | EMPTY | TOO_LARGE.
 */
export function courseMediaFile(kind: unknown, file: { type: string; size: number }): { folder: string; extension: string } {
  if (!isCourseMediaKind(kind)) {
    throw new BusinessRuleError('`kind` must be course-cover or course-video', 'COURSE_MEDIA_INVALID', { reason: 'KIND', accepted: COURSE_MEDIA_KINDS });
  }
  const rule = RULES[kind];
  const extension = rule.types[file.type.toLowerCase()];
  if (!extension) {
    throw new BusinessRuleError(`Upload a ${rule.label} (${rule.accepted})`, 'COURSE_MEDIA_INVALID', { reason: 'TYPE', accepted: Object.keys(rule.types) });
  }
  if (file.size <= 0) throw new BusinessRuleError(`The ${rule.label} is empty`, 'COURSE_MEDIA_INVALID', { reason: 'EMPTY' });
  if (file.size > rule.maxBytes) {
    throw new BusinessRuleError(`The ${rule.label} is larger than ${rule.maxBytes / MB} MB`, 'COURSE_MEDIA_INVALID', { reason: 'TOO_LARGE', maxBytes: rule.maxBytes });
  }
  return { folder: rule.folder, extension };
}
