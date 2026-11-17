import {
  CreateJobCommand,
  GetJobCommand,
  MediaConvertClient,
  type AudioDescription,
  type CreateJobCommandOutput,
  type GetJobCommandOutput,
  type Job,
  type JobSettings,
  type VideoDescription,
} from '@aws-sdk/client-mediaconvert';
import { GetObjectCommand, S3Client, type GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { AppError } from '../../core/errors';
import type { TranscodeAsset, TranscodeStatus, VideoTranscoder } from '../../core/ports';
import { SnsVerifier } from './sns-message';

/**
 * AWS Elemental MediaConvert — lesson videos already sit in our S3 bucket (uploads go there), so a job reads them in place
 * and writes the outputs next to them under `streams/<lessonId>/<nonce>/`, served by the same CloudFront distribution:
 * - `hls/master.m3u8` — adaptive HLS, 240p / 360p / 720p / 1080p H.264 (QVBR) with AAC audio in 6-second TS segments;
 * - `mp4/lesson_low.mp4` — 360p progressive MP4 (data saver, offline downloads);
 * - `poster/lesson_poster.000000N.jpg` — frames at 0 s and 5 s (the 5 s one is the poster when the video is long enough).
 * The job id is the asset id. Completion arrives through EventBridge → SNS → `POST /api/webhooks/mediaconvert` (verified
 * SNS signature, our topic only) and, as a fallback, the `sync-lesson-streams` job's `GetJob` polling.
 * Credentials come from the default AWS chain; MediaConvert itself writes to S3 with `roleArn` (an IAM role it assumes).
 */
export interface MediaConvertConfig {
  region: string;
  /** IAM role MediaConvert assumes to read the source and write outputs (s3:GetObject / s3:PutObject on the bucket). */
  roleArn: string;
  bucket: string;
  /** `CLOUDFRONT_URL`: uploads are `<cdnBaseUrl>/<key>`, outputs `<cdnBaseUrl>/<streamsPrefix>/…`. */
  cdnBaseUrl: string;
  /** Default `streams`. */
  streamsPrefix?: string;
  /** Optional custom endpoint (the SDK defaults to `https://mediaconvert.<region>.amazonaws.com`). */
  endpoint?: string;
  /** Optional queue ARN (default queue otherwise). */
  queueArn?: string;
  /** SNS topic the EventBridge rule publishes to; webhooks from any other topic are refused. Unset = webhooks refused (polling only). */
  snsTopicArn?: string;
  /** Test seams: stubbed SDK clients and fetch (SNS certificates, subscription confirmation). */
  mediaConvert?: SdkClient;
  s3?: SdkClient;
  fetch?: typeof fetch;
}

/** The slice of an AWS SDK v3 client we use (method syntax keeps the real clients assignable). */
export interface SdkClient {
  send(command: object): Promise<unknown>;
}

/** The ladder: height → max bitrate (QVBR caps). Width follows the source's aspect ratio. */
export const HLS_LADDER: ReadonlyArray<{ height: number; maxBitrate: number }> = [
  { height: 240, maxBitrate: 400_000 },
  { height: 360, maxBitrate: 800_000 },
  { height: 720, maxBitrate: 2_500_000 },
  { height: 1080, maxBitrate: 5_000_000 },
];
export const LOW_MP4 = { height: 360, maxBitrate: 600_000, audioBitrate: 64_000 } as const;
const POSTER_AT_SEC = 5;

const AUDIO = 'Audio Selector 1';

function h264(height: number, maxBitrate: number): VideoDescription {
  return {
    Height: height,
    ScalingBehavior: 'DEFAULT',
    Sharpness: 50,
    CodecSettings: {
      Codec: 'H_264',
      H264Settings: {
        RateControlMode: 'QVBR',
        QvbrSettings: { QvbrQualityLevel: 7 },
        MaxBitrate: maxBitrate,
        GopSize: 2,
        GopSizeUnits: 'SECONDS',
        NumberBFramesBetweenReferenceFrames: 2,
        CodecProfile: 'MAIN',
        CodecLevel: 'AUTO',
        SceneChangeDetect: 'TRANSITION_DETECTION',
      },
    },
  };
}

function aac(bitrate: number): AudioDescription {
  return { AudioSourceName: AUDIO, CodecSettings: { Codec: 'AAC', AacSettings: { Bitrate: bitrate, CodingMode: 'CODING_MODE_2_0', SampleRate: 48_000 } } };
}

/** Pure: the job settings for `s3://…` source → outputs under `destination` (an `s3://…/` folder ending in `/`). */
export function buildJobSettings(input: string, destination: string): JobSettings {
  return {
    TimecodeConfig: { Source: 'ZEROBASED' },
    Inputs: [{ FileInput: input, TimecodeSource: 'ZEROBASED', VideoSelector: {}, AudioSelectors: { [AUDIO]: { DefaultSelection: 'DEFAULT' } } }],
    OutputGroups: [
      {
        Name: 'HLS',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            Destination: `${destination}hls/master`,
            SegmentLength: 6,
            MinSegmentLength: 0,
            SegmentControl: 'SEGMENTED_FILES',
            DirectoryStructure: 'SINGLE_DIRECTORY',
            OutputSelection: 'MANIFESTS_AND_SEGMENTS',
            ManifestDurationFormat: 'INTEGER',
            CodecSpecification: 'RFC_4281',
            StreamInfResolution: 'INCLUDE',
            ClientCache: 'ENABLED',
          },
        },
        Outputs: HLS_LADDER.map(({ height, maxBitrate }) => ({
          NameModifier: `_${height}p`,
          ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
          VideoDescription: h264(height, maxBitrate),
          AudioDescriptions: [aac(height >= 720 ? 128_000 : 96_000)],
        })),
      },
      {
        Name: 'MP4',
        OutputGroupSettings: { Type: 'FILE_GROUP_SETTINGS', FileGroupSettings: { Destination: `${destination}mp4/lesson` } },
        Outputs: [
          {
            NameModifier: '_low',
            ContainerSettings: { Container: 'MP4', Mp4Settings: { MoovPlacement: 'PROGRESSIVE_DOWNLOAD' } },
            VideoDescription: h264(LOW_MP4.height, LOW_MP4.maxBitrate),
            AudioDescriptions: [aac(LOW_MP4.audioBitrate)],
          },
        ],
      },
      {
        Name: 'Poster',
        OutputGroupSettings: { Type: 'FILE_GROUP_SETTINGS', FileGroupSettings: { Destination: `${destination}poster/lesson` } },
        Outputs: [
          {
            NameModifier: '_poster',
            ContainerSettings: { Container: 'RAW' },
            VideoDescription: {
              Height: 720,
              CodecSettings: { Codec: 'FRAME_CAPTURE', FrameCaptureSettings: { FramerateNumerator: 1, FramerateDenominator: POSTER_AT_SEC, MaxCaptures: 2, Quality: 80 } },
            },
          },
        ],
      },
    ],
  };
}

