'use client';

import { useEffect, useRef } from 'react';
import { parseCourseVideoUrl } from '@azza/shared';
import { mediaUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/** Pick up where the viewer stopped: start at `startSec`, and report the position every 10 s, on pause and when leaving. */
export interface VideoResume {
  startSec: number;
  onSave: (sec: number) => void;
  /** Called when the page is being hidden or closed, so the save can outlive the page. */
  onExit: (sec: number) => void;
}

const SAVE_EVERY_MS = 10_000;

/**
 * A course's intro video in a 16:9 frame. Uploaded files and direct links play in the native `<video>` player;
 * YouTube plays from youtube-nocookie.com and Vimeo with `dnt=1`, so neither sets tracking cookies before play.
 * Renders nothing for a URL we can't play.
 */
export function CourseIntroVideo({ url, title, className, resume }: { url: string | null | undefined; title: string; className?: string; resume?: VideoResume }) {
  const source = parseCourseVideoUrl(url);
  if (!source) return null;
  const frame = cn('relative aspect-video w-full overflow-hidden rounded-2xl bg-muted', className);
  if (source.kind === 'file') {
    return (
      <div className={frame}>
        {/* Intro videos have no caption track; the course page carries the same content as text. */}
        {resume ? (
          <ResumableVideo src={mediaUrl(source.url)} title={title} resume={resume} />
        ) : (
          <video src={mediaUrl(source.url)} controls playsInline preload="metadata" aria-label={title} className="absolute inset-0 size-full bg-black object-contain" />
        )}
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

/** The native player with the saved position applied and kept up to date. (YouTube and Vimeo embeds don't expose their position, so they aren't tracked.) */
function ResumableVideo({ src, title, resume }: { src: string | undefined; title: string; resume: VideoResume }) {
  const ref = useRef<HTMLVideoElement>(null);
  const latest = useRef(resume);
  const lastSaved = useRef(Math.floor(resume.startSec));
  const ended = useRef(false);
  useEffect(() => {
    latest.current = resume;
  });

  /** Seek to the saved spot, unless the viewer has already started elsewhere. */
  const seek = () => {
    const v = ref.current;
    const at = latest.current.startSec;
    if (!v || at <= 0 || v.currentTime >= 1 || !Number.isFinite(v.duration)) return;
    if (at < v.duration - 3) v.currentTime = at;
  };

  useEffect(() => {
    const v = ref.current;
    if (v && v.readyState >= 1) seek();
  }, [resume.startSec]);

  useEffect(() => {
    const video = ref.current;
    const position = () => Math.floor(video?.currentTime ?? 0);
    const save = () => {
      if (ended.current) return;
      const sec = position();
      if (sec === lastSaved.current) return;
      lastSaved.current = sec;
      latest.current.onSave(sec);
    };
    const exit = () => {
      if (ended.current) return;
      const sec = position();
      if (sec === lastSaved.current) return;
      lastSaved.current = sec;
      latest.current.onExit(sec);
    };
    const timer = window.setInterval(() => {
      if (video && !video.paused) save();
    }, SAVE_EVERY_MS);
    const hidden = () => document.visibilityState === 'hidden' && exit();
    window.addEventListener('pagehide', exit);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', exit);
      document.removeEventListener('visibilitychange', hidden);
      // Moving to another lesson: keep the spot.
      if (video && video.currentTime > 0) save();
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label={title}
      className="absolute inset-0 size-full bg-black object-contain"
      onLoadedMetadata={seek}
      onPlay={() => {
        ended.current = false;
      }}
      onPause={() => {
        if (ended.current) return;
        const sec = Math.floor(ref.current?.currentTime ?? 0);
        if (sec !== lastSaved.current) {
          lastSaved.current = sec;
          latest.current.onSave(sec);
        }
      }}
      onEnded={() => {
        ended.current = true;
        // Finished: next time starts from the top.
        lastSaved.current = 0;
        latest.current.onSave(0);
      }}
    />
  );
}
