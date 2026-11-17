import { describe, expect, test } from 'bun:test';
import { createSign, createVerify, generateKeyPairSync } from 'node:crypto';
import { CreateJobCommand, GetJobCommand, type Job } from '@aws-sdk/client-mediaconvert';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig, mediaConvertConfigured, resolveCloudFrontSigning } from '../src/core/config';
import { AppError, ForbiddenError, PlanRequiredError } from '../src/core/errors';
import type { MediaUrlSigner, TranscodeAsset, VideoTranscoder } from '../src/core/ports';
import { CloudFrontUrlSigner, decodeCloudFrontPolicy, UnsignedUrls } from '../src/infrastructure/cdn/cloudfront-url-signer';
import { assetFromJob, DisabledVideoTranscoder, HLS_LADDER, MediaConvertTranscoder, type SdkClient } from '../src/infrastructure/video/mediaconvert-transcoder';
import { snsStringToSign, type SnsMessage } from '../src/infrastructure/video/sns-message';
import { DownloadLinkSigner } from '../src/modules/lessons/download-link';
import { rewritePlaylist } from '../src/modules/lessons/hls-playlist';
import type { LessonStream, LessonStreamRepository, LessonStreamWrite } from '../src/modules/lessons/lesson-stream.repository';
import { LessonStreamingService } from '../src/modules/lessons/lesson-streaming.service';

const CDN = 'https://cdn.azza.test';
const VIDEO = `${CDN}/course-videos/0123456789abcdef0123456789abcdef.mp4`;
const BUCKET = 'azza-uploads-test';
const TOPIC = 'arn:aws:sns:me-central-1:123456789012:azza-mediaconvert';

// ---------- MediaConvert adapter (SDK clients and fetch are stubbed; AWS is never called) ----------

function stubClient(handle: (command: object) => unknown) {
  const sent: object[] = [];
  const client: SdkClient = {
    async send(command: object) {
      sent.push(command);
      return handle(command);
    },
  };
  return { client, sent };
}

const mediaconvert = (extra: Partial<ConstructorParameters<typeof MediaConvertTranscoder>[0]> = {}) =>
  new MediaConvertTranscoder({ region: 'me-central-1', roleArn: 'arn:aws:iam::123456789012:role/azza-mediaconvert', bucket: BUCKET, cdnBaseUrl: CDN, ...extra });

/** A finished job as GetJob returns it: the settings we submitted plus output details. */
function completedJob(over: Partial<Job> = {}): Job {
  let settings: Job['Settings'];
  const { client } = stubClient((c) => {
    settings = (c as CreateJobCommand).input.Settings;
    return { Job: { Id: 'job-1' } };
  });
  void mediaconvert({ mediaConvert: client }).createAsset({ sourceUrl: VIDEO, title: 't', lessonId: 'l1' });
  return {
    Id: 'job-1',
    Role: 'r',
    Status: 'COMPLETE',
    Settings: settings!,
    OutputGroupDetails: [
      { OutputDetails: [240, 360, 720, 1080].map((h) => ({ DurationInMs: 612_400, VideoDetails: { HeightInPx: h, WidthInPx: Math.round((h * 16) / 9) } })) },
      { OutputDetails: [{ DurationInMs: 612_400 }] },
      { OutputDetails: [{}] },
    ],
    ...over,
  };
}