/** MediaConvert job status → ours. */
export function mediaConvertStatus(status: string | undefined): TranscodeStatus {
  if (status === 'COMPLETE') return 'READY';
  if (status === 'ERROR' || status === 'CANCELED') return 'FAILED';
  return 'PROCESSING'; // SUBMITTED, PROGRESSING
}

export class MediaConvertTranscoder implements VideoTranscoder {
  readonly provider = 'mediaconvert';
  readonly enabled = true;
  private readonly mc: SdkClient;
  private readonly s3: SdkClient;
  private readonly cdn: string;
  private readonly prefix: string;
  private readonly sns: SnsVerifier | null;

  constructor(private readonly config: MediaConvertConfig) {
    this.mc = config.mediaConvert ?? new MediaConvertClient({ region: config.region, ...(config.endpoint && { endpoint: config.endpoint }) });
    this.s3 = config.s3 ?? new S3Client({ region: config.region });
    this.cdn = config.cdnBaseUrl.replace(/\/$/, '');
    this.prefix = (config.streamsPrefix ?? 'streams').replace(/^\/+|\/+$/g, '');
    this.sns = config.snsTopicArn ? new SnsVerifier(config.snsTopicArn, config.fetch ?? fetch) : null;
  }

  /** `s3://bucket/key` → `<cdn>/key`; null for anything outside our bucket. */
  private s3ToCdn(s3Url: string | undefined, suffix: string): string | null {
    const head = `s3://${this.config.bucket}/`;
    if (!s3Url?.startsWith(head)) return null;
    return `${this.cdn}/${s3Url.slice(head.length)}${suffix}`;
  }

  private async call<T>(command: object): Promise<T> {
    try {
      return (await this.mc.send(command)) as T;
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotFoundException') throw new AppError('Video job not found at MediaConvert', 404, 'TRANSCODE_ASSET_NOT_FOUND');
      console.error('[mediaconvert]', err);
      throw new AppError('The video service refused the request', 502, 'TRANSCODER_ERROR');
    }
  }

  async createAsset({ sourceUrl, title, lessonId }: { sourceUrl: string; title: string; lessonId?: string }) {
    const head = `${this.cdn}/`;
    const key = sourceUrl.startsWith(head) ? sourceUrl.slice(head.length) : null;
    if (!key || key.includes('?') || key.includes('..') || key.startsWith(`${this.prefix}/`)) {
      throw new AppError('Only videos uploaded to our storage can be prepared for streaming', 422, 'NOT_STREAMABLE');
    }
    const folder = (lessonId ?? title).replace(/[^\w-]/g, '').slice(0, 64) || 'lesson';
    const out = `${this.prefix}/${folder}/${randomBytes(6).toString('hex')}/`;
    const res = await this.call<CreateJobCommandOutput>(
      new CreateJobCommand({
        Role: this.config.roleArn,
        ...(this.config.queueArn && { Queue: this.config.queueArn }),
        Settings: buildJobSettings(`s3://${this.config.bucket}/${key}`, `s3://${this.config.bucket}/${out}`),
        UserMetadata: { app: 'azza', title, ...(lessonId && { lessonId }), output: out },
        StatusUpdateInterval: 'SECONDS_60',
      }),
    );
    if (!res.Job?.Id) throw new AppError('MediaConvert did not return the job', 502, 'TRANSCODER_ERROR');
    return { assetId: res.Job.Id };
  }

