import type { Mailer } from '../../../core/ports';
import type { Delivery, NotificationChannel } from '../notification.types';

/** Sends the notice's email body (if it has one) through the Mailer port. */
export class EmailChannel implements NotificationChannel {
  readonly name = 'email' as const;
  constructor(private readonly mailer: Mailer) {}

  async deliver(deliveries: Delivery[]) {
    await Promise.all(
      deliveries.map(async (d) => {
        const content = d.notice.email?.(d.recipient);
        if (!content) return;
        await this.mailer.send({ to: d.recipient.email, ...content });
      }),
    );
  }
}