describe('MediaConvertTranscoder: jobs', () => {
  test('submits a job reading the upload in place and writing HLS, a low MP4 and a poster under streams/<lessonId>/', async () => {
    const { client, sent } = stubClient(() => ({ Job: { Id: '1700000000000-abc123' } }));
    const t = mediaconvert({ mediaConvert: client, queueArn: 'arn:aws:mediaconvert:me-central-1:123456789012:queues/Default' });
    expect(await t.createAsset({ sourceUrl: VIDEO, title: 'azza-lesson-l1-ab', lessonId: 'l1' })).toEqual({ assetId: '1700000000000-abc123' });
    const cmd = sent[0] as CreateJobCommand;
    expect(cmd).toBeInstanceOf(CreateJobCommand);
    const input = cmd.input;
    expect(input.Role).toBe('arn:aws:iam::123456789012:role/azza-mediaconvert');
    expect(input.Queue).toContain('queues/Default');
    expect(input.Settings!.Inputs![0]!.FileInput).toBe(`s3://${BUCKET}/course-videos/0123456789abcdef0123456789abcdef.mp4`);
    const [hls, mp4, poster] = input.Settings!.OutputGroups!;
    const dest = hls!.OutputGroupSettings!.HlsGroupSettings!.Destination!;
    expect(dest).toMatch(new RegExp(`^s3://${BUCKET}/streams/l1/[a-f0-9]{12}/hls/master$`));
    const folder = dest.replace(/hls\/master$/, '');
    expect(hls!.Outputs!.map((o) => o.VideoDescription!.Height)).toEqual(HLS_LADDER.map((r) => r.height));
    expect(hls!.Outputs!.every((o) => o.AudioDescriptions![0]!.CodecSettings!.Codec === 'AAC')).toBe(true);
    expect(mp4!.OutputGroupSettings!.FileGroupSettings!.Destination).toBe(`${folder}mp4/lesson`);
    expect(mp4!.Outputs![0]!.ContainerSettings!.Container).toBe('MP4');
    expect(mp4!.Outputs![0]!.VideoDescription!.Height).toBe(360);
    expect(poster!.OutputGroupSettings!.FileGroupSettings!.Destination).toBe(`${folder}poster/lesson`);
    expect(poster!.Outputs![0]!.VideoDescription!.CodecSettings!.Codec).toBe('FRAME_CAPTURE');
    expect(input.UserMetadata).toMatchObject({ app: 'azza', lessonId: 'l1', title: 'azza-lesson-l1-ab' });
  });

  test('refuses sources outside our storage (and our own stream outputs)', async () => {
    const t = mediaconvert({ mediaConvert: stubClient(() => ({ Job: { Id: 'x' } })).client });
    await expect(t.createAsset({ sourceUrl: 'https://elsewhere.test/v.mp4', title: 't' })).rejects.toMatchObject({ code: 'NOT_STREAMABLE' });
    await expect(t.createAsset({ sourceUrl: `${CDN}/streams/l1/abc/mp4/lesson_low.mp4`, title: 't' })).rejects.toMatchObject({ code: 'NOT_STREAMABLE' });
  });

  test('an SDK failure is a 502', async () => {
    const t = mediaconvert({ mediaConvert: stubClient(() => Promise.reject(Object.assign(new Error('denied'), { name: 'ForbiddenException' }))).client });
    const log = console.error;
    console.error = () => undefined;
    await expect(t.createAsset({ sourceUrl: VIDEO, title: 't' })).rejects.toMatchObject({ status: 502, code: 'TRANSCODER_ERROR' });
    console.error = log;
  });

  test('polling: a COMPLETE job maps to HLS, poster, low MP4, duration and the encoded heights', async () => {
    const job = completedJob();
    const { client, sent } = stubClient(() => ({ Job: job }));
    const asset = await mediaconvert({ mediaConvert: client }).getAsset('job-1');
    expect((sent[0] as GetJobCommand).input).toEqual({ Id: 'job-1' });
    const folder = job.Settings!.OutputGroups![0]!.OutputGroupSettings!.HlsGroupSettings!.Destination!.replace(`s3://${BUCKET}/`, `${CDN}/`).replace(/hls\/master$/, '');
    expect(asset).toEqual({
      assetId: 'job-1',
      status: 'READY',
      hlsUrl: `${folder}hls/master.m3u8`,
      posterUrl: `${folder}poster/lesson_poster.0000001.jpg`,
      lowMp4Url: `${folder}mp4/lesson_low.mp4`,
      durationSec: 612,
      renditions: [240, 360, 720, 1080],
      error: null,
    });
  });

  test('polling: running jobs have no URLs; ERROR keeps its message; a missing job is TRANSCODE_ASSET_NOT_FOUND', async () => {
    const toCdn = () => 'x';
    expect(assetFromJob({ ...completedJob(), Status: 'PROGRESSING', OutputGroupDetails: undefined }, toCdn)).toMatchObject({ status: 'PROCESSING', hlsUrl: null, lowMp4Url: null, renditions: [] });
    expect(assetFromJob({ ...completedJob(), Status: 'ERROR', ErrorMessage: 'Unsupported codec' }, toCdn)).toMatchObject({ status: 'FAILED', hlsUrl: null, error: 'Unsupported codec' });
    // A short video takes the first frame as its poster.
    expect(assetFromJob(completedJob({ OutputGroupDetails: [{ OutputDetails: [{ DurationInMs: 3_000 }] }] }), (s, suffix) => `${s}${suffix}`).posterUrl).toEndWith('lesson_poster.0000000.jpg');
    const gone = mediaconvert({ mediaConvert: stubClient(() => Promise.reject(Object.assign(new Error('nope'), { name: 'NotFoundException' }))).client });
    await expect(gone.getAsset('job-x')).rejects.toMatchObject({ code: 'TRANSCODE_ASSET_NOT_FOUND' });
  });

  test('reads playlists from the bucket, under the streams prefix only', async () => {
    const { client, sent } = stubClient(() => ({ Body: { transformToString: async () => '#EXTM3U' } }));
    const t = mediaconvert({ s3: client });
    expect(await t.readPlaylist(`${CDN}/streams/l1/abc/hls/master.m3u8`)).toBe('#EXTM3U');
    expect((sent[0] as GetObjectCommand).input).toEqual({ Bucket: BUCKET, Key: 'streams/l1/abc/hls/master.m3u8' });
    expect(await t.readPlaylist(`${CDN}/course-videos/a.m3u8`)).toBeNull();
    expect(await t.readPlaylist(`${CDN}/streams/../secret.m3u8`)).toBeNull();
    expect(await t.readPlaylist(`${CDN}/streams/l1/abc/hls/master_240p_00001.ts`)).toBeNull();
    expect(sent).toHaveLength(1);
  });

  test('the disabled transcoder refuses work', async () => {
    const t = new DisabledVideoTranscoder();
    expect(t.enabled).toBe(false);
    await expect(t.createAsset()).rejects.toMatchObject({ code: 'TRANSCODER_DISABLED' });
    await expect(t.parseWebhook()).rejects.toMatchObject({ code: 'TRANSCODER_DISABLED' });
  });
});

