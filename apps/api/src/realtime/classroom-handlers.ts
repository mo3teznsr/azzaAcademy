import { chatMessageInput, SOCKET_EVENTS, type SocketAck } from '@azza/shared';
import type { Socket } from 'socket.io';
import { AppError } from '../core/errors';
import { rooms } from '../infrastructure/realtime/realtime';
import type { SessionService } from '../modules/sessions/session.service';
import type { Role } from '@azza/shared';

type SocketUser = { id: string; name: string; role: Role };
type Ack = (res: SocketAck) => void;

const fail = (err: unknown): SocketAck => {
  if (err instanceof AppError) return { ok: false, error: { code: err.code, message: err.message } };
  console.error('[socket]', err);
  return { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } };
};

const sessionIdOf = (payload: unknown) =>
  payload && typeof payload === 'object' && typeof (payload as { sessionId?: unknown }).sessionId === 'string'
    ? (payload as { sessionId: string }).sessionId
    : null;

/** Classroom events. Every handler re-authorizes through SessionService (never trusts the client). */
export function registerClassroomHandlers(socket: Socket, sessions: SessionService) {
  const user = socket.data.user as SocketUser;
  const inRoom = (sessionId: string) => socket.rooms.has(rooms.session(sessionId));

  const handle =
    (fn: (payload: unknown) => Promise<unknown>) =>
    async (payload: unknown, ack?: Ack) => {
      try {
        const data = await fn(payload);
        ack?.({ ok: true, data });
      } catch (err) {
        ack?.(fail(err));
      }
    };

  const requireSessionId = (payload: unknown) => {
    const id = sessionIdOf(payload);
    if (!id) throw new AppError('sessionId is required', 400, 'VALIDATION');
    return id;
  };
  const requireJoined = (sessionId: string) => {
    if (!inRoom(sessionId)) throw new AppError('Join the session first', 403, 'NOT_IN_SESSION');
  };

  socket.on(
    SOCKET_EVENTS.JOIN_SESSION,
    handle(async (payload) => {
      const sessionId = requireSessionId(payload);
      const role = await sessions.participantRole(sessionId, user);
      await socket.join(rooms.session(sessionId));
      return { sessionId, role, hands: sessions.handQueue(sessionId) };
    }),
  );

  socket.on(
    SOCKET_EVENTS.LEAVE_SESSION,
    handle(async (payload) => {
      const sessionId = requireSessionId(payload);
      await socket.leave(rooms.session(sessionId));
      if (user.role === 'STUDENT') await sessions.lowerHand(sessionId, user).catch(() => undefined);
      return { sessionId };
    }),
  );

  socket.on(
    SOCKET_EVENTS.SEND_CHAT,
    handle(async (payload) => {
      const sessionId = requireSessionId(payload);
      requireJoined(sessionId);
      const parsed = chatMessageInput.safeParse(payload);
      if (!parsed.success) throw new AppError('Invalid message', 400, 'VALIDATION');
      return sessions.postChat(sessionId, user, parsed.data.body);
    }),
  );

  socket.on(
    SOCKET_EVENTS.RAISE_HAND,
    handle(async (payload) => {
      const sessionId = requireSessionId(payload);
      requireJoined(sessionId);
      return sessions.raiseHand(sessionId, user);
    }),
  );

  socket.on(
    SOCKET_EVENTS.LOWER_HAND,
    handle(async (payload) => {
      const sessionId = requireSessionId(payload);
      requireJoined(sessionId);
      const target = (payload as { userId?: unknown }).userId;
      return sessions.lowerHand(sessionId, user, typeof target === 'string' ? target : undefined);
    }),
  );
}
