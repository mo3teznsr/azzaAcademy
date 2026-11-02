import type { Role } from '@azza/shared';
import { NotFoundError } from '../../core/errors';
import type { Clock } from '../../core/ports';
import type { NotificationRepository } from './notification.repository';
import type { Delivery, Notice, NotificationChannel, Notifier, NotifyOptions } from './notification.types';

/**
 * Composes delivery channels. Each channel is isolated: a failing SMTP server never
 * blocks the in-app row or the push (failures are logged, not thrown).
 */
export class NotificationService implements Notifier {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly channels: NotificationChannel[],
    private readonly clock: Clock,
  ) {}

  async notify(userIds: string[], notice: Notice, opts: NotifyOptions = {}) {
    const recipients = await this.repo.recipients([...new Set(userIds)]);
    if (!recipients.length) return;
    const createdAt = this.clock.now();
    const deliveries: Delivery[] = recipients.map((recipient) => ({ id: crypto.randomUUID(), recipient, notice, createdAt }));
    const channels = opts.channels ? this.channels.filter((c) => opts.channels!.includes(c.name)) : this.channels;

    // in-app first so a socket event never points at a row that doesn't exist yet
    const ordered = [...channels].sort((a, b) => Number(b.name === 'in-app') - Number(a.name === 'in-app'));
    for (const channel of ordered) {
      try {
        await channel.deliver(deliveries);
      } catch (err) {
        console.error(`[notify] ${channel.name} failed for ${notice.type}`, err);
      }
    }
  }

  async notifyRole(role: Role, notice: Notice, opts?: NotifyOptions) {
    await this.notify(await this.repo.userIdsByRole(role), notice, opts);
  }

  list(userId: string, page: number, pageSize: number, unreadOnly = false) {
    return this.repo.list(userId, (page - 1) * pageSize, pageSize, unreadOnly);
  }

  async markRead(userId: string, id: string) {
    if (!(await this.repo.markRead(userId, id, this.clock.now()))) throw new NotFoundError('Notification', id);
    return { ok: true };
  }

  async markAllRead(userId: string) {
    return { updated: await this.repo.markAllRead(userId, this.clock.now()) };
  }
}
