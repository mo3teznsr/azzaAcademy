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
  /** Arabic title and body, used for recipients whose locale is Arabic (in-app, realtime and push). */
  ar?: { title: string; body: string };
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

/** The title and body in the recipient's language: Arabic when the notice has it and the recipient reads Arabic. */
export function localizedText(notice: Notice, recipient: Pick<Recipient, 'locale'>): { title: string; body: string } {
  return notice.ar && recipient.locale.startsWith('ar') ? notice.ar : { title: notice.title, body: notice.body };
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