// ---------- Completion webhook: EventBridge → SNS → HTTPS ----------

const snsKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const CERT_URL = 'https://sns.me-central-1.amazonaws.com/SimpleNotificationService-abc.pem';

function snsBody(fields: Partial<SnsMessage>, opts: { key?: typeof snsKeys.privateKey } = {}) {
  const m = {
    Type: 'Notification',
    MessageId: 'm-1',
    TopicArn: TOPIC,
    Message: JSON.stringify({ source: 'aws.mediaconvert', 'detail-type': 'MediaConvert Job State Change', detail: { status: 'COMPLETE', jobId: 'job-1' } }),
    Timestamp: '2026-11-17T10:00:00.000Z',
    SignatureVersion: '2',
    SigningCertURL: CERT_URL,
    Signature: '',
    ...fields,
  } as SnsMessage;
  const algo = m.SignatureVersion === '1' ? 'RSA-SHA1' : 'RSA-SHA256';
  if (!fields.Signature) m.Signature = createSign(algo).update(snsStringToSign(m)).sign(opts.key ?? snsKeys.privateKey, 'base64');
  return JSON.stringify(m);
}

function snsFetch() {
  const urls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url === CERT_URL) return new Response(snsKeys.publicKey.export({ type: 'spki', format: 'pem' }) as string);
    if (url.startsWith('https://sns.me-central-1.amazonaws.com/?Action=ConfirmSubscription')) return new Response('<ok/>');
    return new Response('no', { status: 404 });
  }) as typeof fetch;
  return { impl, urls };
}

describe('MediaConvertTranscoder: SNS webhook', () => {
  const hook = () => {
    const f = snsFetch();
    return { t: mediaconvert({ snsTopicArn: TOPIC, fetch: f.impl }), urls: f.urls };
  };

  test('a signed notification from our topic names the job (SignatureVersion 1 and 2); the certificate is cached', async () => {
    const { t, urls } = hook();
    expect(await t.parseWebhook(snsBody({}))).toEqual({ assetId: 'job-1' });
    expect(await t.parseWebhook(snsBody({ SignatureVersion: '1', MessageId: 'm-2' }))).toEqual({ assetId: 'job-1' });
    expect(await t.parseWebhook(snsBody({ Subject: 'hi', MessageId: 'm-3' }))).toEqual({ assetId: 'job-1' });
    expect(urls.filter((u) => u === CERT_URL)).toHaveLength(1);
  });

  test('wrong signatures, other topics and certificates off SNS hosts are refused with 401', async () => {
    const { t } = hook();
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await expect(t.parseWebhook(snsBody({}, { key: other.privateKey }))).rejects.toMatchObject({ status: 401 });
    const tampered = JSON.parse(snsBody({})) as SnsMessage;
    tampered.Message = JSON.stringify({ source: 'aws.mediaconvert', detail: { jobId: 'job-evil' } });
    await expect(t.parseWebhook(JSON.stringify(tampered))).rejects.toMatchObject({ status: 401 });
    await expect(t.parseWebhook(snsBody({ TopicArn: 'arn:aws:sns:me-central-1:999999999999:theirs' }))).rejects.toMatchObject({ status: 401 });
    await expect(t.parseWebhook(snsBody({ SigningCertURL: 'https://evil.test/sns.amazonaws.com.pem' }))).rejects.toMatchObject({ status: 401 });
    await expect(t.parseWebhook('not json')).rejects.toMatchObject({ status: 400 });
    // No topic configured: webhooks are refused (polling still works).
    await expect(mediaconvert().parseWebhook(snsBody({}))).rejects.toMatchObject({ status: 401 });
  });

  test('a verified SubscriptionConfirmation is confirmed by visiting its SubscribeURL', async () => {
    const { t, urls } = hook();
    const subscribe = `https://sns.me-central-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=${TOPIC}&Token=tok`;
    const info = console.info;
    console.info = () => undefined;
    expect(await t.parseWebhook(snsBody({ Type: 'SubscriptionConfirmation', Token: 'tok', SubscribeURL: subscribe, Message: 'You have chosen to subscribe' }))).toBeNull();
    console.info = info;
    expect(urls).toContain(subscribe);
  });

  test('other EventBridge sources are ignored', async () => {
    const { t } = hook();
    expect(await t.parseWebhook(snsBody({ Message: JSON.stringify({ source: 'aws.s3', detail: { jobId: 'x' } }) }))).toBeNull();
  });
});

