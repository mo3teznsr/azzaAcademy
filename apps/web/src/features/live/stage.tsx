'use client';

import { Track } from 'livekit-client';
import { VideoTrack, isTrackReference, useIsMuted, useIsSpeaking, useTracks, type TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { ParticipantTileFrame } from '@/components/brand/participant-tile';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { HandEntry } from './use-room-realtime';

function Tile({ trackRef, hands }: { trackRef: TrackReferenceOrPlaceholder; hands: HandEntry[] }) {
  const { t, f } = useI18n();
  const p = trackRef.participant;
  const speaking = useIsSpeaking(p);
  const micRef = { participant: p, source: Track.Source.Microphone, publication: p.getTrackPublication(Track.Source.Microphone) } as TrackReferenceOrPlaceholder;
  const muted = useIsMuted(micRef);
  const handIndex = hands.findIndex((h) => h.userId === p.identity);
  const name = p.name || p.identity;
  const isHost = (() => {
    try {
      return (JSON.parse(p.metadata || '{}') as { role?: string }).role === 'host';
    } catch {
      return false;
    }
  })();
  const hasVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  return (
    <ParticipantTileFrame
      name={name}
      label={isHost ? `${name} · ${t.live.hostLabel}` : p.isLocal ? `${name} · ${t.common.you}` : name}
      speaking={speaking}
      muted={muted}
      hand={handIndex >= 0 ? `✋ ${f.number(handIndex + 1)}` : undefined}
      weak={p.connectionQuality === 'poor'}
      className="aspect-video min-h-0"
    >
      {hasVideo ? <VideoTrack trackRef={trackRef} className="size-full object-cover" /> : undefined}
    </ParticipantTileFrame>
  );
}

/** Screen share takes the stage; cameras tile below (never mirrored in RTL). */
export function Stage({ hands }: { hands: HandEntry[] }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const screen = tracks.find((tr) => tr.source === Track.Source.ScreenShare && isTrackReference(tr));
  const cams = tracks.filter((tr) => tr.source === Track.Source.Camera);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" dir="ltr">
      {screen && isTrackReference(screen) && (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-cream">
          <VideoTrack trackRef={screen} className="size-full object-contain" />
        </div>
      )}
      <div className={cn('grid gap-3', screen ? 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]' : 'flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] content-start')}>
        {cams.slice(0, screen ? 6 : 12).map((tr) => (
          <Tile key={`${tr.participant.identity}-${tr.source}`} trackRef={tr} hands={hands} />
        ))}
      </div>
    </div>
  );
}
