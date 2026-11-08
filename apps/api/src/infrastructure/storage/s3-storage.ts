import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { FileStorage, StoredFile } from '../../core/ports';
import { newStorageKey, storageKeyContentType, storageKeyFromUrl } from './storage-key';

/**
 * Stores files in a private S3 bucket and serves them through CloudFront at `<cdnBaseUrl>/<key>`.
 * The bucket is never public: CloudFront reads it via Origin Access Control. Keys are unguessable (128-bit).
 * Credentials come from the default AWS chain (env vars, IAM task/instance role, SSO profile).
 */
export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    private readonly cdnBaseUrl: string,
  ) {
    this.client = new S3Client({ region });
  }

  async save(file: { folder: string; extension: string; contentType: string; bytes: Uint8Array }): Promise<StoredFile> {
    const key = newStorageKey(file.folder, file.extension);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.bytes,
        ContentType: storageKeyContentType(key) ?? file.contentType,
        // Keys are immutable (a new upload gets a new key), so the CDN can cache forever.
        CacheControl: 'public, max-age=31536000, immutable',
        ServerSideEncryption: 'AES256',
      }),
    );
    return { key, url: `${this.cdnBaseUrl.replace(/\/$/, '')}/${key}` };
  }

  async read(key: string) {
    const contentType = storageKeyContentType(key);
    if (!contentType) return null;
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return { bytes: await res.Body.transformToByteArray(), contentType: res.ContentType ?? contentType };
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }

  keyFromUrl(url: string) {
    return storageKeyFromUrl(url, this.cdnBaseUrl);
  }

  async delete(key: string) {
    if (!storageKeyContentType(key)) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
