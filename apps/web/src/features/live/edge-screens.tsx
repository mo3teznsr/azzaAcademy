'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Track, type LocalVideoTrack } from 'livekit-client';
import { usePreviewTracks } from '@livekit/components-react';
import { CalendarDays, Mic, MicOff, RefreshCw, ShieldAlert, Video, VideoOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/brand/status-chip';
import { SignalMark } from '@/components/brand/signal-mark';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { CalendarSubscribe } from '@/features/schedule/calendar-subscribe';
import type { PersonRef, SessionDetail } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { gmtOffset } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import type { LinkBanner, LiveEdge, MediaBlock } from './live-edge';

const ARC = 'M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4';

/** Teacher portrait inside the signal arcs. Arcs pulse while `live` (static under prefers-reduced-motion). */
export function SignalPortrait({ person, live, size = 112 }: { person: PersonRef; live: boolean; size?: number }) {
  const box = Math.round(size * 2);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: box, height: box, direction: 'ltr' }} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 size-full">
        <path d={ARC} stroke="var(--sun)" strokeWidth="0.9" strokeLinecap="round" className={live ? 'signal-arc-live' : undefined} />
        <path
          d={ARC}
          stroke="var(--sun)"
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity={0.5}
          transform="translate(12 12) scale(1.32) translate(-12 -12)"
          className={live ? 'signal-arc-live [animation-delay:0.6s]' : undefined}
        />
      </svg>
      <InitialsAvatar name={person.name} src={person.image} size={size} className="ring-4 ring-ink" />
    </div>
  );
}

/** "<Teacher> hasn't started yet" — shown while the lobby is open and the session is not live. */
export function WaitingForHost({ host, opensAt }: { host: PersonRef; opensAt?: string | null }) {
  const { t, f, fill } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <SignalPortrait person={host} live />
      <div aria-live="polite">
        <p className="font-display text-2xl font-extrabold leading-tight">
          {fill(t.live.edge.waitingTitle, { host: host.name })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {opensAt ? fill(t.live.edge.waitingOpens, { time: f.time(opensAt) }) : t.live.edge.waitingSub}
        </p>
      </div>
    </div>
  );
}

/** Pre-join camera/mic check built on LiveKit's preview tracks. Reports getUserMedia failures via `onError`. */
export function SelfPreview({
  name,
  mic,
  cam,
  onMic,
  onCam,
  onError,
}: {
  name: string;
  mic: boolean;
  cam: boolean;
  onMic: (on: boolean) => void;
  onCam: (on: boolean) => void;
  onError: (err: Error) => void;
}) {
  const { t } = useI18n();
  const tracks = usePreviewTracks({ audio: mic, video: cam }, onError);
  const video = cam ? tracks?.find((tr): tr is LocalVideoTrack => tr.kind === Track.Kind.Video) : undefined;
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !video) return;
    video.attach(el);
    return () => {
      video.detach(el);
    };
  }, [video]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-[20px] border border-line bg-ink">
        {video ? (
          <video ref={ref} muted playsInline autoPlay className="size-full -scale-x-100 object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <InitialsAvatar name={name} size={72} />
          </div>
        )}
        <span className="label-mono absolute start-3 bottom-3 rounded-full bg-ink/70 px-2 py-1 text-ivory">
          {video ? t.live.edge.preview : t.live.edge.camOff}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant={mic ? 'secondary' : 'outline'} className="flex-1" aria-pressed={mic} onClick={() => onMic(!mic)}>
          {mic ? <Mic /> : <MicOff />} {t.live.mic}
        </Button>
        <Button variant={cam ? 'secondary' : 'outline'} className="flex-1" aria-pressed={cam} onClick={() => onCam(!cam)}>
          {cam ? <Video /> : <VideoOff />} {t.live.cam}
        </Button>
      </div>
    </div>
  );
}

