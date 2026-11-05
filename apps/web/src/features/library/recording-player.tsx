'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Download, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Chip } from '@/components/brand/status-chip';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { Panel, SectionHeader } from '@/components/brand/section';
import { SignalMark } from '@/components/brand/signal-mark';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi, mediaUrl, sessionsApi, type SessionDetail } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { sessionCode, timecode } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';

const SPEEDS = [1, 1.25, 1.5, 2] as const;

export function RecordingPlayer({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.session(sessionId), queryFn: () => sessionsApi.get(sessionId), retry: false });
  if (q.isPending) return <LoadingBlock rows={1} height={420} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data.myRole) return <ErrorState error={new Error(t.player.notFound)} />;
  return <PlayerView s={q.data} />;
}

function PlayerView({ s }: { s: SessionDetail }) {
  const { t, f, fill, pick } = useI18n();
  const src = mediaUrl(s.recordingUrl);
  const course = pick(s.batch.course.titleEn, s.batch.course.titleAr).text;
  const teacher = s.host ?? s.batch.teacher;
  const durationMin = s.endedAt && s.startedAt ? Math.round((+new Date(s.endedAt) - +new Date(s.startedAt)) / 60000) : null;
  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/library" className="hover:text-foreground">
          {t.player.back}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        <span className="text-foreground">
          <bdi dir="ltr">
            {s.batch.code}·{sessionCode(s.number)}
          </bdi>
        </span>
      </nav>
      {src ? (
        <VideoPlayer src={src} title={s.title} />
      ) : (
        <section aria-labelledby="processing" className="grid aspect-video place-items-center rounded-[24px] border border-dashed border-line-strong bg-card p-8 text-center" role="status">
          <div className="flex max-w-md flex-col items-center gap-3">
            <SignalMark state="starting" size={44} />
            <h2 id="processing" className="font-display text-3xl font-extrabold">
              {t.player.processingTitle}
            </h2>
            <p className="text-muted-foreground">{t.player.processingBody}</p>
          </div>
        </section>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="outline">
              <span dir="ltr">
                {s.batch.code}·{sessionCode(s.number)}
              </span>
            </Chip>
            <span className="label-mono text-muted-foreground">{course}</span>
          </div>
          <h1 className="font-display text-[clamp(36px,5vw,64px)] leading-[0.9] font-extrabold">{s.title}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {teacher && (
              <span className="flex items-center gap-2 text-foreground">
                <InitialsAvatar name={teacher.name} src={teacher.image} size={28} />
                <bdi>{teacher.name}</bdi>
              </span>
            )}
            <span>{fill(t.player.recorded, { d: f.dateLong(s.startsAt) })}</span>
            {durationMin ? <span>{fill(t.common.min, { n: f.number(durationMin) })}</span> : null}
          </div>
          {s.notes && <p className="max-w-2xl whitespace-pre-line text-muted-foreground">{s.notes}</p>}
        </header>
        <NextSession s={s} />
      </div>
      <BatchMaterials batchId={s.batch.id} sessionId={s.id} />
    </>
  );
}

function VideoPlayer({ src, title }: { src: string; title: string }) {
  const { t } = useI18n();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [full, setFull] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setFailed(true));
    else v.pause();
  }, []);
  const skip = useCallback((d: number) => {
    const v = video.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + d), v.duration || v.currentTime + d);
  }, []);
  const setSpeed = (r: number) => {
    setRate(r);
    if (video.current) video.current.playbackRate = r;
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current?.requestFullscreen?.();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'BUTTON') return;
    const actions: Record<string, () => void> = {
      ' ': toggle,
      k: toggle,
      ArrowLeft: () => skip(-10),
      j: () => skip(-10),
      ArrowRight: () => skip(10),
      l: () => skip(10),
      f: toggleFull,
    };
    const run = actions[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  const btn = 'press grid size-11 shrink-0 place-items-center rounded-full text-ivory hover:bg-ivory/10';
  return (
    <div ref={wrap} className={cn('group relative overflow-hidden rounded-[24px] bg-black', full && 'flex flex-col justify-center rounded-none')} onKeyDown={onKey}>
      <video
        ref={video}
        src={src}
        className="aspect-video w-full bg-black"
        preload="metadata"
        playsInline
        aria-label={title}
        tabIndex={0}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          e.currentTarget.playbackRate = rate;
        }}
        onError={() => setFailed(true)}
      />
      {failed && (
        <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-danger-line bg-danger-bg p-3 text-sm text-danger-fg" role="alert">
          {t.common.errorBody}
          <a href={src} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-foreground underline">
            <Download className="size-4" aria-hidden /> {t.common.download}
          </a>
        </div>
      )}
      <div role="group" aria-label={t.player.controls} dir="ltr" className="flex flex-wrap items-center gap-1 bg-ink/95 px-3 py-2 text-ivory">
        <button type="button" className={btn} onClick={toggle} aria-label={playing ? t.player.pause : t.player.play}>
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>
        <button type="button" className={btn} onClick={() => skip(-10)} aria-label={t.player.back10}>
          <RotateCcw className="size-5" aria-hidden />
        </button>
        <button type="button" className={btn} onClick={() => skip(10)} aria-label={t.player.forward10}>
          <RotateCw className="size-5" aria-hidden />
        </button>
        <span className="timecode px-2 text-sm text-stone" aria-hidden>
          {timecode(time)} / {timecode(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const v = video.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
          aria-label={t.player.seek}
          aria-valuetext={`${timecode(time)} / ${timecode(duration)}`}
          className="h-11 min-w-32 flex-1 cursor-pointer accent-sun"
        />
        <ToggleGroup
          type="single"
          value={String(rate)}
          onValueChange={(v) => v && setSpeed(Number(v))}
          aria-label={t.player.speed}
          className="gap-0.5"
        >
          {SPEEDS.map((r) => (
            <ToggleGroupItem key={r} value={String(r)} className="h-11 min-w-11 rounded-full px-2 font-mono text-xs text-stone data-[state=on]:bg-ivory data-[state=on]:text-ink">
              {r}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <button type="button" className={btn} onClick={toggleFull} aria-label={full ? t.player.exitFullscreen : t.player.fullscreen}>
          {full ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function NextSession({ s }: { s: SessionDetail }) {
  const { t, f, fill } = useI18n();
  const q = useQuery({ queryKey: qk.batch(s.batch.id), queryFn: () => batchesApi.get(s.batch.id) });
  const next = q.data?.sessions.filter((x) => x.status !== 'CANCELLED' && x.number > s.number).sort((a, b) => a.number - b.number)[0];
  return (
    <Panel aria-labelledby="next-session" className="gap-3">
      <span id="next-session" className="label-mono text-muted-foreground">
        {t.player.nextSession}
      </span>
      {q.isPending ? (
        <LoadingBlock rows={1} height={72} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} />
      ) : !next ? (
        <p className="text-sm text-muted-foreground">{t.player.lastSession}</p>
      ) : (
        <>
          <span className="label-mono text-muted-foreground" dir="ltr">
            {s.batch.code}·{sessionCode(next.number)}
          </span>
          <b className="font-display text-2xl leading-tight font-extrabold">{next.title}</b>
          {next.recordingUrl || next.status === 'ENDED' ? (
            <Link href={`/library/${next.id}`} className="link-sun inline-flex min-h-11 items-center text-sm">
              {t.player.watchNext}
            </Link>
          ) : next.status === 'LIVE' ? (
            <Link href={`/live/${next.id}`} className="link-sun inline-flex min-h-11 items-center gap-2 text-sm">
              <span aria-hidden className="onair text-onair-fg" /> {t.learn.joinLive}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">{fill(t.player.liveOn, { d: `${f.date(next.startsAt)} · ${f.time(next.startsAt)}` })}</span>
          )}
        </>
      )}
    </Panel>
  );
}

function BatchMaterials({ batchId, sessionId }: { batchId: string; sessionId: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: qk.materials(batchId), queryFn: () => batchesApi.materials(batchId), retry: false });
  const list = [...(q.data ?? [])].sort((a, b) => Number(b.sessionId === sessionId) - Number(a.sessionId === sessionId));
  return (
    <Panel aria-labelledby="mats">
      <SectionHeader title={<span id="mats">{t.player.materials}</span>} size="sm" />
      {q.isPending ? (
        <LoadingBlock rows={2} height={48} />
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.player.noMaterials}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((m) => (
            <li key={m.id}>
              <a href={m.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-[14px] bg-card p-3.5 text-foreground no-underline hover:bg-accent">
                <span className="label-mono w-16 shrink-0 text-muted-foreground">{t.status.material[m.kind]}</span>
                <b className="min-w-0 flex-1 truncate">{m.title}</b>
                {m.session && (
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {sessionCode(m.session.number)}
                  </span>
                )}
                <Download className="size-4 text-sun-fg" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
