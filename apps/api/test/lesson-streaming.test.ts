import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { AppError, ForbiddenError, PlanRequiredError } from '../src/core/errors';
import type { TranscodeAsset, VideoTranscoder } from '../src/core/ports';
import { BunnyStreamTranscoder, DisabledVideoTranscoder, parseResolutions, signBunnyUrl } from '../src/infrastructure/video/bunny-stream-transcoder';
import { DownloadLinkSigner } from '../src/modules/lessons/download-link';
import type { LessonStream, LessonStreamRepository, LessonStreamWrite } from '../src/modules/lessons/lesson-stream.repository';
import { LessonStreamingService } from '../src/modules/lessons/lesson-streaming.service';

const VIDEO = 'https://cdn.azza.test/course-videos/0123456789abcdef0123456789abcdef.mp4';

// ---------- Bunny Stream adapter (fetch is stubbed; the real service is never called) ----------

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
function stubFetch(routes: Array<[RegExp, (call: Call) => { status?: number; body: unknown }]>) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const route = routes.find(([re]) => re.test(`${call.method} ${call.url}`));
    if (!route) return new Response('not found', { status: 404 });
    const out = route[1](call);
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}

const bunny = (fetchImpl: typeof fetch, extra: Partial<ConstructorParameters<typeof BunnyStreamTranscoder>[0]> = {}) =>
  new BunnyStreamTranscoder({ libraryId: '42', apiKey: 'key', cdnHost: 'vz-test.b-cdn.net', fetch: fetchImpl, ...extra });

