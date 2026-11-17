'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type HlsType from 'hls.js';
import { Settings2 } from 'lucide-react';
import { parseCourseVideoUrl, type LessonStreamPlayback } from '@azza/shared';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mediaUrl } from '@/lib/api/client';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { useDataSaver } from './data-saver';
import { lowestLevel, pickVideoSource, qualityOptions } from './stream-source';

/** What the player knows besides the position: the video's length, and whether it just played to the end. */
export interface VideoWatch {
  durationSec?: number;
  ended?: boolean;
}

/** Pick up where the viewer stopped: start at `startSec`, and report the position every 10 s, on pause and when leaving. */
export interface VideoResume {
  startSec: number;
  onSave: (sec: number, watch: VideoWatch) => void;
  /** Called when the page is being hidden or closed, so the save can outlive the page. */
  onExit: (sec: number, watch: VideoWatch) => void;
}

const SAVE_EVERY_MS = 10_000;
const VIDEO_CLASS = 'absolute inset-0 size-full bg-black object-contain';

/**
 * A course's intro video or a lesson video in a 16:9 frame. Uploaded files and direct links play in the native `<video>`
 * player; a lesson with a ready `stream` plays adaptive HLS (hls.js, or natively in Safari) with a quality menu and
 * data saver. YouTube plays from youtube-nocookie.com and Vimeo with `dnt=1`, so neither sets tracking cookies before play.
 * Renders nothing for a URL we can't play.
 */
