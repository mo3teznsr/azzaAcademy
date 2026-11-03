import { ConnectionState, DisconnectReason, MediaDeviceFailure } from 'livekit-client';
import type { SessionStatus } from '@azza/shared';
import { ApiError } from '@/lib/api/client';

/** Minutes before `startsAt` the lobby opens (mirrors the API's join policy). */
export const LOBBY_OPENS_MIN = 15;

/** Every pre-join / failed-join situation the live screens render differently. */
export type LiveEdge =
  | { kind: 'waiting' }
  | { kind: 'lobbyNotOpen'; opensAt: string | null }
  | { kind: 'ended' }
  | { kind: 'cancelled' }
  | { kind: 'moved'; startsAt: string; movedFrom: string; reason: string | null }
  | { kind: 'roomFull'; inRoom: number | null; capacity: number | null }
  | { kind: 'notEnrolled' }
  | { kind: 'network' }
  | { kind: 'unknown'; message: string | null };

export interface EdgeSession {
  status: SessionStatus;
  startsAt: string;
  movedFrom: string | null;
  moveReason: string | null;
}

export function lobbyOpensAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - LOBBY_OPENS_MIN * 60_000);
}

/**
 * What the session itself says before anyone asks for a token. `null` = nothing to show, go ahead
 * (the session is live, or this is the host, who may open the room early).
 */
export function edgeFromSession(s: EdgeSession, now: number, isHost: boolean): LiveEdge | null {
  if (s.status === 'CANCELLED') return { kind: 'cancelled' };
  if (s.status === 'ENDED') return { kind: 'ended' };
  if (s.status === 'LIVE' || isHost) return null;
  const opensAt = lobbyOpensAt(s.startsAt);
  if (now < opensAt.getTime()) {
    if (s.movedFrom) return { kind: 'moved', startsAt: s.startsAt, movedFrom: s.movedFrom, reason: s.moveReason };
    return { kind: 'lobbyNotOpen', opensAt: opensAt.toISOString() };
  }
  return { kind: 'waiting' };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** LiveKit refuses a join past `max_participants` with one of these messages. */
const ROOM_FULL_RE = /room (is )?full|max(imum)? participants|exceeded its max/i;

/** Maps a refused `POST /sessions/:id/join` (or a LiveKit connect error) to a screen. */
export function edgeFromJoinError(err: unknown, s?: EdgeSession): LiveEdge {
  if (err instanceof ApiError) {
    if (err.isNetwork) return { kind: 'network' };
    const details = (err.details ?? {}) as Record<string, unknown>;
    switch (err.code) {
      case 'SESSION_CANCELLED':
        return { kind: 'cancelled' };
      case 'SESSION_ENDED':
        return { kind: 'ended' };
      case 'LOBBY_NOT_OPEN':
        if (s?.movedFrom) return { kind: 'moved', startsAt: s.startsAt, movedFrom: s.movedFrom, reason: s.moveReason };
        return { kind: 'lobbyNotOpen', opensAt: typeof details.opensAt === 'string' ? details.opensAt : null };
      case 'ROOM_FULL':
        return { kind: 'roomFull', inRoom: num(details.participants ?? details.inRoom), capacity: num(details.capacity ?? details.max) };
    }
    if (err.isForbidden) return { kind: 'notEnrolled' };
    return { kind: 'unknown', message: err.message || null };
  }
  const message = err instanceof Error ? err.message : null;
  if (message && ROOM_FULL_RE.test(message)) return { kind: 'roomFull', inRoom: null, capacity: null };
  return { kind: 'unknown', message };
}

/** Edges that replace the whole lobby with their own screen. */
export function isTerminalEdge(e: LiveEdge | null): e is Extract<LiveEdge, { kind: 'ended' | 'cancelled' | 'moved' | 'roomFull' | 'notEnrolled' }> {
  return !!e && (e.kind === 'ended' || e.kind === 'cancelled' || e.kind === 'moved' || e.kind === 'roomFull' || e.kind === 'notEnrolled');
}

/** A LiveKit disconnect we did not ask for, and that the server did not mean as final → offer Rejoin. */
export function isConnectionLoss(reason: DisconnectReason | undefined): boolean {
  switch (reason) {
    case DisconnectReason.CLIENT_INITIATED:
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
    case DisconnectReason.PARTICIPANT_REMOVED:
    case DisconnectReason.DUPLICATE_IDENTITY:
      return false;
    default:
      return true;
  }
}

export type LinkBanner = 'reconnecting' | 'connecting' | null;

export function linkBanner(state: ConnectionState): LinkBanner {
  if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) return 'reconnecting';
  if (state === ConnectionState.Connecting) return 'connecting';
  return null;
}

export type MediaBlock = 'denied' | 'missing' | 'busy' | 'other';

/** getUserMedia / LiveKit device errors → what we tell the user. */
export function mediaBlockFrom(err: unknown): MediaBlock {
  const failure = MediaDeviceFailure.getFailure(err);
  if (failure === MediaDeviceFailure.PermissionDenied) return 'denied';
  if (failure === MediaDeviceFailure.NotFound) return 'missing';
  if (failure === MediaDeviceFailure.DeviceInUse) return 'busy';
  const name = err instanceof Error || (typeof DOMException !== 'undefined' && err instanceof DOMException) ? (err as Error).name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  return 'other';
}

export function mediaBlockFromFailure(failure: MediaDeviceFailure | undefined): MediaBlock {
  if (failure === MediaDeviceFailure.PermissionDenied) return 'denied';
  if (failure === MediaDeviceFailure.NotFound) return 'missing';
  if (failure === MediaDeviceFailure.DeviceInUse) return 'busy';
  return 'other';
}