describe('BunnyStreamTranscoder', () => {
  test('creates an asset by fetching the uploaded video, with the AccessKey header', async () => {
    const { impl, calls } = stubFetch([[/POST .*\/library\/42\/videos\/fetch$/, () => ({ body: { success: true, id: 'guid-1' } })]]);
    expect(await bunny(impl).createAsset({ sourceUrl: VIDEO, title: 'azza-lesson-l1-ab' })).toEqual({ assetId: 'guid-1' });
    expect(calls[0]!.headers.AccessKey).toBe('key');
    expect(calls[0]!.body).toEqual({ url: VIDEO, title: 'azza-lesson-l1-ab' });
  });

  test('finds the new video by its unique title when the fetch answer has no id', async () => {
    const { impl, calls } = stubFetch([
      [/POST .*\/videos\/fetch$/, () => ({ body: { success: true, statusCode: 200 } })],
      [/GET .*\/videos\?/, () => ({ body: { items: [{ guid: 'other', title: 'azza-lesson-l1' }, { guid: 'guid-2', title: 'azza-lesson-l1-ab' }] } })],
    ]);
    expect(await bunny(impl).createAsset({ sourceUrl: VIDEO, title: 'azza-lesson-l1-ab' })).toEqual({ assetId: 'guid-2' });
    expect(calls[1]!.url).toContain('search=azza-lesson-l1-ab');
  });

  test('a refused fetch is a 502', async () => {
    const { impl } = stubFetch([[/POST .*\/videos\/fetch$/, () => ({ status: 400, body: { success: false } })]]);
    await expect(bunny(impl).createAsset({ sourceUrl: VIDEO, title: 't' })).rejects.toMatchObject({ status: 502, code: 'TRANSCODER_ERROR' });
  });

  test('maps a finished video to HLS, poster and the lowest MP4 rendition', async () => {
    const { impl } = stubFetch([
      [/GET .*\/videos\/guid-1$/, () => ({ body: { guid: 'guid-1', status: 3, length: 612.4, availableResolutions: '720p,240p,360p,1080p', thumbnailFileName: 'thumbnail.jpg', hasMP4Fallback: true } })],
    ]);
    const asset = await bunny(impl).getAsset('guid-1');
    expect(asset).toEqual({
      assetId: 'guid-1',
      status: 'READY',
      hlsUrl: 'https://vz-test.b-cdn.net/guid-1/playlist.m3u8',
      posterUrl: 'https://vz-test.b-cdn.net/guid-1/thumbnail.jpg',
      lowMp4Url: 'https://vz-test.b-cdn.net/guid-1/play_240p.mp4',
      durationSec: 612,
      renditions: [240, 360, 720, 1080],
      error: null,
    });
  });

  test('encoding and failed videos have no playback URLs', async () => {
    const { impl } = stubFetch([
      [/GET .*\/videos\/enc$/, () => ({ body: { status: 4, availableResolutions: '240p' } })],
      [/GET .*\/videos\/bad$/, () => ({ body: { status: 5 } })],
      [/GET .*\/videos\/gone$/, () => ({ status: 404, body: {} })],
    ]);
    const t = bunny(impl);
    expect(await t.getAsset('enc')).toMatchObject({ status: 'PROCESSING', hlsUrl: null, lowMp4Url: null });
    expect(await t.getAsset('bad')).toMatchObject({ status: 'FAILED', hlsUrl: null });
    await expect(t.getAsset('gone')).rejects.toMatchObject({ code: 'TRANSCODE_ASSET_NOT_FOUND' });
  });

  test('webhooks: HMAC-SHA256 of the raw body with the read-only key; other libraries are ignored', () => {
    const t = bunny(stubFetch([]).impl, { readOnlyApiKey: 'ro-key' });
    const body = JSON.stringify({ VideoLibraryId: 42, VideoGuid: 'guid-1', Status: 3 });
    const sig = createHmac('sha256', 'ro-key').update(body).digest('hex');
    const headers = (s: string) => (n: string) => ({ 'x-bunnystream-signature': s, 'x-bunnystream-signature-version': 'v1', 'x-bunnystream-signature-algorithm': 'hmac-sha256' })[n];
    expect(t.parseWebhook(body, headers(sig))).toEqual({ assetId: 'guid-1' });
    expect(() => t.parseWebhook(body, headers('0'.repeat(64)))).toThrow(AppError);
    const other = JSON.stringify({ VideoLibraryId: 7, VideoGuid: 'x', Status: 3 });
    expect(t.parseWebhook(other, headers(createHmac('sha256', 'ro-key').update(other).digest('hex')))).toBeNull();
  });

  test('signs CDN URLs only when a token key is set; HLS gets a directory token in the path', () => {
    const exp = new Date('2026-11-17T00:00:00Z');
    expect(bunny(stubFetch([]).impl).signUrl('https://vz-test.b-cdn.net/g/playlist.m3u8', exp)).toBe('https://vz-test.b-cdn.net/g/playlist.m3u8');
    const signed = bunny(stubFetch([]).impl, { tokenKey: 'tk' }).signUrl('https://vz-test.b-cdn.net/g/playlist.m3u8', exp, { directory: true });
    expect(signed).toMatch(/^https:\/\/vz-test\.b-cdn\.net\/bcdn_token=HS256-[\w-]+&expires=1794873600&token_path=%2Fg%2F\/g\/playlist\.m3u8$/);
    // Foreign URLs are left alone.
    expect(bunny(stubFetch([]).impl, { tokenKey: 'tk' }).signUrl(VIDEO, exp)).toBe(VIDEO);
  });

  test('token = HS256- + base64url(HMAC(key, path + expires + params))', () => {
    const exp = new Date(1_000_000 * 1000);
    const url = signBunnyUrl('https://z.b-cdn.net/g/play_240p.mp4', 'k', exp);
    const expected = createHmac('sha256', 'k').update('/g/play_240p.mp4' + '1000000').digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(new URL(url).searchParams.get('token')).toBe(`HS256-${expected}`);
    expect(new URL(url).searchParams.get('expires')).toBe('1000000');
  });

  test('parseResolutions', () => {
    expect(parseResolutions('360p, 240p,abc,360p')).toEqual([240, 360]);
    expect(parseResolutions(null)).toEqual([]);
  });

  test('the disabled transcoder refuses work and leaves URLs alone', async () => {
    const t = new DisabledVideoTranscoder();
    expect(t.enabled).toBe(false);
    await expect(t.createAsset()).rejects.toMatchObject({ code: 'TRANSCODER_DISABLED' });
    expect(t.signUrl(VIDEO)).toBe(VIDEO);
  });
});

// ---------- Streaming service ----------

