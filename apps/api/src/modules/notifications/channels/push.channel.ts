import type { PushNotifier } from '../../../core/ports';
import type { NotificationRepository } from '../notification.repository';
import type { Delivery, NotificationChannel } from '../notification.types';

/** FCM push to every registered device; tokens Firebase reports as dead are deleted. */
export class PushChannel implements NotificationChannel {
  readonly name = 'push' as const;
  constructor(
    private readonly push: PushNotifier,
    private readonly repo: NotificationRepository,
  ) {}

  async deliver(deliveries: Delivery[]) {
    for (const d of deliveries) {
      const tokens = await this.repo.deviceTokens([d.recipient.id]);
      if (!tokens.length) continue;
      const { invalidTokens } = await this.push.send({
        tokens,
        title: d.notice.title,
        body: d.notice.body,
        data: { type: d.notice.type, notificationId: d.id, ...d.notice.data },
      });
      await this.repo.deleteDeviceTokens(invalidTokens);
    }
  }
}
