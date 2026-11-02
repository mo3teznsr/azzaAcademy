import { SOCKET_EVENTS, type NotificationEvent } from '@azza/shared';
import type { RealtimeBroadcaster } from '../../../core/ports';
import type { Delivery, NotificationChannel } from '../notification.types';

/** Pushes `notification:new` to every open socket of the recipient. */
export class RealtimeChannel implements NotificationChannel {
  readonly name = 'realtime' as const;
  constructor(private readonly realtime: RealtimeBroadcaster) {}

  async deliver(deliveries: Delivery[]) {
    for (const d of deliveries) {
      const event: NotificationEvent = {
        id: d.id,
        type: d.notice.type,
        title: d.notice.title,
        body: d.notice.body,
        data: d.notice.data,
        createdAt: d.createdAt.toISOString(),
      };
      this.realtime.toUser(d.recipient.id, SOCKET_EVENTS.NOTIFICATION, event);
    }
  }
}
