import type { LessonStreamPlayback } from '@azza/shared';

/** What the `<video>` should load: an HLS playlist through hls.js, an HLS playlist the browser plays itself (Safari), or a file. */
export type VideoSource = { kind: 'hls'; url: string } | { kind: 'native-hls'; url: string } | { kind: 'file'; url: string };

/**
 * Pure: pick the source for a lesson video.
 * - A ready stream plays as HLS (adaptive). With data saver, hls.js is capped to the lowest rendition; a browser that plays
 *   HLS natively can't be capped, so it gets the lowest MP4 rendition instead when there is one.
 * - No ready stream (never prepared, still encoding, failed): the uploaded file.
 */
export function pickVideoSource(input: {
  fileUrl: string;
  stream: LessonStreamPlayback | null | undefined;
  dataSaver: boolean;
  /** `video.canPlayType('application/vnd.apple.mpegurl')` is non-empty. */
  nativeHls: boolean;
  /** hls.js (Media Source Extensions) is available. */
  mse: boolean;
}): VideoSource {
  const { fileUrl, stream, dataSaver, nativeHls, mse } = input;
  const hls = stream?.status === 'READY' ? stream.hlsUrl : null;
  const low = stream?.status === 'READY' ? stream.lowMp4Url : null;
  if (!hls) return { kind: 'file', url: fileUrl };
  // hls.js first: it can switch and cap quality; Safari on macOS has both, iOS Safari only native.
  if (mse) return { kind: 'hls', url: hls };
  if (nativeHls) return dataSaver && low ? { kind: 'file', url: low } : { kind: 'native-hls', url: hls };
  return { kind: 'file', url: dataSaver && low ? low : fileUrl };
}

/** Pure: menu labels for hls.js levels — heights, highest first, deduplicated (`[{ index, height }]`). */
export function qualityOptions(levels: Array<{ height: number }>): Array<{ index: number; height: number }> {
  const seen = new Set<number>();
  return levels
    .map((l, index) => ({ index, height: l.height }))
    .filter((l) => l.height > 0 && !seen.has(l.height) && (seen.add(l.height), true))
    .sort((a, b) => b.height - a.height);
}

/** The lowest level index (data saver). */
export function lowestLevel(levels: Array<{ height: number }>): number {
  let best = 0;
  levels.forEach((l, i) => {
    if (l.height > 0 && l.height < (levels[best]?.height ?? Infinity)) best = i;
  });
  return best;
}
