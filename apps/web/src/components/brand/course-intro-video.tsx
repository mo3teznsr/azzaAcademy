'use client';

import { parseCourseVideoUrl } from '@azza/shared';
import { mediaUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * A course's intro video in a 16:9 frame. Uploaded files and direct links play in the native `<video>` player;
 * YouTube plays from youtube-nocookie.com and Vimeo with `dnt=1`, so neither sets tracking cookies before play.
 * Renders nothing for a URL we can't play.
 */
export function CourseIntroVideo({ url, title, className }: { url: string | null | undefined; title: string; className?: string }) {
  const source = parseCourseVideoUrl(url);
  if (!source) return null;
  const frame = cn('relative aspect-video w-full overflow-hidden rounded-2xl bg-muted', className);
  if (source.kind === 'file') {
    return (
      <div className={frame}>
        {/* Intro videos have no caption track; the course page carries the same content as text. */}
        <video src={mediaUrl(source.url)} controls playsInline preload="metadata" aria-label={title} className="absolute inset-0 size-full bg-black object-contain" />
      </div>
    );
  }
  return (
    <div className={frame}>
      <iframe
        src={source.embedUrl}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
