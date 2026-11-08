import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileStorage, StoredFile } from '../../core/ports';
import { newStorageKey, storageKeyContentType, storageKeyFromUrl } from './storage-key';

/**
 * Local/dev adapter. Stores files under `<root>/<folder>/<random>.<ext>` and serves them at `<publicBaseUrl>/<key>`.
 * Keys are unguessable (128-bit) and strictly validated on read, so the route can't escape `root`.
 */
export class LocalDiskStorage implements FileStorage {
  constructor(
    private readonly root: string,
    private readonly publicBaseUrl: string,
  ) {}

  async save(file: { folder: string; extension: string; contentType: string; bytes: Uint8Array }): Promise<StoredFile> {
    const key = newStorageKey(file.folder, file.extension);
    await mkdir(join(this.root, file.folder), { recursive: true });
    await writeFile(join(this.root, key), file.bytes);
    return { key, url: `${this.publicBaseUrl.replace(/\/$/, '')}/${key}` };
  }

  async read(key: string) {
    const contentType = storageKeyContentType(key);
    if (!contentType) return null;
    try {
      const bytes = new Uint8Array(await readFile(join(this.root, key)));
      return { bytes, contentType };
    } catch {
      return null;
    }
  }

  keyFromUrl(url: string) {
    return storageKeyFromUrl(url, this.publicBaseUrl);
  }
}

/** In-memory adapter for tests. */
export class MemoryFileStorage implements FileStorage {
  readonly files = new Map<string, { bytes: Uint8Array; contentType: string }>();
  private n = 0;
  async save(file: { folder: string; extension: string; contentType: string; bytes: Uint8Array }): Promise<StoredFile> {
    const key = `${file.folder}/${(++this.n).toString(16).padStart(32, '0')}.${file.extension}`;
    this.files.set(key, { bytes: file.bytes, contentType: file.contentType });
    return { key, url: `http://files.test/${key}` };
  }
  async read(key: string) {
    return this.files.get(key) ?? null;
  }
  keyFromUrl(url: string) {
    return storageKeyFromUrl(url, 'http://files.test');
  }
}
