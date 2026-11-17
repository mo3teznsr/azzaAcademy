import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import type { MediaUrlSigner } from '../../core/ports';

export interface CloudFrontSignerConfig {
  /** The distribution's origin, e.g. `https://cdn.azza.academy` (the same as `CLOUDFRONT_URL`). */
  baseUrl: string;
  /** Public key id in the distribution's trusted key group (e.g. `K2JCJMDEHXQW5F`). */
  keyPairId: string;
  /** PEM of the matching RSA private key. */
  privateKey: string;
}

/**
 * CloudFront signed URLs (`@aws-sdk/cloudfront-signer`).
 * - One file (a poster, the low MP4, an original upload): canned policy, `?Expires=…&Signature=…&Key-Pair-Id=…`.
 * - A stream folder: a custom policy whose resource ends in `*`, so one query string opens every segment under it.
 *   HLS players resolve segment URIs against the playlist URL and drop its query string, so the API rewrites playlists and
 *   appends this query to every segment (see `modules/lessons/hls-playlist.ts`).
 * Setup: CloudFront → Public keys → add the public key; Key groups → add a group with it; on the distribution, set
 * "Restrict viewer access → Trusted key groups" on the `streams/*` and `course-videos/*` behaviours.
 */
export class CloudFrontUrlSigner implements MediaUrlSigner {
  readonly enabled = true;
  private readonly base: string;

  constructor(private readonly config: CloudFrontSignerConfig) {
    this.base = `${config.baseUrl.replace(/\/$/, '')}/`;
  }

  covers(url: string) {
    return url.startsWith(this.base) && !url.includes('?');
  }

  signUrl(url: string, expiresAt: Date) {
    if (!this.covers(url)) return url;
    return getSignedUrl({ url, keyPairId: this.config.keyPairId, privateKey: this.config.privateKey, dateLessThan: expiresAt });
  }

  prefixQuery(prefixUrl: string, expiresAt: Date) {
    const resource = `${prefixUrl.replace(/\*+$/, '')}*`;
    const signed = getSignedUrl({ url: resource, keyPairId: this.config.keyPairId, privateKey: this.config.privateKey, policy: cloudFrontPolicy(resource, expiresAt) });
    return new URL(signed).search.slice(1);
  }
}

/** Pure: a custom policy for `resource` (may end in `*`) until `expiresAt`, as CloudFront documents it (no whitespace). */
export function cloudFrontPolicy(resource: string, expiresAt: Date): string {
  return JSON.stringify({ Statement: [{ Resource: resource, Condition: { DateLessThan: { 'AWS:EpochTime': Math.floor(expiresAt.getTime() / 1000) } } }] });
}

/** Pure: decodes the `Policy` parameter of a signed URL (CloudFront's `-_~` base64 variant). */
export function decodeCloudFrontPolicy(value: string): unknown {
  return JSON.parse(Buffer.from(value.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/'), 'base64').toString('utf8'));
}

/** No signing key: URLs stay as they are (the CDN behaviours must then not restrict viewer access). */
export class UnsignedUrls implements MediaUrlSigner {
  readonly enabled = false;
  covers() {
    return false;
  }
  signUrl(url: string) {
    return url;
  }
  prefixQuery() {
    return '';
  }
}
