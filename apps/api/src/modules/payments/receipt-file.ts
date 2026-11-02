import { BusinessRuleError } from '../../core/errors';

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** Pure: which receipt files we accept. Returns the storage extension or throws 422 `RECEIPT_FILE_INVALID`. */
export function receiptExtension(file: { type: string; size: number }): string {
  const ext = EXTENSIONS[file.type.toLowerCase()];
  if (!ext) throw new BusinessRuleError('Upload a PDF or an image (PNG, JPG, WEBP, HEIC)', 'RECEIPT_FILE_INVALID', { reason: 'TYPE', accepted: Object.keys(EXTENSIONS) });
  if (file.size <= 0) throw new BusinessRuleError('The file is empty', 'RECEIPT_FILE_INVALID', { reason: 'EMPTY' });
  if (file.size > MAX_RECEIPT_BYTES) throw new BusinessRuleError('The file is larger than 10 MB', 'RECEIPT_FILE_INVALID', { reason: 'TOO_LARGE', maxBytes: MAX_RECEIPT_BYTES });
  return ext;
}
