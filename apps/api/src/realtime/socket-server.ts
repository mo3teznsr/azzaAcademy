import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { Container } from '../container';
import { rooms } from '../infrastructure/realtime/realtime';
import { registerClassroomHandlers } from './classroom-handlers';

/**
 * Socket.IO shares the HTTP server with Hono and the auth session: the handshake
 * carries the same cookie (web) or `auth.token` bearer (mobile).
 */
export function attachSocketServer(httpServer: HttpServer, container: Container) {
  const { auth, config, adapters, services } = container;
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: config.trustedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const headers = new Headers();
    const cookie = socket.handshake.headers.cookie;
    if (cookie) headers.set('cookie', cookie);
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (token) headers.set('authorization', `Bearer ${token}`);

    const session = await auth.api.getSession({ headers }).catch(() => null);
    if (!session) return next(new Error('UNAUTHORIZED'));
    if ((session.user as { banned?: boolean }).banned) return next(new Error('UNAUTHORIZED'));
    socket.data.user = { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role };
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; role: string };
    socket.join(rooms.user(user.id));
    socket.join(rooms.role(user.role));
    registerClassroomHandlers(socket, services.sessions);
  });

  adapters.realtime.attach(io);
  return io;
}
