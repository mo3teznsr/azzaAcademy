import { BusinessRuleError } from '../../core/errors';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** Pure: which profile photos we accept. Returns the storage extension or throws 422 `AVATAR_FILE_INVALID`. */
export function avatarExtension(file: { type: string; size: number }): string {
  const ext = EXTENSIONS[file.type.toLowerCase()];
  if (!ext) throw new BusinessRuleError('Upload a photo (PNG, JPG, WEBP, HEIC)', 'AVATAR_FILE_INVALID', { reason: 'TYPE', accepted: Object.keys(EXTENSIONS) });
  if (file.size <= 0) throw new BusinessRuleError('The photo is empty', 'AVATAR_FILE_INVALID', { reason: 'EMPTY' });
  if (file.size > MAX_AVATAR_BYTES) throw new BusinessRuleError('The photo is larger than 5 MB', 'AVATAR_FILE_INVALID', { reason: 'TOO_LARGE', maxBytes: MAX_AVATAR_BYTES });
  return ext;
}
