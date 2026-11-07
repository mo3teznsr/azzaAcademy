// Socket.IO event contract. Rooms: `user:<id>`, `session:<id>`, `role:ADMIN`.

export const SOCKET_EVENTS = {
  // client → server
  JOIN_SESSION: 'session:join',
  LEAVE_SESSION: 'session:leave',
  SEND_CHAT: 'chat:send',
  RAISE_HAND: 'hand:raise',
  LOWER_HAND: 'hand:lower',
  // server → client
  CHAT_MESSAGE: 'chat:message',
  HAND_QUEUE: 'hand:queue',
  SESSION_STATUS: 'session:status',
  NOTIFICATION: 'notification:new',
  ORDER_UPDATED: 'order:updated',
  ROOM_STATS: 'admin:room-stats',
  CONVERSATION_MESSAGE: 'conversation:message',
  CONVERSATION_MESSAGE_DELETED: 'conversation:message-deleted',
} as const;

export interface ChatMessageEvent {
  id: string;
  sessionId: string;
  user: { id: string; name: string; role: string };
  body: string;
  createdAt: string;
}

export interface SessionStatusEvent {
  sessionId: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  startedAt?: string;
  endedAt?: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt: string;
}

/** Client → server payloads. Every client event accepts an optional ack callback `(res: SocketAck) => void`. */
export interface SessionRefPayload {
  sessionId: string;
}
export interface ChatSendPayload {
  sessionId: string;
  body: string;
}
export type SocketAck<T = unknown> = { ok: true; data?: T } | { ok: false; error: { code: string; message: string } };

export interface HandQueueEvent {
  sessionId: string;
  queue: Array<{ userId: string; name: string; raisedAt: string }>;
}

export interface OrderUpdatedEvent {
  orderId: string;
  reference: string;
  status: string;
}

/** A message of a class or private chat (`GET /conversations/:id/messages` items). Deleted ones have `body: ''`. */
export interface ConversationMessageDto {
  id: string;
  sender: { id: string; name: string; image: string | null; role: 'STUDENT' | 'TEACHER' | 'ADMIN' };
  body: string;
  createdAt: string;
  deleted: boolean;
}

/** `conversation:message`, sent to every member except the sender. */
export interface ConversationMessageEvent {
  conversationId: string;
  message: ConversationMessageDto;
}

/** `conversation:message-deleted` */
export interface ConversationMessageDeletedEvent {
  conversationId: string;
  messageId: string;
}