  async getAsset(assetId: string): Promise<TranscodeAsset> {
    const res = await this.call<GetJobCommandOutput>(new GetJobCommand({ Id: assetId }));
    if (!res.Job) throw new AppError('Video job not found at MediaConvert', 404, 'TRANSCODE_ASSET_NOT_FOUND');
    return assetFromJob(res.Job, (s3, suffix) => this.s3ToCdn(s3, suffix));
  }

  async parseWebhook(rawBody: string) {
    if (!this.sns) throw new AppError('MediaConvert webhooks are not configured', 401, 'WEBHOOK_SIGNATURE');
    const m = await this.sns.verify(rawBody);
    if (m.Type === 'SubscriptionConfirmation') {
      const ok = await this.sns.confirm(m);
      console.info(`[mediaconvert] SNS subscription to ${m.TopicArn} ${ok ? 'confirmed' : 'could not be confirmed'}`);
      return null;
    }
    if (m.Type !== 'Notification') return null;
    let event: { source?: string; detail?: { jobId?: string } };
    try {
      event = JSON.parse(m.Message);
    } catch {
      return null;
    }
    if (event.source !== 'aws.mediaconvert' || typeof event.detail?.jobId !== 'string') return null;
    return { assetId: event.detail.jobId };
  }

  async readPlaylist(url: string) {
    const head = `${this.cdn}/${this.prefix}/`;
    if (!url.startsWith(head) || !url.endsWith('.m3u8') || url.includes('?') || url.includes('..')) return null;
    const key = url.slice(this.cdn.length + 1);
    try {
      const res = (await this.s3.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }))) as GetObjectCommandOutput;
      return res.Body ? await res.Body.transformToString('utf-8') : null;
    } catch (err) {
      if ((err as { name?: string })?.name === 'NoSuchKey') return null;
      throw err;
    }
  }
}

/** Pure: a MediaConvert job → our asset. Output URLs are rebuilt from the job's destinations (`GetJob` lists no file paths). */
export function assetFromJob(job: Job, toCdn: (s3Url: string | undefined, suffix: string) => string | null): TranscodeAsset {
  const status = mediaConvertStatus(job.Status);
  const ready = status === 'READY';
  const groups = job.Settings?.OutputGroups ?? [];
  const hls = groups.find((g) => g.OutputGroupSettings?.Type === 'HLS_GROUP_SETTINGS');
  const files = groups.filter((g) => g.OutputGroupSettings?.Type === 'FILE_GROUP_SETTINGS');
  const mp4 = files.find((g) => g.Outputs?.some((o) => o.ContainerSettings?.Container === 'MP4'));
  const poster = files.find((g) => g.Outputs?.some((o) => o.VideoDescription?.CodecSettings?.Codec === 'FRAME_CAPTURE'));

  const details = job.OutputGroupDetails ?? [];
  const ms = details.flatMap((d) => d.OutputDetails ?? []).map((o) => o.DurationInMs ?? 0).find((n) => n > 0);
  const durationSec = ms ? Math.round(ms / 1000) : null;
  const hlsIndex = hls ? groups.indexOf(hls) : -1;
  const actual = (details[hlsIndex]?.OutputDetails ?? []).map((o) => o.VideoDetails?.HeightInPx ?? 0).filter((h) => h > 0);
  const planned = (hls?.Outputs ?? []).map((o) => o.VideoDescription?.Height ?? 0).filter((h) => h > 0);
  const renditions = ready ? [...new Set(actual.length ? actual : planned)].sort((a, b) => a - b) : [];

  const posterFrame = durationSec !== null && durationSec > POSTER_AT_SEC ? '0000001' : '0000000';
  const posterMod = poster?.Outputs?.[0]?.NameModifier ?? '';
  const mp4Mod = mp4?.Outputs?.find((o) => o.ContainerSettings?.Container === 'MP4')?.NameModifier ?? '';
  return {
    assetId: job.Id ?? '',
    status,
    hlsUrl: ready ? toCdn(hls?.OutputGroupSettings?.HlsGroupSettings?.Destination, '.m3u8') : null,
    posterUrl: ready ? toCdn(poster?.OutputGroupSettings?.FileGroupSettings?.Destination, `${posterMod}.${posterFrame}.jpg`) : null,
    lowMp4Url: ready ? toCdn(mp4?.OutputGroupSettings?.FileGroupSettings?.Destination, `${mp4Mod}.mp4`) : null,
    durationSec,
    renditions,
    error: status === 'FAILED' ? (job.ErrorMessage ?? (job.Status === 'CANCELED' ? 'The encoding job was cancelled' : 'Encoding failed at MediaConvert')) : null,
  };
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
  async parseWebhook(): Promise<{ assetId: string } | null> {
    return this.off();
  }
  async readPlaylist(): Promise<string | null> {
    return null;
  }
}
