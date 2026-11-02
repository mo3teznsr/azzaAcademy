'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api/client';

let socket: Socket | null = null;

/** One shared Socket.IO connection (cookie auth, path /socket.io). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void, enabled = true) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    const fn = (payload: T) => ref.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event, enabled]);
}
