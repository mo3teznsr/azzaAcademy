'use client';

import Image from 'next/image';
import { useRef, useState, type ReactNode } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

/**
 * The short explainer videos (4:5, Arabic voice with burned-in Arabic captions) under /public/videos, made with the
 * Remotion project in /videos. Nothing downloads until the visitor presses play, and they play with sound.
 */
export type ExplainerId = 'home' | 'how' | 'all-access' | 'teach';

export const explainerSrc = (id: ExplainerId) => `/videos/${id}.mp4`;
export const explainerPoster = (id: ExplainerId) => `/videos/${id}.jpg`;
const src = explainerSrc;
const poster = explainerPoster;

/** In the dialog the video mounts on open (that click allows sound), so it can autoplay. */
function Player({ id, title }: { id: ExplainerId; title: string }) {
  return (
    // The Arabic captions are burned into the picture, so there is no separate captions track.
    <video src={src(id)} poster={poster(id)} controls autoPlay playsInline preload="auto" aria-label={title} className="size-full bg-ink-deep object-contain" />
  );
}

/** The duration chip and the play affordance drawn over a cover. */
export function PlayBadge({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-3 rounded-full bg-white/95 py-2 ps-2 pe-5 text-ink-deep shadow-media transition-transform duration-200 group-hover:-translate-y-0.5">
      <span className="flex size-11 items-center justify-center rounded-full bg-green text-ink-deep">
        <Play className="size-5 translate-x-px fill-current" aria-hidden />
      </span>
      <span className="flex flex-col text-start leading-tight">
        <b className="text-[15px]">{label}</b>
        <span className="text-xs text-muted-foreground">{t.explainers.lengthNote}</span>
      </span>
    </span>
  );
}

/**
 * A cover (the page's own photo, or the video's first frame) that turns into the video in place on play.
 * `cover` lets a section keep its photo; the frame keeps its own aspect ratio so nothing jumps.
 */
export function ExplainerVideo({ id, title, cover, coverAlt, className, coverClassName, coverPreload }: { id: ExplainerId; title: string; cover?: string; coverAlt?: string; className?: string; coverClassName?: string; coverPreload?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  return (
    <div className={cn('relative overflow-hidden rounded-[24px] bg-muted shadow-media', className)}>
      {/* Mounted from the start with preload="none" (nothing downloads), so play() runs inside the click and keeps its sound. */}
      <video
        ref={video}
        src={src(id)}
        poster={poster(id)}
        controls={playing}
        playsInline
        preload="none"
        aria-label={title}
        aria-hidden={!playing}
        tabIndex={playing ? 0 : -1}
        className="absolute inset-0 size-full bg-ink-deep object-contain"
      />
      {!playing && (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            void video.current?.play();
          }}
          className="group absolute inset-0 cursor-pointer"
          aria-label={title}
        >
          <Image src={cover ?? poster(id)} alt={coverAlt ?? ''} fill preload={coverPreload} sizes="(min-width: 1024px) 40vw, 100vw" className={cn('object-cover', coverClassName)} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-deep/55 via-transparent to-transparent" />
          <span className="absolute inset-x-4 bottom-4 flex justify-start">
            <PlayBadge label={title} />
          </span>
        </button>
      )}
    </div>
  );
}

/** A "watch" button that opens the video in a dialog, for sections whose layout should stay as it is. */
export function ExplainerVideoButton({ id, title, children, className, variant = 'outline' }: { id: ExplainerId; title: string; children?: ReactNode; className?: string; variant?: 'outline' | 'ink' | 'secondary' }) {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="lg" className={cn('gap-2.5', className)}>
          <Play className="size-4 fill-current" aria-hidden />
          {children ?? title}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-3 overflow-hidden p-3 sm:max-w-[min(26rem,calc(100vw-2rem))]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{t.explainers.lengthNote}</DialogDescription>
        <div className="aspect-[4/5] overflow-hidden rounded-xl">
          <Player id={id} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
