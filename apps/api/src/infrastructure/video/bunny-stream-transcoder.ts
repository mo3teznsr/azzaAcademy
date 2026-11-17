import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../core/errors';
import type { TranscodeAsset, TranscodeStatus, VideoTranscoder } from '../../core/ports';

/**
 * Bunny Stream (bunny.net) — chosen for lesson videos because:
 * - a plain REST API (one `AccessKey` header) that can *fetch* the video from our CloudFront URL, so nothing is re-uploaded
 *   through the API;
 * - HLS with several renditions (240p–1080p) plus progressive MP4 fallbacks (`play_360p.mp4`), which the apps use for
 *   data saver and offline downloads;
 * - delivery through bunny.net's CDN, which has Middle East edge locations and low per-GB prices (most of the cost of video
 *   for learners on metered connections is delivery);
 * - HMAC-signed webhooks and HMAC CDN tokens (directory tokens cover HLS segments).
 *
 * Setup: Stream → add a library (enable the 240p and 360p resolutions and "MP4 fallback"); note the library id, the API key
 * and the read-only API key (API tab), and the CDN hostname (`vz-xxxx.b-cdn.net`). Set the webhook URL to
 * `${API_URL}/api/webhooks/bunny-stream`. Optional: in the library's pull zone, turn on token authentication and copy its key.
 */
export const BUNNY_STREAM_API = 'https://video.bunnycdn.com';

