import { randomBytes } from 'node:crypto';

const KEY = /^([a-z0-9-]+)\/([a-f0-9]{32})\.([a-z0-9]{2,5})$/;
const TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
};

/** `<folder>/<128-bit random hex>.<ext>` — unguessable, and safe in a URL path or an S3 key. */
export function newStorageKey(folder: string, extension: string): string {
  const key = `${folder}/${randomBytes(16).toString('hex')}.${extension}`;
  if (!KEY.test(key)) throw new Error(`Invalid storage key ${key}`);
  return key;
}

/** Content type for a well-formed key, or `null` when the key is malformed (so it can't escape its root). */
export function storageKeyContentType(key: string): string | null {
  const m = KEY.exec(key);
  return m ? (TYPES[m[3]!] ?? 'application/octet-stream') : null;
}

/** The storage key behind `url` when it is `<baseUrl>/<well-formed key>`, else `null` (another origin, path tricks, query strings). */
export function storageKeyFromUrl(url: string, baseUrl: string): string | null {
  const prefix = `${baseUrl.replace(/\/$/, '')}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return KEY.test(key) ? key : null;
}
