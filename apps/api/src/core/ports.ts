// Ports (interfaces) that services depend on. Adapters in src/infrastructure implement them,
// so swapping Stripe, LiveKit, SMTP or Firebase never touches business logic (DIP).

export interface Clock {
  now(): Date;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}
export interface PushNotifier {
  send(message: PushMessage): Promise<{ invalidTokens: string[] }>;
}

export interface RealtimeBroadcaster {
  toUser(userId: string, event: string, payload: unknown): void;
  toSession(sessionId: string, event: string, payload: unknown): void;
  toRole(role: 'STUDENT' | 'TEACHER' | 'ADMIN', event: string, payload: unknown): void;
}

export interface VideoGrant {
  roomName: string;
  identity: string;
  name: string;
  canPublish: boolean;
  canPublishData: boolean;
  isHost: boolean;
  /** Invisible to other participants (admin observers). */
  hidden?: boolean;
  metadata?: string;
}
export interface RoomInfo {
  name: string;
  numParticipants: number;
  createdAt: Date | null;
  recording: boolean;
}
export interface VideoWebhookEvent {
  event: string;
  roomName?: string;
  participantIdentity?: string;
  egressId?: string;
  fileUrl?: string;
  at: Date;
}
export interface VideoProvider {
  readonly serverUrl: string;
  createJoinToken(grant: VideoGrant): Promise<string>;
  ensureRoom(roomName: string, opts: { emptyTimeoutSec: number; maxParticipants: number }): Promise<void>;
  listRooms(): Promise<RoomInfo[]>;
  closeRoom(roomName: string): Promise<void>;
  muteParticipant(roomName: string, identity: string): Promise<void>;
  removeParticipant(roomName: string, identity: string): Promise<void>;
  /** Grant/revoke publish (camera + mic) rights for a participant already in the room. */
  setCanPublish(roomName: string, identity: string, canPublish: boolean): Promise<void>;
  startRecording(roomName: string): Promise<{ egressId: string }>;
  stopRecording(egressId: string): Promise<void>;
  parseWebhook(rawBody: string, authHeader: string | undefined): Promise<VideoWebhookEvent>;
}

export interface CreatePaymentIntentArgs {
  amountFils: number; // AED minor units — always AED
  reference: string;
  customerEmail: string;
  metadata: Record<string, string>;
}
export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
}
export interface PaymentWebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'ignored';
  paymentIntentId?: string;
  feeFils?: number;
}
export interface PaymentGateway {
  createPaymentIntent(args: CreatePaymentIntentArgs): Promise<PaymentIntentResult>;
  refund(paymentIntentId: string, amountFils: number): Promise<void>;
  parseWebhook(rawBody: string, signature: string | undefined): Promise<PaymentWebhookEvent>;
}

export interface StoredFile {
  /** Storage key, e.g. `receipts/3f9c….pdf` — safe to put in a URL path. */
  key: string;
  /** Absolute public URL the file is served from. */
  url: string;
}
export interface FileStorage {
  save(file: { folder: string; extension: string; contentType: string; bytes: Uint8Array }): Promise<StoredFile>;
  /** `null` when the key is unknown or malformed. */
  read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}
