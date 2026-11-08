import { MAX_MATERIAL_FILE_BYTES } from '@azza/shared';
import { contentFile, DOCUMENT_TYPES, type ContentFile, type ContentFileRule } from './submission-file';

export const MATERIAL_FILE_RULE: ContentFileRule = {
  code: 'MATERIAL_FILE_INVALID',
  label: 'file',
  maxBytes: MAX_MATERIAL_FILE_BYTES,
  types: { ...DOCUMENT_TYPES, mp3: 'audio/mpeg', m4a: 'audio/mp4' },
};

/**
 * Pure: which class material files we accept (the submission types plus mp3 / m4a; ≤ 50 MB).
 * Throws 422 `MATERIAL_FILE_INVALID` with `details.reason` = TYPE | EMPTY | TOO_LARGE.
 */
export function materialFile(file: { type: string; size: number; name?: string }): ContentFile {
  return contentFile(MATERIAL_FILE_RULE, file);
}