class MemoryStreams implements LessonStreamRepository {
  rows = new Map<string, LessonStream>();
  add(lessonId: string, videoUrl: string | null, extra: Partial<LessonStream> = {}) {
    this.rows.set(lessonId, {
      lessonId,
      titleEn: lessonId,
      videoUrl,
      streamStatus: null,
      streamProvider: null,
      streamAssetId: null,
      streamSourceUrl: null,
      hlsUrl: null,
      posterUrl: null,
      lowMp4Url: null,
      durationSec: null,
      streamError: null,
      streamUpdatedAt: null,
      ...extra,
    });
  }
  async find(id: string) {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
  async save(id: string, data: LessonStreamWrite) {
    this.rows.set(id, { ...this.rows.get(id)!, ...data });
  }
  async lessonIdsByAsset(assetId: string) {
    return [...this.rows.values()].filter((r) => r.streamAssetId === assetId).map((r) => r.lessonId);
  }
  async processing(before: Date, limit: number) {
    return [...this.rows.values()].filter((r) => r.streamStatus === 'PROCESSING' && (!r.streamUpdatedAt || r.streamUpdatedAt < before)).slice(0, limit);
  }
  async unprepared(limit: number) {
    return [...this.rows.values()].filter((r) => !r.streamStatus && r.videoUrl).slice(0, limit);
  }
}

class FakeTranscoder implements VideoTranscoder {
  readonly provider = 'bunny';
  readonly enabled = true;
  created: Array<{ sourceUrl: string; title: string }> = [];
  assets = new Map<string, TranscodeAsset>();
  async createAsset(input: { sourceUrl: string; title: string }) {
    this.created.push(input);
    const assetId = `asset-${this.created.length}`;
    this.assets.set(assetId, { assetId, status: 'PROCESSING', hlsUrl: null, posterUrl: null, lowMp4Url: null, durationSec: null, renditions: [] });
    return { assetId };
  }
  finish(assetId: string) {
    this.assets.set(assetId, {
      assetId,
      status: 'READY',
      hlsUrl: `https://cdn.test/${assetId}/playlist.m3u8`,
      posterUrl: `https://cdn.test/${assetId}/thumb.jpg`,
      lowMp4Url: `https://cdn.test/${assetId}/play_240p.mp4`,
      durationSec: 300,
      renditions: [240, 720],
    });
  }
  async getAsset(id: string) {
    const a = this.assets.get(id);
    if (!a) throw new AppError('gone', 404, 'TRANSCODE_ASSET_NOT_FOUND');
    return a;
  }
  parseWebhook(raw: string) {
    const body = JSON.parse(raw) as { VideoGuid?: string };
    return body.VideoGuid ? { assetId: body.VideoGuid } : null;
  }
  signUrl(url: string, exp: Date, opts: { directory?: boolean } = {}) {
    return `${url}?signed=${exp.getTime()}${opts.directory ? '&dir=1' : ''}`;
  }
}

const NOW = new Date('2026-11-17T10:00:00Z');
const student = { id: 'u1', role: 'STUDENT' as const };

function setup(opts: { access?: Record<string, { allowed: boolean; accessUntil?: Date | null; error?: Error }>; transcoder?: VideoTranscoder; now?: () => Date } = {}) {
  const repo = new MemoryStreams();
  const transcoder = opts.transcoder ?? new FakeTranscoder();
  const clock = { now: opts.now ?? (() => NOW) };
  const signer = new DownloadLinkSigner('x'.repeat(32));
  const access = opts.access ?? {};
  const lessons = {
    readAccess: async (lessonId: string) => {
      const rule = access[lessonId] ?? { allowed: true };
      if (!rule.allowed) throw rule.error ?? new ForbiddenError('no');
      return { lessonId, courseId: 'c1', videoUrl: repo.rows.get(lessonId)?.videoUrl ?? null, accessUntil: rule.accessUntil ?? null };
    },
  };
  const service = new LessonStreamingService(repo, transcoder, lessons, signer, clock, { apiUrl: 'https://api.azza.test', offlineMaxDays: 30 });
  return { repo, transcoder: transcoder as FakeTranscoder, service, signer };
}

describe('LessonStreamingService: transcoding', () => {
  test('saving an uploaded video starts an asset; YouTube links and a disabled transcoder do not', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    expect(await service.onVideoChanged('l1', VIDEO)).toEqual({ started: true });
    expect(transcoder.created[0]!.sourceUrl).toBe(VIDEO);
    expect(transcoder.created[0]!.title).toStartWith('azza-lesson-l1-');
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'PROCESSING', streamAssetId: 'asset-1', streamSourceUrl: VIDEO, streamProvider: 'bunny' });

    repo.add('l2', 'https://youtu.be/dQw4w9WgXcQ');
    expect(await service.onVideoChanged('l2', 'https://youtu.be/dQw4w9WgXcQ')).toEqual({ started: false });

    const off = setup({ transcoder: new DisabledVideoTranscoder() });
    off.repo.add('l1', VIDEO, { streamStatus: 'READY', streamSourceUrl: 'old', hlsUrl: 'old' });
    expect(await off.service.onVideoChanged('l1', VIDEO)).toEqual({ started: false });
    expect(off.repo.rows.get('l1')).toMatchObject({ streamStatus: null, hlsUrl: null });
  });

  test('the webhook re-reads the asset and stores the playback URLs', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    await service.prepare('l1');
    transcoder.finish('asset-1');
    expect(await service.handleWebhook(JSON.stringify({ VideoGuid: 'asset-1' }), () => undefined)).toEqual({ handled: true, lessons: 1 });
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'READY', hlsUrl: 'https://cdn.test/asset-1/playlist.m3u8', lowMp4Url: 'https://cdn.test/asset-1/play_240p.mp4', durationSec: 300 });
    expect(await service.handleWebhook(JSON.stringify({ VideoGuid: 'unknown' }), () => undefined)).toEqual({ handled: false, lessons: 0 });
  });

  test('the job polls processing assets older than two minutes and gives up after a day', async () => {
    let now = NOW;
    const { repo, transcoder, service } = setup({ now: () => now });
    repo.add('l1', VIDEO);
    repo.add('l2', VIDEO);
    await service.prepare('l1');
    await service.prepare('l2');
    expect(await service.syncProcessing()).toEqual({ checked: 0, ready: 0 }); // too fresh
    now = new Date(NOW.getTime() + 5 * 60_000);
    transcoder.finish('asset-1');
    expect(await service.syncProcessing()).toEqual({ checked: 2, ready: 1 });
    expect(repo.rows.get('l1')!.streamStatus).toBe('READY');
    // l2 stays PROCESSING with its start time kept, so after a day it fails.
    expect(repo.rows.get('l2')!.streamUpdatedAt).toEqual(NOW);
    now = new Date(NOW.getTime() + 25 * 3_600_000);
    await service.syncProcessing();
    expect(repo.rows.get('l2')).toMatchObject({ streamStatus: 'FAILED', streamError: 'Encoding took longer than a day' });
  });

  test('an asset deleted at the service fails the stream', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    await service.prepare('l1');
    transcoder.assets.clear();
    expect((await service.refresh('l1'))!.status).toBe('FAILED');
  });

  test('backfill prepares uploaded videos only', async () => {
    const { repo, service, transcoder } = setup();
    repo.add('l1', VIDEO);
    repo.add('l2', 'https://vimeo.com/123456789');
    repo.add('l3', VIDEO, { streamStatus: 'READY', streamSourceUrl: VIDEO });
    expect(await service.backfill(10)).toEqual({ started: 1, skipped: 1 });
    expect(transcoder.created).toHaveLength(1);
  });

  test('prepare refuses links that are not uploaded videos and is a no-op while processing', async () => {
    const { repo, service, transcoder } = setup();
    repo.add('yt', 'https://youtu.be/dQw4w9WgXcQ');
    await expect(service.prepare('yt')).rejects.toMatchObject({ code: 'NOT_STREAMABLE' });
    repo.add('l1', VIDEO);
    await service.prepare('l1');
    await service.prepare('l1');
    expect(transcoder.created).toHaveLength(1);
  });
});

