'use client';

import '@livekit/components-styles';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Track } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useConnectionState,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { Hand, LogOut, MicOff, PhoneOff, Radio, UserMinus, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Chip } from '@/components/brand/status-chip';
import { SignalMark } from '@/components/brand/signal-mark';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { sessionsApi, type JoinTicket, type SessionDetail } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { useForcedTheme } from '@/lib/theme/provider';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { slate, timecode } from '@/lib/i18n/format';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { ChatPanel } from './chat-panel';
import { FeedbackCard } from './feedback-card';
import { Stage } from './stage';
import { useRoomRealtime, useSessionStatusFeed, type HandEntry } from './use-room-realtime';
import { ConnectionBanner, ConnectionLost, EdgeScreen, PermissionHelp, SelfPreview, SignalPortrait, WaitingForHost } from './edge-screens';
import {
  edgeFromJoinError,
  edgeFromSession,
  isConnectionLoss,
  isTerminalEdge,
  linkBanner,
  mediaBlockFrom,
  mediaBlockFromFailure,
  type LiveEdge,
  type MediaBlock,
} from './live-edge';

type Mode = 'student' | 'host';

export function LiveRoomScreen({ sessionId, mode }: { sessionId: string; mode: Mode }) {
  // The room is always on the ink ground, whatever the site theme (the inline theme script also forces it on load).
  useForcedTheme('dark');
  const q = useQuery({
    queryKey: qk.session(sessionId),
    queryFn: () => sessionsApi.get(sessionId),
    // Students waiting for the host: poll as a fallback to the session:status push.
    refetchInterval: (query) => (mode === 'student' && query.state.data?.status === 'SCHEDULED' ? 15_000 : false),
  });
  if (q.isPending)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingBlock rows={2} height={180} />
      </div>
    );
  if (q.isError)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </div>
    );
  return <Room session={q.data} mode={mode} />;
}

function joinErrorMessage(err: unknown, { t, f }: Pick<ReturnType<typeof useI18n>, 't' | 'f'>) {
  if (err instanceof ApiError) {
    if (err.isNetwork) return t.common.networkError;
    if (err.code === 'LOBBY_NOT_OPEN') {
      const opensAt = (err.details as { opensAt?: string } | undefined)?.opensAt;
      return opensAt ? `${t.live.lobbyClosed} (${f.time(opensAt)})` : t.live.lobbyClosed;
    }
    return err.message;
  }
  return t.live.joinError;
}