// ---------- CloudFront signed URLs ----------

const cfKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const cfPem = cfKeys.privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
const cf = () => new CloudFrontUrlSigner({ baseUrl: CDN, keyPairId: 'KTESTKEY', privateKey: cfPem });
const fromCf = (v: string) => Buffer.from(v.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/'), 'base64');

describe('CloudFrontUrlSigner', () => {
  const exp = new Date('2026-11-17T16:00:00Z');

  test('one file: a canned-policy URL that expires', () => {
    const u = new URL(cf().signUrl(`${CDN}/streams/l1/abc/mp4/lesson_low.mp4`, exp));
    expect(u.pathname).toBe('/streams/l1/abc/mp4/lesson_low.mp4');
    expect(u.searchParams.get('Expires')).toBe(String(exp.getTime() / 1000));
    expect(u.searchParams.get('Key-Pair-Id')).toBe('KTESTKEY');
    expect(u.searchParams.get('Signature')).toBeTruthy();
    // Other origins and already-signed URLs are left alone.
    expect(cf().signUrl('https://youtu.be/x', exp)).toBe('https://youtu.be/x');
    expect(cf().covers(u.toString())).toBe(false);
  });

  test('a folder: a custom policy whose wildcard resource covers the stream folder, signed with the key', () => {
    const q = new URLSearchParams(cf().prefixQuery(`${CDN}/streams/l1/abc/hls/`, exp));
    expect(q.get('Key-Pair-Id')).toBe('KTESTKEY');
    expect(q.get('Expires')).toBeNull();
    const policy = decodeCloudFrontPolicy(q.get('Policy')!);
    expect(policy).toEqual({ Statement: [{ Resource: `${CDN}/streams/l1/abc/hls/*`, Condition: { DateLessThan: { 'AWS:EpochTime': exp.getTime() / 1000 } } }] });
    const ok = createVerify('RSA-SHA1').update(fromCf(q.get('Policy')!)).verify(cfKeys.publicKey, fromCf(q.get('Signature')!));
    expect(ok).toBe(true);
  });

  test('without a key URLs are untouched', () => {
    const s = new UnsignedUrls();
    expect(s.enabled).toBe(false);
    expect(s.signUrl(VIDEO)).toBe(VIDEO);
  });
});

describe('rewritePlaylist', () => {
  const opts = { playlistCdnUrl: `${CDN}/streams/l1/abc/hls/master.m3u8`, segmentQuery: 'Policy=p&Signature=s&Key-Pair-Id=k', playlistUrl: (n: string) => `https://api.test/api/v1/lesson-streams/T/${n}` };

  test('master: renditions go back through the API', () => {
    const master = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240\nmaster_240p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2500000\nmaster_720p.m3u8\n';
    expect(rewritePlaylist(master, opts).split('\n')).toEqual([
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240',
      'https://api.test/api/v1/lesson-streams/T/master_240p.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=2500000',
      'https://api.test/api/v1/lesson-streams/T/master_720p.m3u8',
      '',
    ]);
  });

  test('media: segments and URI attributes point at the CDN with the signature; foreign URIs are dropped', () => {
    const media = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:6,\nmaster_240p_00001.ts\n#EXTINF:6,\n../../../other/x.ts\n#EXT-X-ENDLIST';
    expect(rewritePlaylist(media, { ...opts, playlistCdnUrl: `${CDN}/streams/l1/abc/hls/master_240p.m3u8` }).split('\n')).toEqual([
      '#EXTM3U',
      `#EXT-X-MAP:URI="${CDN}/streams/l1/abc/hls/init.mp4?Policy=p&Signature=s&Key-Pair-Id=k"`,
      '#EXTINF:6,',
      `${CDN}/streams/l1/abc/hls/master_240p_00001.ts?Policy=p&Signature=s&Key-Pair-Id=k`,
      '#EXTINF:6,',
      '#EXT-X-ENDLIST',
    ]);
  });
});

describe('config', () => {
  const base = { DATABASE_URL: 'postgresql://x@localhost/x', BETTER_AUTH_SECRET: 'x'.repeat(32) };

  test('MediaConvert needs a role ARN and S3 storage; production also needs the SNS topic', () => {
    expect(mediaConvertConfigured({ MEDIACONVERT_ROLE_ARN: 'arn', S3_BUCKET: 'b', CLOUDFRONT_URL: CDN })).toBe(true);
    expect(mediaConvertConfigured({ MEDIACONVERT_ROLE_ARN: 'arn', S3_BUCKET: undefined, CLOUDFRONT_URL: undefined })).toBe(false);
    const prod = { ...base, NODE_ENV: 'production', S3_BUCKET: 'b', CLOUDFRONT_URL: CDN, MEDIACONVERT_ROLE_ARN: 'arn:aws:iam::1:role/mc' };
    expect(() => loadConfig(prod)).toThrow(/MEDIACONVERT_SNS_TOPIC_ARN/);
  });

  test('CloudFront signing reads the key from a path or an escaped PEM, and stays off without one', () => {
    const warn = console.warn;
    console.warn = () => undefined;
    const env = { CLOUDFRONT_URL: CDN, CLOUDFRONT_KEY_PAIR_ID: 'K1', CLOUDFRONT_PRIVATE_KEY: undefined, CLOUDFRONT_PRIVATE_KEY_PATH: undefined };
    expect(resolveCloudFrontSigning({ ...env, CLOUDFRONT_PRIVATE_KEY: cfPem.replace(/\n/g, '\\n') })).toEqual({ baseUrl: CDN, keyPairId: 'K1', privateKey: cfPem });
    expect(resolveCloudFrontSigning({ ...env, CLOUDFRONT_PRIVATE_KEY_PATH: '/keys/cf.pem' }, () => cfPem)?.privateKey).toBe(cfPem);
    expect(resolveCloudFrontSigning(env)).toBeNull();
    expect(resolveCloudFrontSigning({ ...env, CLOUDFRONT_KEY_PAIR_ID: undefined, CLOUDFRONT_PRIVATE_KEY: cfPem })).toBeNull();
    console.warn = warn;
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

const STREAM = `${CDN}/streams/l1/abc`;

class FakeTranscoder implements VideoTranscoder {
  readonly provider = 'mediaconvert';
  readonly enabled = true;
  created: Array<{ sourceUrl: string; title: string; lessonId?: string }> = [];
  assets = new Map<string, TranscodeAsset>();
  playlists = new Map<string, string>();
  async createAsset(input: { sourceUrl: string; title: string; lessonId?: string }) {
    this.created.push(input);
    const assetId = `job-${this.created.length}`;
    this.assets.set(assetId, { assetId, status: 'PROCESSING', hlsUrl: null, posterUrl: null, lowMp4Url: null, durationSec: null, renditions: [] });
    return { assetId };
  }
  finish(assetId: string) {
    this.assets.set(assetId, {
      assetId,
      status: 'READY',
      hlsUrl: `${STREAM}/hls/master.m3u8`,
      posterUrl: `${STREAM}/poster/lesson_poster.0000001.jpg`,
      lowMp4Url: `${STREAM}/mp4/lesson_low.mp4`,
      durationSec: 300,
      renditions: [240, 720],
    });
  }
  fail(assetId: string, error: string) {
    this.assets.set(assetId, { assetId, status: 'FAILED', hlsUrl: null, posterUrl: null, lowMp4Url: null, durationSec: null, renditions: [], error });
  }
  async getAsset(id: string) {
    const a = this.assets.get(id);
    if (!a) throw new AppError('gone', 404, 'TRANSCODE_ASSET_NOT_FOUND');
    return a;
  }
  async parseWebhook(raw: string) {
    const body = JSON.parse(raw) as { jobId?: string; bad?: boolean };
    if (body.bad) throw new AppError('Bad webhook signature', 401, 'WEBHOOK_SIGNATURE');
    return body.jobId ? { assetId: body.jobId } : null;
  }
  async readPlaylist(url: string) {
    return this.playlists.get(url) ?? null;
  }
}

/** Marks signed URLs readably: `?sig=<epoch>` for one file, `prefix=<folder>&exp=<epoch>` for a folder. */
class FakeSigner implements MediaUrlSigner {
  readonly enabled = true;
  covers(url: string) {
    return url.startsWith(`${CDN}/`) && !url.includes('?');
  }
  signUrl(url: string, exp: Date) {
    return this.covers(url) ? `${url}?sig=${exp.getTime() / 1000}` : url;
  }
  prefixQuery(prefix: string, exp: Date) {
    return `prefix=${encodeURIComponent(prefix)}&exp=${exp.getTime() / 1000}`;
  }
}

const NOW = new Date('2026-11-17T10:00:00Z');
const student = { id: 'u1', role: 'STUDENT' as const };

function setup(opts: { access?: Record<string, { allowed: boolean; accessUntil?: Date | null; error?: Error }>; transcoder?: VideoTranscoder; now?: () => Date; signer?: MediaUrlSigner } = {}) {
  const repo = new MemoryStreams();
  const transcoder = opts.transcoder ?? new FakeTranscoder();
  const clock = { now: opts.now ?? (() => NOW) };
  const signer = new DownloadLinkSigner('x'.repeat(32));
  const playlistLinks = new DownloadLinkSigner('x'.repeat(32), 'azza:lesson-streams:v1');
  const access = opts.access ?? {};
  const lessons = {
    readAccess: async (lessonId: string) => {
      const rule = access[lessonId] ?? { allowed: true };
      if (!rule.allowed) throw rule.error ?? new ForbiddenError('no');
      return { lessonId, courseId: 'c1', videoUrl: repo.rows.get(lessonId)?.videoUrl ?? null, accessUntil: rule.accessUntil ?? null };
    },
  };
  const service = new LessonStreamingService(repo, transcoder, lessons, signer, clock, { apiUrl: 'https://api.azza.test', offlineMaxDays: 30 }, {
    signer: opts.signer ?? new UnsignedUrls(),
    playlistLinks,
  });
  return { repo, transcoder: transcoder as FakeTranscoder, service, signer, playlistLinks };
}

const READY = { streamStatus: 'READY' as const, streamSourceUrl: VIDEO, streamProvider: 'mediaconvert', hlsUrl: `${STREAM}/hls/master.m3u8`, posterUrl: `${STREAM}/poster/lesson_poster.0000001.jpg`, lowMp4Url: `${STREAM}/mp4/lesson_low.mp4`, durationSec: 300 };

describe('LessonStreamingService: transcoding', () => {
  test('saving an uploaded video submits a job named after the lesson; YouTube links and a disabled transcoder do not', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    expect(await service.onVideoChanged('l1', VIDEO)).toEqual({ started: true });
    expect(transcoder.created[0]).toMatchObject({ sourceUrl: VIDEO, lessonId: 'l1' });
    expect(transcoder.created[0]!.title).toStartWith('azza-lesson-l1-');
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'PROCESSING', streamAssetId: 'job-1', streamSourceUrl: VIDEO, streamProvider: 'mediaconvert' });

    repo.add('l2', 'https://youtu.be/dQw4w9WgXcQ');
    expect(await service.onVideoChanged('l2', 'https://youtu.be/dQw4w9WgXcQ')).toEqual({ started: false });

    const off = setup({ transcoder: new DisabledVideoTranscoder() });
    off.repo.add('l1', VIDEO, { streamStatus: 'READY', streamSourceUrl: 'old', hlsUrl: 'old' });
    expect(await off.service.onVideoChanged('l1', VIDEO)).toEqual({ started: false });
    expect(off.repo.rows.get('l1')).toMatchObject({ streamStatus: null, hlsUrl: null });
  });

  test('the webhook re-reads the job and stores the playback URLs; bad signatures propagate', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    await service.prepare('l1');
    transcoder.finish('job-1');
    expect(await service.handleWebhook(JSON.stringify({ jobId: 'job-1' }), () => undefined)).toEqual({ handled: true, lessons: 1 });
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'READY', hlsUrl: `${STREAM}/hls/master.m3u8`, lowMp4Url: `${STREAM}/mp4/lesson_low.mp4`, durationSec: 300 });
    expect(await service.handleWebhook(JSON.stringify({ jobId: 'unknown' }), () => undefined)).toEqual({ handled: false, lessons: 0 });
    expect(await service.handleWebhook(JSON.stringify({}), () => undefined)).toEqual({ handled: false });
    await expect(service.handleWebhook(JSON.stringify({ bad: true }), () => undefined)).rejects.toMatchObject({ status: 401 });
  });

  test('a failed job stores its error message', async () => {
    const { repo, transcoder, service } = setup();
    repo.add('l1', VIDEO);
    await service.prepare('l1');
    transcoder.fail('job-1', 'Unsupported codec');
    await service.handleWebhook(JSON.stringify({ jobId: 'job-1' }), () => undefined);
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'FAILED', streamError: 'Unsupported codec', hlsUrl: null });
    // "Prepare for streaming" again submits a new job.
    await service.prepare('l1');
    expect(transcoder.created).toHaveLength(2);
    expect(repo.rows.get('l1')).toMatchObject({ streamStatus: 'PROCESSING', streamAssetId: 'job-2', streamError: null });
  });

  test('the job polls processing jobs older than two minutes and gives up after a day', async () => {
    let now = NOW;
    const { repo, transcoder, service } = setup({ now: () => now });
    repo.add('l1', VIDEO);
    repo.add('l2', VIDEO);
    await service.prepare('l1');
    await service.prepare('l2');
    expect(await service.syncProcessing()).toEqual({ checked: 0, ready: 0 }); // too fresh
    now = new Date(NOW.getTime() + 5 * 60_000);
    transcoder.finish('job-1');
    expect(await service.syncProcessing()).toEqual({ checked: 2, ready: 1 });
    expect(repo.rows.get('l1')!.streamStatus).toBe('READY');
    expect(repo.rows.get('l2')!.streamUpdatedAt).toEqual(NOW);
    now = new Date(NOW.getTime() + 25 * 3_600_000);
    await service.syncProcessing();
    expect(repo.rows.get('l2')).toMatchObject({ streamStatus: 'FAILED', streamError: 'Encoding took longer than a day' });
  });

  test('a job missing at MediaConvert fails the stream', async () => {
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
  const exp = NOW.getTime() / 1000 + 6 * 3600;

  test('unsigned CDN: the stored URLs come back as they are; stale and missing streams fall back to the MP4', async () => {
    const { repo, service } = setup();
    repo.add('l1', VIDEO, READY);
    expect(await service.playback('l1', 'u1')).toEqual({
      downloadable: true,
      stream: { status: 'READY', hlsUrl: READY.hlsUrl, posterUrl: READY.posterUrl, lowMp4Url: READY.lowMp4Url, durationSec: 300 },
    });
    repo.add('l2', VIDEO, { ...READY, streamSourceUrl: `${CDN}/course-videos/old.mp4` });
    expect(await service.playback('l2')).toEqual({ stream: null, downloadable: true });
    repo.add('l3', VIDEO, { streamStatus: 'PROCESSING', streamSourceUrl: VIDEO });
    expect((await service.playback('l3')).stream).toMatchObject({ status: 'PROCESSING', hlsUrl: null });
    repo.add('yt', 'https://youtu.be/dQw4w9WgXcQ');
    expect(await service.playback('yt')).toEqual({ stream: null, downloadable: false });
  });

  test('signed CDN: HLS goes through the API playlist route; poster, low MP4 and the original are signed for six hours', async () => {
    const { repo, service, playlistLinks } = setup({ signer: new FakeSigner() });
    repo.add('l1', VIDEO, READY);
    const p = await service.playback('l1', 'u1');
    expect(p.videoUrl).toBe(`${VIDEO}?sig=${exp}`);
    expect(p.stream).toMatchObject({ posterUrl: `${READY.posterUrl}?sig=${exp}`, lowMp4Url: `${READY.lowMp4Url}?sig=${exp}`, durationSec: 300 });
    const m = /^https:\/\/api\.azza\.test\/api\/v1\/lesson-streams\/([\w-]+\.[\w-]+)\/master\.m3u8$/.exec(p.stream!.hlsUrl!);
    expect(m).not.toBeNull();
    expect(playlistLinks.verify(m![1]!, NOW)).toEqual({ lessonId: 'l1', userId: 'u1', exp });

    // No stream yet: the original alone is signed. YouTube links never are.
    repo.add('l2', VIDEO);
    expect(await service.playback('l2')).toEqual({ stream: null, downloadable: true, videoUrl: `${VIDEO}?sig=${exp}` });
    repo.add('yt', 'https://youtu.be/dQw4w9WgXcQ');
    expect(await service.playback('yt')).toEqual({ stream: null, downloadable: false });
  });

  test('the playlist route rewrites the master and rendition playlists with segment signatures that expire with the token', async () => {
    let now = NOW;
    const { repo, service, transcoder } = setup({ signer: new FakeSigner(), now: () => now });
    repo.add('l1', VIDEO, READY);
    transcoder.playlists.set(`${STREAM}/hls/master.m3u8`, '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=400000\nmaster_240p.m3u8');
    transcoder.playlists.set(`${STREAM}/hls/master_240p.m3u8`, '#EXTM3U\n#EXTINF:6,\nmaster_240p_00001.ts\n#EXT-X-ENDLIST');
    const hlsUrl = (await service.playback('l1', 'u1')).stream!.hlsUrl!;
    const token = hlsUrl.split('/').at(-2)!;

    const master = await service.playlist(token, 'master.m3u8');
    expect(master).toContain(`https://api.azza.test/api/v1/lesson-streams/${token}/master_240p.m3u8`);
    const media = await service.playlist(token, 'master_240p.m3u8');
    expect(media).toContain(`${STREAM}/hls/master_240p_00001.ts?prefix=${encodeURIComponent(`${STREAM}/hls/`)}&exp=${exp}`);

    await expect(service.playlist(token, '../secret.m3u8')).rejects.toMatchObject({ status: 404 });
    await expect(service.playlist(token, 'missing.m3u8')).rejects.toMatchObject({ status: 404 });
    // A download token is not a playlist token, and tokens expire.
    const { signer } = setup();
    await expect(service.playlist(signer.sign({ lessonId: 'l1', userId: 'u1', exp: exp }), 'master.m3u8')).rejects.toMatchObject({ code: 'PLAYBACK_LINK_INVALID' });
    now = new Date(NOW.getTime() + 7 * 3600_000);
    await expect(service.playlist(token, 'master.m3u8')).rejects.toMatchObject({ code: 'PLAYBACK_LINK_INVALID' });
  });

  test('a re-upload makes old playlist links stop working', async () => {
    const { repo, service, transcoder } = setup({ signer: new FakeSigner() });
    repo.add('l1', VIDEO, READY);
    transcoder.playlists.set(`${STREAM}/hls/master.m3u8`, '#EXTM3U');
    const token = (await service.playback('l1')).stream!.hlsUrl!.split('/').at(-2)!;
    await repo.save('l1', { streamSourceUrl: `${CDN}/course-videos/new.mp4` });
    await expect(service.playlist(token, 'master.m3u8')).rejects.toMatchObject({ status: 404 });
  });
});