/** Blocked / missing devices: how to re-enable in the browser, plus degraded ways in. */
export function PermissionHelp({
  block,
  onRetry,
  onAudioOnly,
  onListenOnly,
  className,
}: {
  block: MediaBlock;
  onRetry?: () => void;
  onAudioOnly?: () => void;
  onListenOnly?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const e = t.live.edge;
  const body = block === 'missing' ? e.permMissing : block === 'busy' ? e.permBusy : e.permBody;
  return (
    <section role="alert" className={cn('flex flex-col gap-3 rounded-[18px] border border-peach-fg/40 bg-peach-fg/10 p-4', className)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-peach-fg" aria-hidden />
        <div>
          <h2 className="font-semibold">{e.permTitle}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
      {block === 'denied' && (
        <ol className="ms-8 list-decimal space-y-1 text-sm">
          {e.permSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2 ps-8">
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw /> {e.permRetry}
          </Button>
        )}
        {onAudioOnly && (
          <Button size="sm" variant="outline" onClick={onAudioOnly}>
            <Mic /> {e.joinAudioOnly}
          </Button>
        )}
        {onListenOnly && (
          <Button size="sm" variant="ghost" onClick={onListenOnly}>
            {e.joinListenOnly}
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * Slide-down banner for LiveKit reconnects. The live region stays mounted so screen readers
 * announce the change when the text appears.
 */
export function ConnectionBanner({ state }: { state: LinkBanner }) {
  const { t } = useI18n();
  const open = state !== null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-open={open}
      className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none"
    >
      <div className="overflow-hidden">
        {state === 'reconnecting' && (
          <p className="flex items-center gap-2.5 bg-peach px-4 py-2 text-sm font-semibold text-ink">
            <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden /> {t.live.edge.reconnecting}
          </p>
        )}
        {state === 'connecting' && <p className="px-4 py-2 text-sm text-muted-foreground">{t.live.connecting}</p>}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-[28px] border border-line bg-card p-6 text-center sm:p-8">{children}</div>
    </div>
  );
}

/** "Connection lost · Rejoin" — LiveKit gave up reconnecting. */
export function ConnectionLost({ onRejoin, pending }: { onRejoin: () => void; pending: boolean }) {
  const { t } = useI18n();
  return (
    <Shell>
      <WifiOff className="size-10 text-peach-fg" aria-hidden />
      <div role="alert">
        <h1 className="font-display text-3xl font-extrabold">{t.live.edge.lostTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.live.edge.lostBody}</p>
      </div>
      <Button size="lg" variant="onair" onClick={onRejoin} disabled={pending}>
        <RefreshCw /> {pending ? t.live.connecting : t.live.edge.rejoin}
      </Button>
    </Shell>
  );
}

function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

type TerminalEdge = Extract<LiveEdge, { kind: 'ended' | 'cancelled' | 'moved' | 'roomFull' | 'notEnrolled' }>;

/** Full-screen replacements for the lobby: cancelled, moved, room full, ended, not enrolled. */
export function EdgeScreen({ edge, session, onRetry, retrying }: { edge: TerminalEdge; session: SessionDetail; onRetry?: () => void; retrying?: boolean }) {
  const { t, f, fill } = useI18n();
  const e = t.live.edge;
  const s = `S${String(session.number).padStart(2, '0')}`;
  const teacher = (session.host ?? session.batch.teacher).name;
  const zone = localZone();
  const when = (iso: string) => `${f.dateLong(iso, zone)} · ${f.time(iso, zone)}`;
  const back = (
    <Button asChild variant={edge.kind === 'moved' ? 'ghost' : 'default'} size="lg">
      <Link href="/schedule">
        <CalendarDays /> {e.backToSchedule}
      </Link>
    </Button>
  );

  return (
    <Shell>
      <span className="label-mono text-muted-foreground" dir="ltr">
        {session.batch.code} · {s}
      </span>
      {edge.kind === 'roomFull' ? (
        <SignalPortrait person={session.host ?? session.batch.teacher} live={false} size={72} />
      ) : (
        <SignalMark state={edge.kind === 'moved' ? 'scheduled' : 'ended'} size={48} />
      )}
      <div role="alert">
        <h1 className="font-display text-[clamp(28px,5vw,40px)] font-extrabold leading-tight">
          {edge.kind === 'cancelled' && fill(e.cancelledTitle, { s, teacher })}
          {edge.kind === 'moved' && fill(e.movedTitle, { s, when: when(edge.startsAt) })}
          {edge.kind === 'roomFull' &&
            (edge.inRoom != null && edge.capacity != null
              ? fill(e.roomFullTitle, { n: f.number(edge.inRoom), max: f.number(edge.capacity) })
              : e.roomFullTitleGeneric)}
          {edge.kind === 'ended' && t.live.ended}
          {edge.kind === 'notEnrolled' && e.notEnrolledTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {edge.kind === 'cancelled' && e.cancelledBody}
          {edge.kind === 'moved' && fill(e.movedBody, { was: when(edge.movedFrom), tz: `${zone} · ${gmtOffset(zone)}` })}
          {edge.kind === 'roomFull' && e.roomFullBody}
          {edge.kind === 'ended' && e.endedBody}
          {edge.kind === 'notEnrolled' && t.live.notEnrolled}
        </p>
        {edge.kind === 'moved' && edge.reason && <p className="mt-2 text-sm">{fill(e.movedReason, { reason: edge.reason })}</p>}
      </div>
      {edge.kind === 'cancelled' && <Chip tone="strike">{t.status.session.CANCELLED}</Chip>}
      <div className="flex flex-wrap justify-center gap-3">
        {edge.kind === 'roomFull' && onRetry && (
          <Button size="lg" variant="onair" onClick={onRetry} disabled={retrying}>
            <RefreshCw /> {retrying ? t.live.connecting : e.permRetry}
          </Button>
        )}
        {edge.kind === 'moved' && <CalendarSubscribe />}
        {back}
      </div>
    </Shell>
  );
}
