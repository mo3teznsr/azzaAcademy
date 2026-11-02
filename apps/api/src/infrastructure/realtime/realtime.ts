import type { Server } from 'socket.io';
import type { RealtimeBroadcaster } from '../../core/ports';

export const rooms = {
  user: (id: string) => `user:${id}`,
  session: (id: string) => `session:${id}`,
  role: (role: string) => `role:${role}`,
};

export class SocketIoBroadcaster implements RealtimeBroadcaster {
  private io: Server | null = null;

  /** Late-bound: the HTTP server (and so Socket.IO) is created after the container. */
  attach(io: Server) {
    this.io = io;
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.io?.to(rooms.user(userId)).emit(event, payload);
  }
  toSession(sessionId: string, event: string, payload: unknown) {
    this.io?.to(rooms.session(sessionId)).emit(event, payload);
  }
  toRole(role: string, event: string, payload: unknown) {
    this.io?.to(rooms.role(role)).emit(event, payload);
  }
}
