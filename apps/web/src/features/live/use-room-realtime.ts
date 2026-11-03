'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SOCKET_EVENTS, type ChatMessageEvent, type HandQueueEvent, type SessionStatusEvent, type SocketAck } from '@azza/shared';
import { sessionsApi, type ChatMessage } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { getSocket, useSocketEvent } from '@/lib/realtime/socket';

export interface HandEntry {
  userId: string;
  name: string;
  raisedAt?: string;
}

/** Socket.IO side of a live room: chat, hand queue and status broadcasts. */
export function useRoomRealtime(sessionId: string, onStatus?: (e: SessionStatusEvent) => void) {
  const history = useQuery({ queryKey: qk.messages(sessionId), queryFn: () => sessionsApi.messages(sessionId), retry: false });
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [hands, setHands] = useState<HandEntry[]>([]);

  useEffect(() => {
    const s = getSocket();
    const join = () =>
      s.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId }, (res: SocketAck<{ hands?: HandQueueEvent }>) => {
        if (res?.ok && res.data?.hands) setHands(res.data.hands.queue);
      });
    join();
    s.on('connect', join);
    return () => {
      s.emit(SOCKET_EVENTS.LEAVE_SESSION, { sessionId });
      s.off('connect', join);
    };
  }, [sessionId]);

  useSocketEvent<ChatMessageEvent>(SOCKET_EVENTS.CHAT_MESSAGE, (m) => {
    if (m.sessionId === sessionId) setLive((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
  });
  useSocketEvent<{ sessionId: string; queue: HandEntry[] }>(SOCKET_EVENTS.HAND_QUEUE, (e) => {
    if (e.sessionId === sessionId) setHands(e.queue ?? []);
  });
  useSocketEvent<SessionStatusEvent>(SOCKET_EVENTS.SESSION_STATUS, (e) => {
    if (e.sessionId === sessionId) onStatus?.(e);
  });

  const send = useCallback((body: string) => getSocket().emit(SOCKET_EVENTS.SEND_CHAT, { sessionId, body }), [sessionId]);
  const raise = useCallback(() => getSocket().emit(SOCKET_EVENTS.RAISE_HAND, { sessionId }), [sessionId]);
  const lower = useCallback(() => getSocket().emit(SOCKET_EVENTS.LOWER_HAND, { sessionId }), [sessionId]);

  const seen = new Set<string>();
  const messages = [...(history.data ?? []), ...live].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  return { messages, hands, send, raise, lower, historyError: history.error };
}

/**
 * Just the `session:status` feed, for the lobby (before LiveKit): joins the session's socket room
 * so a student waiting for the host hears the moment it goes live.
 */
export function useSessionStatusFeed(sessionId: string, enabled: boolean, onStatus: (e: SessionStatusEvent) => void) {
  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    const join = () => s.emit(SOCKET_EVENTS.JOIN_SESSION, { sessionId });
    join();
    s.on('connect', join);
    return () => {
      s.off('connect', join);
    };
  }, [sessionId, enabled]);
  useSocketEvent<SessionStatusEvent>(
    SOCKET_EVENTS.SESSION_STATUS,
    (e) => {
      if (e.sessionId === sessionId) onStatus(e);
    },
    enabled,
  );
}
