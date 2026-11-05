/**
 * Course media URLs — shared by the API (validation) and the clients (players).
 *
 * Uploaded files come back from the API's FileStorage as `<base>/<folder>/<32 hex>.<ext>`:
 * - S3 + CloudFront: `https://<cdn>/course-covers/<hex>.jpg`
 * - local disk (dev): `http://localhost:4000/uploads/course-covers/<hex>.jpg` (or the `/uploads/...` path alone)
 */
export const COURSE_COVER_EXTENSIONS = ['jpg', 'png', 'webp'] as const;
export const COURSE_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;

const storedFile = (folder: string, exts: readonly string[]) =>
  new RegExp(`^(https?://[a-z0-9.-]+(:\\d{1,5})?)?/uploads/${folder}/[a-f0-9]{32}\\.(${exts.join('|')})$`, 'i');

const STORED_COVER = storedFile('course-covers', COURSE_COVER_EXTENSIONS);
const STORED_VIDEO = storedFile('course-videos', COURSE_VIDEO_EXTENSIONS);
const BUNDLED_COVER = /^\/media\/[a-z0-9/_-]+\.(jpg|png|webp)$/;

function httpsUrl(v: string): URL | null {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password ? u : null;
  } catch {
    return null;
  }
}

/** Cover photo: bundled art under `/media/`, a file our storage returned, or any https URL. */
export function isCourseCoverUrl(v: string): boolean {
  return BUNDLED_COVER.test(v) || STORED_COVER.test(v) || httpsUrl(v) !== null;
}

export type CourseVideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; url: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Classifies an intro video URL, or `null` when we can't play it. Accepted: files our storage returned,
 * YouTube / Vimeo links (played through youtube-nocookie.com / player.vimeo.com), and https links to an
 * .mp4 / .mov / .webm file.
 */
export function parseCourseVideoUrl(v: string | null | undefined): CourseVideoSource | null {
  if (!v) return null;
  if (STORED_VIDEO.test(v)) return { kind: 'file', url: v };
  const u = httpsUrl(v);
  if (!u) return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1).split('/')[0]
        : u.pathname === '/watch'
          ? u.searchParams.get('v')
          : /^\/(embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[2];
    return id && YOUTUBE_ID.test(id) ? { kind: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /^\/(?:video\/)?(\d{5,12})(?:\/|$)/.exec(u.pathname)?.[1];
    return id ? { kind: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}?dnt=1` } : null;
  }
  const ext = /\.([a-z0-9]{2,5})$/i.exec(u.pathname)?.[1]?.toLowerCase();
  return ext && (COURSE_VIDEO_EXTENSIONS as readonly string[]).includes(ext) ? { kind: 'file', url: v } : null;
}
