import { MAX_SUBMISSION_FILE_BYTES } from '@azza/shared';
import { BusinessRuleError } from '../../core/errors';

const MB = 1024 * 1024;

/** Extension → the content type we store and report. */
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  zip: 'application/zip',
  txt: 'text/plain',
  md: 'text/markdown',
};

/** Content types browsers send for the same formats. */
const ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'application/x-zip-compressed': 'application/zip',
  'application/x-zip': 'application/zip',
  'text/x-markdown': 'text/markdown',
  'audio/mp3': 'audio/mpeg',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
};
/** Sent when the browser doesn't know the format (often for .md / .zip); then the file name decides. */
const UNKNOWN_TYPES = new Set(['', 'application/octet-stream']);

export interface ContentFileRule {
  code: string;
  label: string;
  maxBytes: number;
  types: Record<string, string>;
}
export interface ContentFile {
  extension: string;
  contentType: string;
}

/** Pure: match a file against a rule by content type (or by file name when the type is unknown). Throws 422 `rule.code`. */
export function contentFile(rule: ContentFileRule, file: { type: string; size: number; name?: string }): ContentFile {
  const accepted = Object.keys(rule.types);
  const raw = file.type.split(';')[0]!.trim().toLowerCase();
  const type = ALIASES[raw] ?? raw;
  let extension = Object.entries(rule.types).find(([, t]) => t === type)?.[0];
  if (!extension && UNKNOWN_TYPES.has(type)) {
    const ext = /\.([a-z0-9]{1,5})$/i.exec(file.name ?? '')?.[1]?.toLowerCase();
    const normalized = ext === 'jpeg' ? 'jpg' : ext;
    if (normalized && normalized in rule.types) extension = normalized;
  }
  if (!extension) {
    throw new BusinessRuleError(`Upload a ${rule.label} (${accepted.map((e) => e.toUpperCase()).join(', ')})`, rule.code, { reason: 'TYPE', accepted });
  }
  if (file.size <= 0) throw new BusinessRuleError(`The ${rule.label} is empty`, rule.code, { reason: 'EMPTY' });
  if (file.size > rule.maxBytes) {
    throw new BusinessRuleError(`The ${rule.label} is larger than ${rule.maxBytes / MB} MB`, rule.code, { reason: 'TOO_LARGE', maxBytes: rule.maxBytes });
  }
  return { extension, contentType: rule.types[extension]! };
}

export const SUBMISSION_FILE_RULE: ContentFileRule = {
  code: 'SUBMISSION_FILE_INVALID',
  label: 'file',
  maxBytes: MAX_SUBMISSION_FILE_BYTES,
  types: DOCUMENT_TYPES,
};

/**
 * Pure: which assignment submission files we accept (pdf, docx, pptx, xlsx, png, jpg, webp, zip, txt, md; ≤ 20 MB).
 * Throws 422 `SUBMISSION_FILE_INVALID` with `details.reason` = TYPE | EMPTY | TOO_LARGE.
 */
export function submissionFile(file: { type: string; size: number; name?: string }): ContentFile {
  return contentFile(SUBMISSION_FILE_RULE, file);
}