export interface BunnyStreamConfig {
  libraryId: string;
  apiKey: string;
  /** Read-only API key: the secret Bunny signs webhooks with. */
  readOnlyApiKey?: string;
  /** e.g. `vz-1234abcd-123.b-cdn.net` (no scheme). */
  cdnHost: string;
  /** Pull-zone token authentication key; when set, playback URLs are signed. */
  tokenKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

interface RawVideo {
  guid?: string;
  status?: number;
  length?: number;
  availableResolutions?: string | null;
  thumbnailFileName?: string | null;
  hasMP4Fallback?: boolean;
  encodeProgress?: number;
}

/** Bunny's numeric status: 0 queued, 1 processing, 2 encoding, 3 finished, 4 resolution finished (playable), 5 failed. */
export function bunnyStatus(code: number | undefined): TranscodeStatus {
  if (code === 5 || code === 8) return 'FAILED';
  if (code === 3) return 'READY';
  // A first finished resolution makes the video playable, but we wait for the full ladder so the quality menu is stable.
  return 'PROCESSING';
}

/** `"240p,360p,720p"` → `[240, 360, 720]` (sorted, unique). */
export function parseResolutions(value: string | null | undefined): number[] {
  const heights = (value ?? '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(heights)].sort((a, b) => a - b);
}

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Pure: bunny.net advanced (HMAC-SHA256) token authentication.
 * token = "HS256-" + base64url(HMAC(key, signaturePath + expires + signingData)), where signaturePath is `token_path` when set
 * and signingData the other parameters sorted and joined as `key=value&…`. Directory tokens go in the path
 * (`/bcdn_token=…&expires=…&token_path=…/<path>`), so HLS players resolve segment URLs with the token in them.
 */
export function signBunnyUrl(url: string, key: string, expiresAt: Date, opts: { directory?: boolean } = {}): string {
  const u = new URL(url);
  const expires = Math.floor(expiresAt.getTime() / 1000);
  const tokenPath = opts.directory ? u.pathname.replace(/[^/]*$/, '') : null;
  const params: Record<string, string> = tokenPath ? { token_path: tokenPath } : {};
  const signingData = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const token = `HS256-${b64url(createHmac('sha256', key).update(`${tokenPath ?? u.pathname}${expires}${signingData}`).digest())}`;
  if (tokenPath) {
    return `${u.origin}/bcdn_token=${token}&expires=${expires}&token_path=${encodeURIComponent(tokenPath)}${u.pathname}`;
  }
  u.searchParams.set('token', token);
  u.searchParams.set('expires', String(expires));
  return u.toString();
}

export class BunnyStreamTranscoder implements VideoTranscoder {
  readonly provider = 'bunny';
  readonly enabled = true;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: BunnyStreamConfig) {
    this.baseUrl = (config.baseUrl ?? BUNNY_STREAM_API).replace(/\/$/, '');
    this.fetchImpl = config.fetch ?? fetch;
  }

  private get cdn() {
    return `https://${this.config.cdnHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/library/${this.config.libraryId}${path}`, {
        method,
        headers: { AccessKey: this.config.apiKey, accept: 'application/json', ...(body !== undefined && { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000),
      });
    } catch {
      throw new AppError('The video service did not answer', 502, 'TRANSCODER_UNAVAILABLE');
    }
    if (res.status === 404) throw new AppError('Video not found at the video service', 404, 'TRANSCODE_ASSET_NOT_FOUND');
    if (!res.ok) throw new AppError(`The video service refused the request (${res.status})`, 502, 'TRANSCODER_ERROR');
    return (await res.json().catch(() => ({}))) as T;
  }

  /**
   * Bunny fetches the file from `sourceUrl`. The fetch answer does not always carry the new video's id, so the title is
   * unique (callers include the lesson id and a nonce) and the video is looked up by it when the id is missing.
   */
  async createAsset({ sourceUrl, title }: { sourceUrl: string; title: string }) {
    const out = await this.call<{ id?: string; guid?: string; success?: boolean; message?: string }>('POST', '/videos/fetch', { url: sourceUrl, title });
    if (out.success === false) throw new AppError(out.message || 'The video service could not fetch the video', 502, 'TRANSCODER_ERROR');
    const id = out.id ?? out.guid;
    if (id) return { assetId: id };
    const list = await this.call<{ items?: Array<{ guid?: string; title?: string }> }>('GET', `/videos?page=1&itemsPerPage=5&search=${encodeURIComponent(title)}`);
    const found = list.items?.find((v) => v.title === title && v.guid);
    if (!found?.guid) throw new AppError('The video service did not return the new video', 502, 'TRANSCODER_ERROR');
    return { assetId: found.guid };
  }

  async getAsset(assetId: string): Promise<TranscodeAsset> {
    const v = await this.call<RawVideo>('GET', `/videos/${encodeURIComponent(assetId)}`);
    const renditions = parseResolutions(v.availableResolutions);
    const status = bunnyStatus(v.status);
    const ready = status === 'READY';
    const base = `${this.cdn}/${assetId}`;
    // MP4 fallbacks exist for the encoded heights up to 720p; the lowest is the data-saver / download file.
    const low = renditions.find((h) => h <= 720);
    return {
      assetId,
      status,
      hlsUrl: ready ? `${base}/playlist.m3u8` : null,
      posterUrl: v.thumbnailFileName ? `${base}/${v.thumbnailFileName}` : null,
      lowMp4Url: ready && v.hasMP4Fallback !== false && low ? `${base}/play_${low}p.mp4` : null,
      durationSec: v.length && v.length > 0 ? Math.round(v.length) : null,
      renditions,
      error: status === 'FAILED' ? 'Encoding failed at the video service' : null,
    };
  }

  parseWebhook(rawBody: string, header: (name: string) => string | undefined) {
    const secret = this.config.readOnlyApiKey;
    if (secret) {
      const sig = header('x-bunnystream-signature') ?? '';
      const version = header('x-bunnystream-signature-version');
      const algorithm = header('x-bunnystream-signature-algorithm');
      const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
      const ok = version === 'v1' && algorithm === 'hmac-sha256' && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!ok) throw new AppError('Bad webhook signature', 401, 'WEBHOOK_SIGNATURE');
    }
    let body: { VideoLibraryId?: number | string; VideoGuid?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new AppError('Webhook body is not JSON', 400, 'WEBHOOK_BODY');
    }
    if (String(body.VideoLibraryId ?? '') !== String(this.config.libraryId) || !body.VideoGuid) return null;
    return { assetId: body.VideoGuid };
  }

  signUrl(url: string, expiresAt: Date, opts: { directory?: boolean } = {}) {
    if (!this.config.tokenKey) return url;
    if (!url.startsWith(`${this.cdn}/`)) return url;
    return signBunnyUrl(url, this.config.tokenKey, expiresAt, opts);
  }
}

/** No transcoding service configured: lessons keep playing their uploaded MP4. */
export class DisabledVideoTranscoder implements VideoTranscoder {
  readonly provider = 'disabled';
  readonly enabled = false;
  private off(): never {
    throw new AppError('Adaptive streaming is not configured', 503, 'TRANSCODER_DISABLED');
  }
  async createAsset(): Promise<{ assetId: string }> {
    return this.off();
  }
  async getAsset(): Promise<TranscodeAsset> {
    return this.off();
  }
  parseWebhook(): { assetId: string } | null {
    return this.off();
  }
  signUrl(url: string) {
    return url;
  }
}
