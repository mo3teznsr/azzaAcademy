import { parseCourseVideoUrl, type Role } from '@azza/shared';
import { randomBytes } from 'node:crypto';
import { AppError, BusinessRuleError, NotFoundError } from '../../core/errors';
import type { Clock, MediaUrlSigner, VideoTranscoder } from '../../core/ports';
import type { DownloadLinkSigner } from './download-link';
import { playlistName, rewritePlaylist } from './hls-playlist';
import type { LessonStream, LessonStreamRepository } from './lesson-stream.repository';
import type { LessonService } from './lesson.service';

type Actor = { id: string; role: Role };

export interface StreamingOptions {
  /** Start transcoding as soon as a lesson's uploaded video is saved (default true when a transcoder is configured). */
  transcodeOnUpload: boolean;
  /** Life of signed playback URLs (an HLS session must fit in it). */
  playbackTtlSec: number;
  /** Life of a download link (enough to start the download; the transfer may outlast it). */
  downloadTtlSec: number;
  /** A download plays offline at most this long without the app re-checking access online. */
  offlineMaxDays: number;
  /** Public API origin, for `/api/v1/lesson-downloads/<token>` and `/api/v1/lesson-streams/<token>/…` links. */
  apiUrl: string;
}

export const DEFAULT_STREAMING_OPTIONS: StreamingOptions = {
  transcodeOnUpload: true,
  playbackTtlSec: 6 * 3600,
  downloadTtlSec: 15 * 60,
  offlineMaxDays: 30,
  apiUrl: 'http://localhost:4000',
};

/** What a player needs: HLS when ready, else the caller keeps the lesson's `videoUrl` (MP4). */
export interface LessonPlayback {
  stream: { status: 'PROCESSING' | 'READY' | 'FAILED'; hlsUrl: string | null; posterUrl: string | null; lowMp4Url: string | null; durationSec: number | null } | null;
  /** The lesson has an uploaded video the mobile app may save for offline viewing. */
  downloadable: boolean;
  /** The uploaded file, signed for this viewer — present only when the CDN signs URLs (it then replaces the lesson's `videoUrl`). */
  videoUrl?: string;
}

/** CloudFront signing of playback URLs. Without it (or with a disabled signer) URLs are returned as stored. */
export interface PlaybackSigning {
  signer: MediaUrlSigner;
  /** Tokens of `/lesson-streams/<token>/<playlist>.m3u8` links — a purpose of its own, never accepted as a download link. */
  playlistLinks: DownloadLinkSigner;
}

const DAY_MS = 86_400_000;
/** A PROCESSING asset is re-read by the job once it has been processing this long (webhooks can be lost). */
const POLL_AFTER_MS = 2 * 60_000;
/** Give up on an asset that never finished. */
const GIVE_UP_AFTER_MS = 24 * 3_600_000;

type Access = Pick<LessonService, 'readAccess'>;

/**
 * Adaptive streaming and offline downloads of lesson videos.
 * - Uploaded videos (`parseCourseVideoUrl(...).kind === 'file'`) are sent to the `VideoTranscoder`; the lesson keeps
 *   `streamStatus` and, once READY, its HLS / poster / low-MP4 URLs. A webhook or the `sync-lesson-streams` job marks it ready.
 * - Readers get those URLs signed for a few hours (CloudFront signed URLs, when a key is configured) next to the lesson; HLS
 *   goes through `/lesson-streams/<token>/…` so every segment carries a signature (see `playlist`).
 * - Downloads: an access-checked, 15-minute link to the lowest MP4 rendition when the stream is ready, else to the upload.
 *   The app stores `offlineUntil` and asks `POST /me/lesson-downloads/status` on its next online launch.
 */
export class LessonStreamingService {
  private readonly opts: StreamingOptions;

  constructor(
    private readonly repo: LessonStreamRepository,
    private readonly transcoder: VideoTranscoder,
    private readonly lessons: Access,
    private readonly links: DownloadLinkSigner,
    private readonly clock: Clock = { now: () => new Date() },
    opts: Partial<StreamingOptions> = {},
    private readonly signing?: PlaybackSigning,
  ) {
    this.opts = { ...DEFAULT_STREAMING_OPTIONS, ...opts };
  }

  private get api() {
    return this.opts.apiUrl.replace(/\/$/, '');
  }

  /** Signs a CDN URL until `exp` when signing is on and the URL is ours; anything else is returned unchanged. */
  private sign(url: string, exp: Date) {
    const signer = this.signing?.signer;
    return signer?.enabled && signer.covers(url) ? signer.signUrl(url, exp) : url;
  }

