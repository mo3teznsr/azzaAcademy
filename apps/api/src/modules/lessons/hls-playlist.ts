/**
 * Pure: rewrites an HLS playlist so it plays for one viewer behind CloudFront signed URLs.
 * Players resolve relative URIs against the playlist URL and drop its query string, so a signed playlist URL alone does not
 * open its segments. Here every URI is made absolute:
 * - nested playlists (`*.m3u8` in the same folder: the renditions of a master playlist) go back through the API
 *   (`playlistUrl(name)`), which rewrites them in turn;
 * - everything else (segments, init sections, subtitles, keys) points at the CDN with `segmentQuery` appended — a
 *   custom-policy signature whose wildcard resource covers the stream folder.
 * URIs that leave the playlist's folder are dropped (MediaConvert never writes them; anything else is not ours to sign).
 */
export function rewritePlaylist(
  text: string,
  opts: { playlistCdnUrl: string; segmentQuery: string; playlistUrl: (name: string) => string },
): string {
  const folder = opts.playlistCdnUrl.replace(/[^/]*$/, '');
  const rewrite = (uri: string): string | null => {
    let abs: URL;
    try {
      abs = new URL(uri, opts.playlistCdnUrl);
    } catch {
      return null;
    }
    abs.search = '';
    abs.hash = '';
    const href = abs.toString();
    if (!href.startsWith(folder)) return null;
    const rest = href.slice(folder.length);
    if (/^[\w.-]+\.m3u8$/.test(rest)) return opts.playlistUrl(rest);
    return opts.segmentQuery ? `${href}?${opts.segmentQuery}` : href;
  };
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      out.push(raw);
      continue;
    }
    if (line.startsWith('#')) {
      // Tags with a URI attribute: EXT-X-MAP, EXT-X-KEY, EXT-X-MEDIA, EXT-X-I-FRAME-STREAM-INF, …
      out.push(line.replace(/URI="([^"]*)"/g, (whole, uri: string) => {
        const next = rewrite(uri);
        return next ? `URI="${next}"` : whole;
      }));
      continue;
    }
    const next = rewrite(line);
    if (next) out.push(next);
  }
  return out.join('\n');
}

/** Name of a playlist file the API may serve (`master.m3u8`, `master_720p.m3u8`); null for anything else. */
export function playlistName(name: string): string | null {
  return /^[\w.-]{1,120}\.m3u8$/.test(name) && !name.startsWith('.') ? name : null;
}
