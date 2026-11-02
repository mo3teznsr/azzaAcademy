import type { Role } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { Recipient } from './notification.types';

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationRepository {
  recipients(userIds: string[]): Promise<Recipient[]>;
  userIdsByRole(role: Role): Promise<string[]>;
  insert(rows: Array<{ id: string; userId: string; type: string; title: string; body: string; data?: Record<string, string>; createdAt: Date }>): Promise<void>;
  deviceTokens(userIds: string[]): Promise<string[]>;
  deleteDeviceTokens(tokens: string[]): Promise<void>;
  list(userId: string, skip: number, take: number, unreadOnly: boolean): Promise<{ items: NotificationRow[]; total: number; unread: number }>;
  markRead(userId: string, id: string, at: Date): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<number>;
}

const recipientSelect = { id: true, name: true, email: true, locale: true, timezone: true } as const;

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  recipients(userIds: string[]) {
    if (!userIds.length) return Promise.resolve([]);
    return this.db.user.findMany({ where: { id: { in: userIds }, banned: false }, select: recipientSelect });
  }

  async userIdsByRole(role: Role) {
    const rows = await this.db.user.findMany({ where: { role, banned: false }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async insert(rows: Parameters<NotificationRepository['insert']>[0]) {
    if (rows.length) await this.db.notification.createMany({ data: rows });
  }

  async deviceTokens(userIds: string[]) {
    if (!userIds.length) return [];
    const rows = await this.db.deviceToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } });
    return rows.map((r) => r.token);
  }

  async deleteDeviceTokens(tokens: string[]) {
    if (tokens.length) await this.db.deviceToken.deleteMany({ where: { token: { in: tokens } } });
  }

  async list(userId: string, skip: number, take: number, unreadOnly: boolean) {
    const where = { userId, ...(unreadOnly && { readAt: null }) };
    const [items, total, unread] = await this.db.$transaction([
      this.db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, total, unread };
  }

  async markRead(userId: string, id: string, at: Date) {
    const res = await this.db.notification.updateMany({ where: { id, userId }, data: { readAt: at } });
    return res.count > 0;
  }

  async markAllRead(userId: string, at: Date) {
    const res = await this.db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: at } });
    return res.count;
  }
}