  /**
   * HLS for one viewer. Signed delivery: `<api>/api/v1/lesson-streams/<token>/master.m3u8`, whose playlists the API rewrites
   * with signed segment URLs (see `playlist`). Unsigned: the CDN playlist itself.
   */
  private hlsFor(lessonId: string, hlsUrl: string, exp: Date, viewerId: string) {
    const s = this.signing;
    if (!s?.signer.enabled || !s.signer.covers(hlsUrl)) return hlsUrl;
    const name = playlistName(hlsUrl.slice(hlsUrl.lastIndexOf('/') + 1));
    if (!name) return hlsUrl;
    const token = s.playlistLinks.sign({ lessonId, userId: viewerId, exp: Math.floor(exp.getTime() / 1000) });
    return `${this.api}/api/v1/lesson-streams/${token}/${name}`;
  }

  /** Playback fields to merge into a lesson the viewer may already read. */
  async playback(lessonId: string, viewerId = ''): Promise<LessonPlayback> {
    const s = await this.repo.find(lessonId);
    if (!s) return { stream: null, downloadable: false };
    const downloadable = parseCourseVideoUrl(s.videoUrl)?.kind === 'file';
    const exp = new Date(this.clock.now().getTime() + this.opts.playbackTtlSec * 1000);
    // Originals are signed too when the CDN restricts `course-videos/*` (they no longer rely on unguessable URLs).
    const signedFile = downloadable && this.signing?.signer.enabled && this.signing.signer.covers(s.videoUrl!) ? { videoUrl: this.sign(s.videoUrl!, exp) } : {};
    if (!s.streamStatus || !this.current(s)) return { stream: null, downloadable, ...signedFile };
    const ready = s.streamStatus === 'READY';
    return {
      downloadable,
      ...signedFile,
      stream: {
        status: s.streamStatus,
        hlsUrl: ready && s.hlsUrl ? this.hlsFor(lessonId, s.hlsUrl, exp, viewerId) : null,
        posterUrl: s.posterUrl ? this.sign(s.posterUrl, exp) : null,
        lowMp4Url: ready && s.lowMp4Url ? this.sign(s.lowMp4Url, exp) : null,
        durationSec: s.durationSec,
      },
    };
  }

  /**
   * `GET /lesson-streams/:token/:name` — a playlist of the lesson's current stream, rewritten for the token's holder: nested
   * playlists come back through this route, segments point at CloudFront with a custom-policy signature covering the stream
   * folder until the token expires. The token was issued with the lesson (after its read check) and names no file.
   */
  async playlist(token: string, name: string) {
    const signing = this.signing;
    const claims = signing?.playlistLinks.verify(token, this.clock.now());
    if (!signing?.signer.enabled || !claims) throw new AppError('This playback link has expired', 403, 'PLAYBACK_LINK_INVALID');
    const file = playlistName(name);
    const s = await this.repo.find(claims.lessonId);
    if (!file || !s || s.streamStatus !== 'READY' || !this.current(s) || !s.hlsUrl) throw new NotFoundError('Playlist', name);
    const folder = s.hlsUrl.slice(0, s.hlsUrl.lastIndexOf('/') + 1);
    const cdnUrl = `${folder}${file}`;
    const text = await this.transcoder.readPlaylist(cdnUrl);
    if (text === null) throw new NotFoundError('Playlist', name);
    const exp = new Date(claims.exp * 1000);
    return rewritePlaylist(text, {
      playlistCdnUrl: cdnUrl,
      segmentQuery: signing.signer.prefixQuery(folder, exp),
      playlistUrl: (n) => `${this.api}/api/v1/lesson-streams/${token}/${n}`,
    });
  }

  /** The stream was made from the lesson's current video (a re-upload makes an old stream stale). */
  private current(s: LessonStream) {
    return !!s.videoUrl && s.streamSourceUrl === s.videoUrl;
  }

  /** Hook from `LessonService` after a lesson's video is set or changed: forget the old stream, start a new one. */
  async onVideoChanged(lessonId: string, videoUrl: string | null) {
    await this.repo.save(lessonId, { ...CLEARED, streamUpdatedAt: this.clock.now() });
    if (!this.transcoder.enabled || !this.opts.transcodeOnUpload || parseCourseVideoUrl(videoUrl)?.kind !== 'file') return { started: false };
    await this.prepare(lessonId);
    return { started: true };
  }

