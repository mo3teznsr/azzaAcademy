import type { NotificationRepository } from '../notification.repository';
import { localizedText, type Delivery, type NotificationChannel } from '../notification.types';

/** Persists the notification feed shown in the app (bell icon). */
export class InAppChannel implements NotificationChannel {
  readonly name = 'in-app' as const;
  constructor(private readonly repo: NotificationRepository) {}

  async deliver(deliveries: Delivery[]) {
    await this.repo.insert(
      deliveries.map((d) => ({
        id: d.id,
        userId: d.recipient.id,
        type: d.notice.type,
        ...localizedText(d.notice, d.recipient),
        data: d.notice.data,
        createdAt: d.createdAt,
      })),
    );
  }
}