export function CourseIntroVideo({
  url,
  title,
  className,
  resume,
  stream,
}: {
  url: string | null | undefined;
  title: string;
  className?: string;
  resume?: VideoResume;
  stream?: LessonStreamPlayback | null;
}) {
  const source = parseCourseVideoUrl(url);
  if (!source) return null;
  const frame = cn('relative aspect-video w-full overflow-hidden rounded-2xl bg-muted', className);
  if (source.kind === 'file') {
    const fileUrl = mediaUrl(source.url) ?? source.url;
    return (
      <div className={frame}>
        {/* Intro videos have no caption track; the course page carries the same content as text. */}
        {resume || stream?.status === 'READY' ? (
          <LessonVideo fileUrl={fileUrl} stream={stream} title={title} resume={resume} />
        ) : (
          <video src={fileUrl} controls playsInline preload="metadata" aria-label={title} className={VIDEO_CLASS} />
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

/** What this browser can play, read once on the client (null during SSR and hydration). */
type Caps = { nativeHls: boolean; mse: boolean };
let capsCache: Caps | null = null;
function readCaps(): Caps {
  if (!capsCache) {
    const probe = document.createElement('video');
    capsCache = {
      nativeHls: probe.canPlayType('application/vnd.apple.mpegurl') !== '',
      mse: 'MediaSource' in window || 'ManagedMediaSource' in window,
    };
  }
  return capsCache;
}
const noSubscribe = () => () => undefined;

/**
 * The native player for uploaded files and adaptive streams, with the saved position applied and kept up to date.
 * (YouTube and Vimeo embeds don't expose their position, so they aren't tracked.)
 */
function LessonVideo({ fileUrl, stream, title, resume }: { fileUrl: string; stream: LessonStreamPlayback | null | undefined; title: string; resume?: VideoResume }) {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const caps = useSyncExternalStore(noSubscribe, readCaps, () => null);
  const [dataSaver, setDataSaver] = useDataSaver();
  const source = caps ? pickVideoSource({ fileUrl, stream, dataSaver, ...caps }) : null;
  const hlsRef = useRef<HlsType | null>(null);
  const [levels, setLevels] = useState<Array<{ height: number }>>([]);
  const [level, setLevel] = useState(-1);
  /** Where to continue after the source changes (data saver on Safari swaps the playlist for the low MP4). */
  const carryOverRef = useRef<number | null>(null);
  const handlers = useResume(ref, resume, carryOverRef);

  // hls.js is loaded only for streams, and only in browsers without native HLS.
  const hlsUrl = source?.kind === 'hls' ? source.url : null;
  useEffect(() => {
    const video = ref.current;
    if (!video || !hlsUrl) return;
    let cancelled = false;
    let hls: HlsType | null = null;
    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        video.src = fileUrl;
        return;
      }
      const instance = new Hls({ capLevelToPlayerSize: true, startLevel: -1 });
      hls = instance;
      hlsRef.current = instance;
      instance.on(Hls.Events.MANIFEST_PARSED, () => setLevels(instance.levels.map((l) => ({ height: l.height }))));
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance.recoverMediaError();
        else {
          // Unrecoverable: keep the lesson watchable from the uploaded file.
          carryOverRef.current = video.currentTime;
          instance.destroy();
          hlsRef.current = null;
          video.src = fileUrl;
        }
      });
      instance.loadSource(hlsUrl);
      instance.attachMedia(video);
    });
    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, fileUrl]);

  // Data saver caps hls.js to the lowest rendition; otherwise the chosen quality (-1 = automatic).
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls || !levels.length) return;
    if (dataSaver) {
      const low = lowestLevel(levels);
      hls.autoLevelCapping = low;
      hls.nextLevel = low;
    } else {
      hls.autoLevelCapping = -1;
      hls.nextLevel = level;
    }
  }, [dataSaver, level, levels]);

  const fileSrc = source && source.kind !== 'hls' ? source.url : undefined;
  const sourceUrl = source?.url;
  const lastSrc = useRef(sourceUrl);
  useEffect(() => {
    // A new source restarts the element: continue from where the viewer was.
    if (lastSrc.current !== undefined && sourceUrl !== lastSrc.current && ref.current) carryOverRef.current = ref.current.currentTime;
    lastSrc.current = sourceUrl;
  }, [sourceUrl]);

  const options = qualityOptions(levels);
  const ready = stream?.status === 'READY';
  return (
    <>
      <video
        ref={ref}
        src={fileSrc}
        poster={stream?.posterUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        className={VIDEO_CLASS}
        {...handlers}
      />
      {ready && (
        <div className="absolute end-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t.video.settings}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
              )}
            >
              <Settings2 className="size-4" aria-hidden />
              {dataSaver ? t.video.dataSaver : level >= 0 ? `${levels[level]?.height ?? ''}p` : t.video.auto}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {options.length > 1 && !dataSaver && (
                <>
                  <DropdownMenuLabel>{t.video.quality}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                    <DropdownMenuRadioItem value="-1">{t.video.auto}</DropdownMenuRadioItem>
                    {options.map((o) => (
                      <DropdownMenuRadioItem key={o.index} value={String(o.index)}>
                        {o.height}p
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuCheckboxItem checked={dataSaver} onCheckedChange={(on) => setDataSaver(on === true)} onSelect={(e) => e.preventDefault()}>
                <span className="flex flex-col gap-0.5">
                  <span>{t.video.dataSaver}</span>
                  <span className="text-xs text-muted-foreground">{t.video.dataSaverHint}</span>
                </span>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
}

/** Resume and watch tracking for a `<video>`: seeks to the saved spot, saves every 10 s, on pause, on leave and at the end. */
function useResume(ref: RefObject<HTMLVideoElement | null>, resume: VideoResume | undefined, carryOverRef: RefObject<number | null>) {
  const latest = useRef(resume);
  const lastSaved = useRef(Math.floor(resume?.startSec ?? 0));
  const ended = useRef(false);
  useEffect(() => {
    latest.current = resume;
  });

  /** Seek to the saved spot (or where the viewer was before a source change), unless they have already started elsewhere. */
  const seek = () => {
    const v = ref.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const carried = carryOverRef.current;
    if (carried !== null) {
      carryOverRef.current = null;
      if (carried > 0 && carried < v.duration - 1) v.currentTime = carried;
      return;
    }
    const at = latest.current?.startSec ?? 0;
    if (at <= 0 || v.currentTime >= 1) return;
    if (at < v.duration - 3) v.currentTime = at;
  };

  const startSec = resume?.startSec;
  useEffect(() => {
    const v = ref.current;
    if (v && v.readyState >= 1) seek();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seek only when the saved position arrives (the ref is stable)
  }, [startSec]);

  /** The video's length in whole seconds, once the browser knows it. */
  const length = (): VideoWatch => {
    const d = ref.current?.duration;
    return d && Number.isFinite(d) && d >= 1 ? { durationSec: Math.round(d) } : {};
  };

  useEffect(() => {
    const video = ref.current;
    const position = () => Math.floor(video?.currentTime ?? 0);
    const report = (kind: 'onSave' | 'onExit') => {
      const r = latest.current;
      if (!r || ended.current) return;
      const sec = position();
      if (sec === lastSaved.current) return;
      lastSaved.current = sec;
      r[kind](sec, length());
    };
    const timer = window.setInterval(() => {
      if (video && !video.paused) report('onSave');
    }, SAVE_EVERY_MS);
    const exit = () => report('onExit');
    const hidden = () => document.visibilityState === 'hidden' && exit();
    window.addEventListener('pagehide', exit);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', exit);
      document.removeEventListener('visibilitychange', hidden);
      // Moving to another lesson: keep the spot.
      if (video && video.currentTime > 0) report('onSave');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per element (the ref is stable)
  }, []);

  return {
    onLoadedMetadata: seek,
    onPlay: () => {
      ended.current = false;
    },
    onPause: () => {
      const r = latest.current;
      if (!r || ended.current) return;
      const sec = Math.floor(ref.current?.currentTime ?? 0);
      if (sec !== lastSaved.current) {
        lastSaved.current = sec;
        r.onSave(sec, length());
      }
    },
    onEnded: () => {
      const r = latest.current;
      if (!r) return;
      ended.current = true;
      // Finished: next time starts from the top.
      lastSaved.current = 0;
      r.onSave(0, { ...length(), ended: true });
    },
  };
}