describe('LessonStreamingService: playback', () => {
  test('ready streams come back signed; stale streams (a re-upload) and missing ones fall back to the MP4', async () => {
    const { repo, service } = setup();
    repo.add('l1', VIDEO, { streamStatus: 'READY', streamSourceUrl: VIDEO, hlsUrl: 'https://cdn.test/a/playlist.m3u8', lowMp4Url: 'https://cdn.test/a/play_240p.mp4', durationSec: 300 });
    const p = await service.playback('l1');
    const exp = NOW.getTime() + 6 * 3600_000;
    expect(p).toEqual({
      downloadable: true,
      stream: { status: 'READY', hlsUrl: `https://cdn.test/a/playlist.m3u8?signed=${exp}&dir=1`, posterUrl: null, lowMp4Url: `https://cdn.test/a/play_240p.mp4?signed=${exp}`, durationSec: 300 },
    });

    repo.add('l2', VIDEO, { streamStatus: 'READY', streamSourceUrl: 'https://cdn.azza.test/course-videos/old.mp4', hlsUrl: 'x' });
    expect(await service.playback('l2')).toEqual({ stream: null, downloadable: true });

    repo.add('l3', VIDEO, { streamStatus: 'PROCESSING', streamSourceUrl: VIDEO });
    expect((await service.playback('l3')).stream).toMatchObject({ status: 'PROCESSING', hlsUrl: null });

    repo.add('yt', 'https://youtu.be/dQw4w9WgXcQ');
    expect(await service.playback('yt')).toEqual({ stream: null, downloadable: false });
  });
});

