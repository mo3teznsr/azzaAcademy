import type { Role } from '@azza/shared';

export interface Recipient {
  id: string;
  name: string;
  email: string;
  locale: string;
  timezone: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

/** What happened, independent of how it is delivered. */
export interface Notice {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Per-recipient email body; omit (or return null) to skip email for this notice. */
  email?: (recipient: Recipient) => EmailContent | null;
}

/** One notice for one recipient. `id` is shared by every channel so in-app rows and socket events match. */
export interface Delivery {
  id: string;
  recipient: Recipient;
  notice: Notice;
  createdAt: Date;
}

export type ChannelName = 'in-app' | 'realtime' | 'email' | 'push';

/** Open/closed: a new channel (SMS, WhatsApp…) is a new class, NotificationService never changes. */
export interface NotificationChannel {
  readonly name: ChannelName;
  deliver(deliveries: Delivery[]): Promise<void>;
}

export interface NotifyOptions {
  /** Restrict delivery to these channels (default: all registered). */
  channels?: ChannelName[];
}

/** The narrow port other modules depend on (ISP). */
export interface Notifier {
  notify(userIds: string[], notice: Notice, opts?: NotifyOptions): Promise<void>;
  notifyRole(role: Role, notice: Notice, opts?: NotifyOptions): Promise<void>;
}
