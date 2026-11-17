import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Pure: short-lived download tokens for a lesson's uploaded video, `<base64url payload>.<base64url HMAC>`. Issued only after the
 * access check (`POST /lessons/:id/download`) and redeemed at `GET /lesson-downloads/:token`, which re-reads the lesson.
 * The payload names the lesson and the viewer, never the file URL.
 */
export interface DownloadClaims {
  lessonId: string;
  userId: string;
  /** Unix seconds. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export class DownloadLinkSigner {
  private readonly key: Buffer;

  /**
   * `secret` is the app secret; a purpose-bound key is derived from it so tokens can't be replayed elsewhere (download links
   * and HLS playlist links use different purposes).
   */
  constructor(secret: string, purpose = 'azza:lesson-downloads:v1') {
    this.key = createHmac('sha256', secret).update(purpose).digest();
  }

  sign(claims: DownloadClaims): string {
    const payload = b64url(Buffer.from(JSON.stringify({ l: claims.lessonId, u: claims.userId, e: claims.exp })));
    return `${payload}.${b64url(createHmac('sha256', this.key).update(payload).digest())}`;
  }

  /** The claims of a well-signed, unexpired token; null otherwise. */
  verify(token: string, now: Date): DownloadClaims | null {
    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra !== undefined) return null;
    const expected = createHmac('sha256', this.key).update(payload).digest();
    const given = fromB64url(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    try {
      const raw = JSON.parse(fromB64url(payload).toString('utf8')) as { l?: unknown; u?: unknown; e?: unknown };
      if (typeof raw.l !== 'string' || typeof raw.u !== 'string' || typeof raw.e !== 'number') return null;
      if (raw.e * 1000 <= now.getTime()) return null;
      return { lessonId: raw.l, userId: raw.u, exp: raw.e };
    } catch {
      return null;
    }
  }
}