describe('LessonStreamingService: downloads', () => {
  test('a reader gets a 15-minute signed link to the low MP4 when the stream is ready', async () => {
    const until = new Date('2026-11-30T00:00:00Z');
    const { repo, service } = setup({ access: { l1: { allowed: true, accessUntil: until } }, signer: new FakeSigner() });
    repo.add('l1', VIDEO, READY);
    const d = await service.issueDownload('l1', student);
    expect(d).toMatchObject({ lessonId: 'l1', quality: 'low', accessUntil: until, offlineUntil: until, durationSec: 300 });
    expect(d.expiresAt).toEqual(new Date(NOW.getTime() + 15 * 60_000));
    expect(d.url).toBe(`${READY.lowMp4Url}?sig=${d.expiresAt.getTime() / 1000}`);
  });

  test('without a stream the link is an API token for the upload; it redeems to a signed URL until it expires', async () => {
    let now = NOW;
    const { repo, service } = setup({ now: () => now, signer: new FakeSigner() });
    repo.add('l1', VIDEO);
    const d = await service.issueDownload('l1', student);
    expect(d.quality).toBe('original');
    expect(d.offlineUntil).toEqual(new Date(NOW.getTime() + 30 * 86_400_000));
    expect(d.url).toStartWith('https://api.azza.test/api/v1/lesson-downloads/');
    const token = d.url.split('/').pop()!;
    expect(await service.redeemDownload(token)).toEqual({ url: `${VIDEO}?sig=${NOW.getTime() / 1000 + 15 * 60}` });
    await expect(service.redeemDownload(`${token}x`)).rejects.toMatchObject({ code: 'DOWNLOAD_LINK_INVALID' });
    now = new Date(NOW.getTime() + 16 * 60_000);
    await expect(service.redeemDownload(token)).rejects.toMatchObject({ code: 'DOWNLOAD_LINK_INVALID' });
  });

  test('unsigned CDN: the redeemed URL is the upload itself', async () => {
    const { repo, service } = setup();
    repo.add('l1', VIDEO);
    const token = (await service.issueDownload('l1', student)).url.split('/').pop()!;
    expect(await service.redeemDownload(token)).toEqual({ url: VIDEO });
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
  test('rejects tampered payloads, other secrets and other purposes', () => {
    const a = new DownloadLinkSigner('a'.repeat(32));
    const b = new DownloadLinkSigner('b'.repeat(32));
    const streams = new DownloadLinkSigner('a'.repeat(32), 'azza:lesson-streams:v1');
    const token = a.sign({ lessonId: 'l1', userId: 'u1', exp: Math.floor(NOW.getTime() / 1000) + 60 });
    expect(a.verify(token, NOW)).toEqual({ lessonId: 'l1', userId: 'u1', exp: Math.floor(NOW.getTime() / 1000) + 60 });
    expect(b.verify(token, NOW)).toBeNull();
    expect(streams.verify(token, NOW)).toBeNull();
    const [, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ l: 'l2', u: 'u1', e: 9e9 })).toString('base64url')}.${sig}`;
    expect(a.verify(forged, NOW)).toBeNull();
  });
});