describe('LessonStreamingService: downloads', () => {
  test('a reader gets a 15-minute link to the low rendition when the stream is ready', async () => {
    const until = new Date('2026-11-30T00:00:00Z');
    const { repo, service } = setup({ access: { l1: { allowed: true, accessUntil: until } } });
    repo.add('l1', VIDEO, { streamStatus: 'READY', streamSourceUrl: VIDEO, lowMp4Url: 'https://cdn.test/a/play_240p.mp4', durationSec: 300 });
    const d = await service.issueDownload('l1', student);
    expect(d).toMatchObject({ lessonId: 'l1', quality: 'low', accessUntil: until, offlineUntil: until, durationSec: 300 });
    expect(d.expiresAt).toEqual(new Date(NOW.getTime() + 15 * 60_000));
    expect(d.url).toBe(`https://cdn.test/a/play_240p.mp4?signed=${d.expiresAt.getTime()}`);
  });

  test('without a stream the link is an API token for the upload; it redeems until it expires', async () => {
    let now = NOW;
    const { repo, service } = setup({ now: () => now });
    repo.add('l1', VIDEO);
    const d = await service.issueDownload('l1', student);
    expect(d.quality).toBe('original');
    // No plan end: offline playback is capped at 30 days from this check.
    expect(d.offlineUntil).toEqual(new Date(NOW.getTime() + 30 * 86_400_000));
    expect(d.url).toStartWith('https://api.azza.test/api/v1/lesson-downloads/');
    const token = d.url.split('/').pop()!;
    expect(await service.redeemDownload(token)).toEqual({ url: VIDEO });
    await expect(service.redeemDownload(`${token}x`)).rejects.toMatchObject({ code: 'DOWNLOAD_LINK_INVALID' });
    now = new Date(NOW.getTime() + 16 * 60_000);
    await expect(service.redeemDownload(token)).rejects.toMatchObject({ code: 'DOWNLOAD_LINK_INVALID' });
  });

  test('no link without read access, and none for lessons without an uploaded video', async () => {
    const { repo, service } = setup({ access: { l1: { allowed: false, error: new PlanRequiredError('course', true) } } });
    repo.add('l1', VIDEO);
    await expect(service.issueDownload('l1', student)).rejects.toMatchObject({ status: 403 });
    repo.add('yt', 'https://youtu.be/dQw4w9WgXcQ');
    await expect(service.issueDownload('yt', student)).rejects.toMatchObject({ code: 'NOT_DOWNLOADABLE' });
  });

  test('the launch check tells the app which saved lessons to delete', async () => {
    const soon = new Date('2026-11-20T00:00:00Z');
    const { repo, service } = setup({ access: { lapsed: { allowed: false, error: new PlanRequiredError('course', true) }, ok: { allowed: true, accessUntil: soon } } });
    repo.add('ok', VIDEO);
    repo.add('lapsed', VIDEO);
    const out = await service.downloadStatus(['ok', 'lapsed', 'ok'], student);
    expect(out.items).toEqual([
      { lessonId: 'ok', allowed: true, accessUntil: soon, offlineUntil: soon },
      { lessonId: 'lapsed', allowed: false, accessUntil: null, offlineUntil: null, reason: 'PLAN_REQUIRED' },
    ]);
  });
});

describe('DownloadLinkSigner', () => {
  test('rejects tampered payloads and other secrets', () => {
    const a = new DownloadLinkSigner('a'.repeat(32));
    const b = new DownloadLinkSigner('b'.repeat(32));
    const token = a.sign({ lessonId: 'l1', userId: 'u1', exp: Math.floor(NOW.getTime() / 1000) + 60 });
    expect(a.verify(token, NOW)).toEqual({ lessonId: 'l1', userId: 'u1', exp: Math.floor(NOW.getTime() / 1000) + 60 });
    expect(b.verify(token, NOW)).toBeNull();
    const [, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ l: 'l2', u: 'u1', e: 9e9 })).toString('base64url')}.${sig}`;
    expect(a.verify(forged, NOW)).toBeNull();
  });
});
