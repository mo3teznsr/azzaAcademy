import { describe, expect, test } from 'bun:test';
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig } from '../src/core/config';
import { S3FileStorage } from '../src/infrastructure/storage/s3-storage';

const BASE_ENV = { DATABASE_URL: 'postgres://x', BETTER_AUTH_SECRET: 'x'.repeat(32) };

/** S3FileStorage with its client's `send` replaced by an in-memory bucket. */
function fakeS3() {
  const storage = new S3FileStorage('azza-test', 'me-central-1', 'https://cdn.azza.test/');
  const objects = new Map<string, { bytes: Uint8Array; contentType?: string; input: PutObjectCommand['input'] }>();
  (storage as unknown as { client: { send: (cmd: unknown) => Promise<unknown> } }).client.send = async (cmd) => {
    if (cmd instanceof PutObjectCommand) {
      objects.set(cmd.input.Key!, { bytes: cmd.input.Body as Uint8Array, contentType: cmd.input.ContentType, input: cmd.input });
      return {};
    }
    if (cmd instanceof GetObjectCommand) {
      const o = objects.get(cmd.input.Key!);
      if (!o) throw new NoSuchKey({ message: 'missing', $metadata: {} });
      return { ContentType: o.contentType, Body: { transformToByteArray: async () => o.bytes } };
    }
    throw new Error('unexpected command');
  };
  return { storage, objects };
}

describe('S3FileStorage', () => {
  test('uploads to the bucket and returns a CloudFront URL', async () => {
    const { storage, objects } = fakeS3();
    const stored = await storage.save({ folder: 'receipts', extension: 'pdf', contentType: 'application/pdf', bytes: new Uint8Array([1, 2]) });
    expect(stored.url).toMatch(/^https:\/\/cdn\.azza\.test\/receipts\/[0-9a-f]{32}\.pdf$/);
    const put = objects.get(stored.key)!.input;
    expect(put).toMatchObject({ Bucket: 'azza-test', ContentType: 'application/pdf', ServerSideEncryption: 'AES256' });
    expect(await storage.read(stored.key)).toEqual({ bytes: new Uint8Array([1, 2]), contentType: 'application/pdf' });
  });

  test('read returns null for malformed or missing keys', async () => {
    const { storage } = fakeS3();
    expect(await storage.read('../secrets.txt')).toBeNull();
    expect(await storage.read(`receipts/${'a'.repeat(32)}.pdf`)).toBeNull();
  });
});

describe('storage config', () => {
  test('S3_BUCKET and CLOUDFRONT_URL must be set together', () => {
    expect(() => loadConfig({ ...BASE_ENV, S3_BUCKET: 'b' })).toThrow(/set together/);
    expect(() => loadConfig({ ...BASE_ENV, S3_BUCKET: 'b', CLOUDFRONT_URL: 'https://cdn.azza.test' })).not.toThrow();
    expect(() => loadConfig({ ...BASE_ENV, S3_BUCKET: '', CLOUDFRONT_URL: '' })).not.toThrow();
  });
  test('production requires S3', () => {
    expect(() => loadConfig({ ...BASE_ENV, NODE_ENV: 'production' })).toThrow(/required in production/);
  });
});