function Room({ session, mode }: { session: SessionDetail; mode: Mode }) {
  const { t, f, pick } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const now = useNow(5_000);
  const [ticket, setTicket] = useState<JoinTicket | null>(null);
  const [left, setLeft] = useState(session.status === 'ENDED');
  const [lost, setLost] = useState(false);
  const [fatal, setFatal] = useState<LiveEdge | null>(null);
  const [pushedStatus, setPushedStatus] = useState<SessionDetail['status'] | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [previewBlock, setPreviewBlock] = useState<MediaBlock | null>(null);
  const [roomBlock, setRoomBlock] = useState<MediaBlock | null>(null);
  /** Set while we tear the LiveKit room down ourselves, so its disconnect isn't read as "left". */
  const closing = useRef(false);
  const waited = useRef(false);
  // Stable: LiveKit's usePreviewTracks re-creates the tracks whenever this callback changes.
  const onPreviewError = useCallback((err: Error) => setPreviewBlock(mediaBlockFrom(err)), []);

  const join = useMutation({
    mutationFn: () => sessionsApi.join(session.id),
    onSuccess: (tk) => {
      closing.current = false;
      setFatal(null);
      setLost(false);
      setTicket(tk);
    },
  });
  const { mutate: joinNow, isIdle: joinIdle } = join;
  const isHost = mode === 'host';
  const status = pushedStatus ?? session.status;
  const host = session.host ?? session.batch.teacher;
  const code = slate(session.batch.code, session.number);
  const course = pick(session.batch.course.titleEn, session.batch.course.titleAr).text;

  // Status pushes (session:status) while we wait in the lobby; polling in LiveRoomScreen is the fallback.
  useSessionStatusFeed(session.id, !ticket, (e) => {
    setPushedStatus(e.status);
    void qc.invalidateQueries({ queryKey: qk.session(session.id) });
  });

  const sessionEdge = edgeFromSession({ ...session, status }, now, isHost);
  const joinEdge = join.error ? edgeFromJoinError(join.error, session) : null;
  const edge = fatal ?? (isTerminalEdge(joinEdge) ? joinEdge : null) ?? (isTerminalEdge(sessionEdge) ? sessionEdge : null);
  const waiting = !ticket && sessionEdge?.kind === 'waiting';

  // Auto-continue: a student who waited for the host joins as soon as the session goes live.
  useEffect(() => {
    if (waiting) {
      waited.current = true;
      return;
    }
    if (waited.current && status === 'LIVE' && !ticket && joinIdle) {
      waited.current = false;
      joinNow();
    }
  }, [waiting, status, ticket, joinIdle, joinNow]);

  if (left) {
    if (isHost)
      return (
        <div className="grid min-h-dvh place-items-center p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <SignalMark state="ended" size={40} />
            <h1 className="font-display text-4xl font-extrabold">{t.studio.host.ended}</h1>
            <Button asChild>
              <Link href={`/studio/sessions/${session.id}/report`}>{t.studio.host.openReport}</Link>
            </Button>
          </div>
        </div>
      );
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <FeedbackCard sessionId={session.id} />
      </div>
    );
  }

  if (edge && isTerminalEdge(edge) && !(isHost && edge.kind === 'roomFull')) {
    const retry = () => {
      setFatal(null);
      join.reset();
      joinNow();
    };
    return <EdgeScreen edge={edge} session={session} onRetry={retry} retrying={join.isPending} />;
  }

  if (lost && !ticket) return <ConnectionLost onRejoin={() => joinNow()} pending={join.isPending} />;

  if (!ticket || !ticket.serverUrl) {
    const lobbyNotOpen = sessionEdge?.kind === 'lobbyNotOpen' ? sessionEdge : null;
    const canJoin = isHost || status === 'LIVE';
    return (
      <div className="grid min-h-dvh place-items-center p-4 sm:p-6">
        <div className="flex w-full max-w-4xl flex-col gap-6 rounded-[28px] border border-line bg-card p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="label-mono text-muted-foreground" dir="ltr">
              {code}
            </span>
            <Chip tone={status === 'LIVE' ? 'onair' : 'sky'} dot={status === 'LIVE'}>
              {status === 'LIVE' ? t.live.edge.liveNow : t.status.session[status]}
            </Chip>
          </div>
          <div>
            <span className="label-mono text-muted-foreground">{t.live.lobbyTitle}</span>
            <h1 className="mt-2 font-display text-[clamp(36px,6vw,64px)] font-extrabold leading-[0.9]">{session.title}</h1>
            <p className="mt-3 text-muted-foreground">
              {course} · {f.dateLong(session.startsAt)} · {f.time(session.startsAt)}–{f.time(session.endsAt)}
            </p>
          </div>
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="order-2 md:order-1">
              {isHost ? (
                status !== 'LIVE' && (
                  <div className="flex items-center gap-3 rounded-[14px] border border-line bg-ink p-3.5 text-sm">
                    <span className="size-2 rounded-full bg-sun" aria-hidden />
                    {t.studio.host.notLive}
                  </div>
                )
              ) : status === 'LIVE' ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <SignalPortrait person={host} live size={96} />
                  <Chip tone="onair" dot>
                    {t.live.edge.liveNow}
                  </Chip>
                </div>
              ) : (
                <WaitingForHost host={host} opensAt={lobbyNotOpen?.opensAt} />
              )}
            </div>
            <div className="order-1 md:order-2">
              <SelfPreview
                name={user?.name ?? ''}
                mic={mic}
                cam={cam}
                onMic={(on) => {
                  setPreviewBlock(null);
                  setMic(on);
                }}
                onCam={(on) => {
                  setPreviewBlock(null);
                  setCam(on);
                }}
                onError={onPreviewError}
              />
            </div>
          </div>
          {previewBlock && (
            <PermissionHelp
              block={previewBlock}
              onRetry={() => {
                setPreviewBlock(null);
                setMic(true);
                setCam(true);
              }}
              onAudioOnly={
                cam
                  ? () => {
                      setPreviewBlock(null);
                      setCam(false);
                      setMic(true);
                    }
                  : undefined
              }
              onListenOnly={() => {
                setPreviewBlock(null);
                setCam(false);
                setMic(false);
              }}
            />
          )}
          {join.isError && !isTerminalEdge(joinEdge) && (
            <ErrorState compact error={new ApiError(422, '', joinErrorMessage(join.error, { t, f }))} />
          )}
          {ticket && !ticket.serverUrl && <p className="text-sm text-peach">{t.live.videoUnavailable}</p>}
          <div className="flex flex-wrap gap-3">
            {canJoin && (
              <Button size="lg" variant={isHost ? 'sun' : 'onair'} onClick={() => joinNow()} disabled={join.isPending}>
                <Radio /> {join.isPending ? t.live.connecting : t.live.join}
              </Button>
            )}
            <Button variant="ghost" size="lg" onClick={() => router.back()}>
              {t.common.back}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const publish = ticket.role !== 'observer' && ticket.canPublish;
  return (
    <LiveKitRoom
      serverUrl={ticket.serverUrl}
      token={ticket.token}
      connect
      audio={publish && mic}
      video={publish && cam}
      data-lk-theme="default"
      className="flex h-dvh flex-col bg-ink"
      onDisconnected={(reason) => {
        if (closing.current) return;
        if (isConnectionLoss(reason)) {
          closing.current = true;
          setLost(true);
          setTicket(null);
        } else setLeft(true);
      }}
      onError={(e) => {
        const mapped = edgeFromJoinError(e, session);
        if (mapped.kind === 'roomFull') {
          closing.current = true;
          setFatal(mapped);
          setTicket(null);
        } else toast.error(e.message);
      }}
      onMediaDeviceFailure={(failure) => setRoomBlock(mediaBlockFromFailure(failure))}
    >
      <InRoom session={session} ticket={ticket} onEnded={() => setLeft(true)} block={roomBlock} onDismissBlock={() => setRoomBlock(null)} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function InRoom({
  session,
  ticket,
  onEnded,
  block,
  onDismissBlock,
}: {
  session: SessionDetail;
  ticket: JoinTicket;
  onEnded: () => void;
  block: MediaBlock | null;
  onDismissBlock: () => void;
}) {
  const { t, f, fill } = useI18n();
  const { user } = useAuth();
  const room = useRoomContext();
  const qc = useQueryClient();
  const state = useConnectionState();
  const participants = useParticipants();
  const now = useNow();
  const [status, setStatus] = useState(session.status);
  const [startedAt, setStartedAt] = useState(session.startedAt);
  const rt = useRoomRealtime(session.id, (e) => {
    setStatus(e.status);
    if (e.startedAt) setStartedAt(e.startedAt);
    if (e.status === 'ENDED') onEnded();
  });
  const myHand = rt.hands.some((h) => h.userId === user?.id);
  const isHost = ticket.role === 'host';
  const perms = useLocalParticipantPermissions();
  // Students start listen-only; the host's allow-speak updates LiveKit permissions live.
  const canPublish = ticket.role !== 'observer' && (perms?.canPublish ?? ticket.canPublish);
  const elapsed = startedAt ? (now - new Date(startedAt).getTime()) / 1000 : 0;

  const goLive = useMutation({
    mutationFn: () => sessionsApi.start(session.id),
    onSuccess: (s) => {
      setStatus(s.status ?? 'LIVE');
      setStartedAt(s.startedAt ?? new Date().toISOString());
      void qc.invalidateQueries({ queryKey: qk.session(session.id) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const end = useMutation({
    mutationFn: () => sessionsApi.end(session.id),
    onSuccess: () => {
      void room.disconnect();
      onEnded();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        {status === 'LIVE' ? (
          <Chip tone="onair" dot>
            {t.live.rec} <span className="timecode">{timecode(elapsed)}</span>
          </Chip>
        ) : (
          <Chip tone="sun">{t.live.lobbyTitle}</Chip>
        )}
        <div className="min-w-0">
          <b className="block truncate">{session.title}</b>
          <span className="label-mono text-muted-foreground" dir="ltr">
            {slate(session.batch.code, session.number)}
          </span>
        </div>
        <span className="ms-auto text-sm text-muted-foreground">{fill(t.live.inRoom, { n: f.number(participants.length) })}</span>
        {isHost && <Chip tone="sun">{t.studio.host.youAreHost}</Chip>}
      </header>
      <ConnectionBanner state={linkBanner(state)} />
      {block && (
        <PermissionHelp
          className="mx-3 mt-3"
          block={block}
          onRetry={() => {
            onDismissBlock();
            void room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
          }}
          onAudioOnly={() => {
            onDismissBlock();
            void room.localParticipant.setCameraEnabled(false);
          }}
          onListenOnly={() => {
            onDismissBlock();
            void room.localParticipant.setCameraEnabled(false);
            void room.localParticipant.setMicrophoneEnabled(false);
          }}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="flex min-h-[40dvh] min-w-0 flex-1 flex-col">
          <Stage hands={rt.hands} />
        </div>
        <aside className="flex min-h-80 w-full flex-col rounded-2xl bg-card p-3 lg:w-[360px]">
          <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="chat">{t.live.chat}</TabsTrigger>
              <TabsTrigger value="people">{fill(t.live.people, { n: f.number(participants.length) })}</TabsTrigger>
              {isHost && <TabsTrigger value="hands">✋ {f.number(rt.hands.length)}</TabsTrigger>}
            </TabsList>
            <TabsContent value="chat" className="mt-3 flex min-h-0 flex-1 flex-col">
              <ChatPanel messages={rt.messages} onSend={rt.send} meId={user?.id} />
            </TabsContent>
            <TabsContent value="people" className="mt-3 overflow-y-auto">
              <ul className="flex flex-col gap-1">
                {participants.map((p) => (
                  <li key={p.identity} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-ink">
                    <InitialsAvatar name={p.name || p.identity} size={32} />
                    <bdi className="min-w-0 flex-1 truncate text-sm">{p.name || p.identity}</bdi>
                    {!p.isMicrophoneEnabled && <MicOff className="size-4 text-muted-foreground" aria-label="muted" />}
                    {isHost && !p.isLocal && <HostActions sessionId={session.id} userId={p.identity} />}
                  </li>
                ))}
              </ul>
            </TabsContent>
            {isHost && (
              <TabsContent value="hands" className="mt-3 overflow-y-auto">
                <HandQueue sessionId={session.id} hands={rt.hands} />
              </TabsContent>
            )}
          </Tabs>
        </aside>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-line px-4 py-3" dir="ltr">
        <StartAudio label="🔈" className="!rounded-full" />
        {canPublish && (
          <>
            <TrackToggle source={Track.Source.Microphone} className="lk-button !size-12 !rounded-full" aria-label={t.live.mic} />
            <TrackToggle source={Track.Source.Camera} className="lk-button !size-12 !rounded-full" aria-label={t.live.cam} />
            {isHost && <TrackToggle source={Track.Source.ScreenShare} className="lk-button !size-12 !rounded-full" aria-label={t.live.share} />}
          </>
        )}
        {!isHost && (
          <Button variant={myHand ? 'sun' : 'secondary'} size="icon-lg" onClick={() => (myHand ? rt.lower() : rt.raise())} aria-label={myHand ? t.live.lowerHand : t.live.raiseHand} aria-pressed={myHand}>
            <Hand />
          </Button>
        )}
        {isHost && status !== 'LIVE' && (
          <Button variant="sun" onClick={() => goLive.mutate()} disabled={goLive.isPending}>
            <Radio /> {goLive.isPending ? t.studio.host.goingLive : t.studio.host.goLive}
          </Button>
        )}
        {isHost ? (
          <EndForAll code={slate(session.batch.code, session.number)} onConfirm={() => end.mutate()} pending={end.isPending} />
        ) : (
          <Button variant="onair" onClick={() => void room.disconnect()}>
            <LogOut /> {t.live.leave}
          </Button>
        )}
      </footer>
      <LocalNameSync />
    </div>
  );
}

/** Keeps the local participant's name visible even before metadata arrives. */
function LocalNameSync() {
  useLocalParticipant();
  return null;
}

function HostActions({ sessionId, userId }: { sessionId: string; userId: string }) {
  const { t } = useI18n();
  const run = (fn: () => Promise<unknown>) => () => void fn().catch((e: Error) => toast.error(e.message));
  return (
    <span className="flex gap-1">
      <Button variant="ghost" size="icon-xs" aria-label={t.studio.host.mute} onClick={run(() => sessionsApi.mute(sessionId, userId))}>
        <MicOff />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label={t.studio.host.allow} onClick={run(() => sessionsApi.allowSpeak(sessionId, userId))}>
        <Volume2 />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label={t.studio.host.removeUser} onClick={run(() => sessionsApi.remove(sessionId, userId))}>
        <UserMinus />
      </Button>
    </span>
  );
}

function HandQueue({ sessionId, hands }: { sessionId: string; hands: HandEntry[] }) {
  const { t, f } = useI18n();
  if (!hands.length) return <p className="text-sm text-muted-foreground">{t.studio.host.noHands}</p>;
  return (
    <ol className="flex flex-col gap-2">
      <span className="label-mono text-muted-foreground">{t.live.handQueue}</span>
      {hands.map((h, i) => (
        <li key={h.userId} className="flex items-center gap-2.5 rounded-xl bg-ink p-2.5">
          <span className="timecode w-6 text-sm text-sun">{f.number(i + 1)}</span>
          <InitialsAvatar name={h.name} size={28} />
          <bdi className="min-w-0 flex-1 truncate text-sm">{h.name}</bdi>
          <Button size="xs" variant="sun" onClick={() => void sessionsApi.allowSpeak(sessionId, h.userId).catch((e: Error) => toast.error(e.message))}>
            {t.studio.host.allow}
          </Button>
        </li>
      ))}
    </ol>
  );
}

function EndForAll({ code, onConfirm, pending }: { code: string; onConfirm: () => void; pending: boolean }) {
  const { t, fill } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <PhoneOff /> {t.studio.host.endForAll}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{fill(t.studio.host.endTitle, { s: code })}</AlertDialogTitle>
            <AlertDialogDescription>{t.studio.host.endBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.studio.host.keepGoing}</AlertDialogCancel>
            <AlertDialogAction className={cn('bg-danger-bg text-danger-fg')} onClick={onConfirm} disabled={pending}>
              {t.studio.host.endSession}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