  /** Admin "prepare for streaming": sends the lesson's uploaded video to the transcoder (again, when it failed). */
  async prepare(lessonId: string) {
    if (!this.transcoder.enabled) throw new AppError('Adaptive streaming is not configured', 503, 'TRANSCODER_DISABLED');
    const s = await this.repo.find(lessonId);
    if (!s) throw new NotFoundError('Lesson', lessonId);
    if (parseCourseVideoUrl(s.videoUrl)?.kind !== 'file') throw new BusinessRuleError('Only uploaded videos can be prepared for streaming', 'NOT_STREAMABLE');
    if (s.streamStatus && s.streamStatus !== 'FAILED' && this.current(s)) return this.view(s);
    const title = `azza-lesson-${lessonId}-${randomBytes(4).toString('hex')}`;
    const { assetId } = await this.transcoder.createAsset({ sourceUrl: s.videoUrl!, title, lessonId });
    await this.repo.save(lessonId, {
      ...CLEARED,
      streamStatus: 'PROCESSING',
      streamProvider: this.transcoder.provider,
      streamAssetId: assetId,
      streamSourceUrl: s.videoUrl,
      streamUpdatedAt: this.clock.now(),
    });
    return this.view((await this.repo.find(lessonId))!);
  }

  /** Re-reads the asset at the service and stores what it says. */
  async refresh(lessonId: string) {
    const s = await this.repo.find(lessonId);
    if (!s?.streamAssetId || !this.transcoder.enabled || s.streamProvider !== this.transcoder.provider) return s ? this.view(s) : null;
    const now = this.clock.now();
    let asset;
    try {
      asset = await this.transcoder.getAsset(s.streamAssetId);
    } catch (err) {
      if (err instanceof AppError && err.code === 'TRANSCODE_ASSET_NOT_FOUND') {
        await this.repo.save(lessonId, { streamStatus: 'FAILED', streamError: 'The video was deleted at the video service', streamUpdatedAt: now });
        return this.view((await this.repo.find(lessonId))!);
      }
      throw err;
    }
    // While PROCESSING, `streamUpdatedAt` stays at the start, so the job keeps polling and can give up after a day.
    const stillProcessing = asset.status === 'PROCESSING' && s.streamStatus === 'PROCESSING';
    const stuck = stillProcessing && now.getTime() - (s.streamUpdatedAt?.getTime() ?? 0) > GIVE_UP_AFTER_MS;
    await this.repo.save(lessonId, {
      streamStatus: stuck ? 'FAILED' : asset.status,
      hlsUrl: asset.hlsUrl,
      posterUrl: asset.posterUrl,
      lowMp4Url: asset.lowMp4Url,
      durationSec: asset.durationSec,
      streamError: stuck ? 'Encoding took longer than a day' : (asset.error ?? null),
      ...(!stillProcessing || stuck ? { streamUpdatedAt: now } : {}),
    });
    return this.view((await this.repo.find(lessonId))!);
  }

  /** `POST /api/webhooks/mediaconvert` — verified by the transcoder (SNS signature, our topic); the job is re-read with `GetJob`. */
  async handleWebhook(rawBody: string, header: (name: string) => string | undefined) {
    if (!this.transcoder.enabled) return { handled: false };
    const event = await this.transcoder.parseWebhook(rawBody, header);
    if (!event) return { handled: false };
    const ids = await this.repo.lessonIdsByAsset(event.assetId);
    for (const id of ids) await this.refresh(id);
    return { handled: ids.length > 0, lessons: ids.length };
  }

  /** Job: polls assets no webhook has updated lately (webhooks can be lost). */
  async syncProcessing(limit = 25) {
    if (!this.transcoder.enabled) return { checked: 0, ready: 0 };
    const rows = await this.repo.processing(new Date(this.clock.now().getTime() - POLL_AFTER_MS), limit);
    let ready = 0;
    for (const row of rows) {
      try {
        if ((await this.refresh(row.lessonId))?.status === 'READY') ready++;
      } catch (err) {
        console.error(`[streaming] refresh of lesson ${row.lessonId} failed`, err);
      }
    }
    return { checked: rows.length, ready };
  }

  /** Admin backfill (and optional job): prepares up to `limit` lessons whose uploaded video was never sent. */
  async backfill(limit = 10) {
    if (!this.transcoder.enabled) throw new AppError('Adaptive streaming is not configured', 503, 'TRANSCODER_DISABLED');
    let started = 0;
    let skipped = 0;
    for (const row of await this.repo.unprepared(limit)) {
      if (parseCourseVideoUrl(row.videoUrl)?.kind !== 'file') {
        skipped++;
        continue;
      }
      try {
        await this.prepare(row.lessonId);
        started++;
      } catch (err) {
        console.error(`[streaming] prepare of lesson ${row.lessonId} failed`, err);
        await this.repo.save(row.lessonId, { streamStatus: 'FAILED', streamSourceUrl: row.videoUrl, streamError: err instanceof Error ? err.message : 'failed', streamUpdatedAt: this.clock.now() });
      }
    }
    return { started, skipped };
  }

  /** Admin view of one lesson's stream (unsigned); 503 when no video service is configured (the editor then hides it). */
  async status(lessonId: string) {
    if (!this.transcoder.enabled) throw new AppError('Adaptive streaming is not configured', 503, 'TRANSCODER_DISABLED');
    const s = await this.repo.find(lessonId);
    if (!s) throw new NotFoundError('Lesson', lessonId);
    return this.view(s);
  }

  private view(s: LessonStream) {
    return {
      lessonId: s.lessonId,
      status: s.streamStatus && this.current(s) ? s.streamStatus : null,
      provider: s.streamProvider,
      assetId: s.streamAssetId,
      hlsUrl: s.hlsUrl,
      lowMp4Url: s.lowMp4Url,
      durationSec: s.durationSec,
      error: s.streamError,
      updatedAt: s.streamUpdatedAt,
    };
  }

  /**
   * `POST /lessons/:id/download` — same read rule as the lesson. Returns a short-lived link to the smallest file we have:
   * the lowest MP4 rendition of a ready stream (signed at the CDN), else the uploaded video through
   * `/api/v1/lesson-downloads/<token>`.
   */
  async issueDownload(lessonId: string, viewer: Actor) {
    const access = await this.lessons.readAccess(lessonId, viewer);
    if (parseCourseVideoUrl(access.videoUrl)?.kind !== 'file') throw new BusinessRuleError('This lesson has no video to download', 'NOT_DOWNLOADABLE');
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + this.opts.downloadTtlSec * 1000);
    const s = await this.repo.find(lessonId);
    const low = s && s.streamStatus === 'READY' && this.current(s) && s.lowMp4Url ? s.lowMp4Url : null;
    const url = low
      ? this.sign(low, expiresAt)
      : `${this.api}/api/v1/lesson-downloads/${this.links.sign({ lessonId, userId: viewer.id, exp: Math.floor(expiresAt.getTime() / 1000) })}`;
    return {
      lessonId,
      url,
      expiresAt,
      quality: low ? ('low' as const) : ('original' as const),
      durationSec: s?.durationSec ?? null,
      ...this.offlineWindow(access.accessUntil, now),
    };
  }

  /** `GET /lesson-downloads/:token` — the uploaded file behind a valid link (the route redirects to it). */
  async redeemDownload(token: string) {
    const claims = this.links.verify(token, this.clock.now());
    if (!claims) throw new AppError('This download link has expired', 403, 'DOWNLOAD_LINK_INVALID');
    const s = await this.repo.find(claims.lessonId);
    if (!s || parseCourseVideoUrl(s.videoUrl)?.kind !== 'file') throw new NotFoundError('Lesson', claims.lessonId);
    // A short-lived CloudFront URL when the CDN signs (the redirect is followed right away).
    return { url: this.sign(s.videoUrl!, new Date(this.clock.now().getTime() + this.opts.downloadTtlSec * 1000)) };
  }

  /**
   * `POST /me/lesson-downloads/status` — the app's check on its next online launch: which saved lessons may stay. A lesson
   * the viewer can no longer read (plan lapsed, enrolment ended, lesson deleted) comes back `allowed: false`, and the
   * app deletes the file.
   */
  async downloadStatus(lessonIds: string[], viewer: Actor) {
    const now = this.clock.now();
    const items = [];
    for (const lessonId of [...new Set(lessonIds)]) {
      try {
        const access = await this.lessons.readAccess(lessonId, viewer);
        items.push({ lessonId, allowed: parseCourseVideoUrl(access.videoUrl)?.kind === 'file', ...this.offlineWindow(access.accessUntil, now) });
      } catch (err) {
        if (!(err instanceof AppError) || ![401, 403, 404].includes(err.status)) throw err;
        items.push({ lessonId, allowed: false, accessUntil: null, offlineUntil: null, reason: err.code });
      }
    }
    return { items, checkedAt: now };
  }

  /** Pure: offline playback ends at the plan's end, and at most `offlineMaxDays` after this online check. */
  private offlineWindow(accessUntil: Date | null, now: Date) {
    const cap = new Date(now.getTime() + this.opts.offlineMaxDays * DAY_MS);
    return { accessUntil, offlineUntil: accessUntil && accessUntil < cap ? accessUntil : cap };
  }
}

const CLEARED = {
  streamStatus: null,
  streamProvider: null,
  streamAssetId: null,
  streamSourceUrl: null,
  hlsUrl: null,
  posterUrl: null,
  lowMp4Url: null,
  durationSec: null,
  streamError: null,
} as const;
