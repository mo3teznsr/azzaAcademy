import type { Platform, UpdateProfileInput } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

const profileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  locale: true,
  timezone: true,
  displayCurrency: true,
  phone: true,
  createdAt: true,
} as const;

const sessionInclude = {
  batch: {
    select: {
      id: true,
      code: true,
      language: true,
      timezone: true,
      course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true } },
      teacher: { select: { id: true, name: true, image: true } },
    },
  },
} as const;

export class PrismaMeRepository {
  constructor(private readonly db: Db) {}

  profile(userId: string) {
    return this.db.user.findUnique({ where: { id: userId }, select: profileSelect });
  }

  updateProfile(userId: string, data: UpdateProfileInput) {
    return this.db.user.update({ where: { id: userId }, data, select: profileSelect });
  }

  async counts(userId: string, now: Date, weekAhead: Date) {
    const [activeEnrollments, unreadNotifications, teachingBatches, upcomingSessions] = await this.db.$transaction([
      this.db.enrollment.count({ where: { userId, status: 'ACTIVE' } }),
      this.db.notification.count({ where: { userId, readAt: null } }),
      this.db.batch.count({ where: { teacherId: userId, status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } } }),
      this.db.liveSession.count({
        where: {
          status: { in: ['SCHEDULED', 'LIVE'] },
          startsAt: { gte: now, lt: weekAhead },
          OR: [
            { batch: { enrollments: { some: { userId, status: 'ACTIVE' } } } },
            { hostId: userId },
            { batch: { teacherId: userId } },
          ],
        },
      }),
    ]);
    return { activeEnrollments, unreadNotifications, teachingBatches, upcomingSessions };
  }

  async upsertDevice(userId: string, token: string, platform: Platform) {
    return this.db.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
      select: { id: true, token: true, platform: true, createdAt: true },
    });
  }

  async deleteDevice(userId: string, token: string) {
    return (await this.db.deviceToken.deleteMany({ where: { userId, token } })).count;
  }

  /** `scope` decides which sessions: as a student (active enrollments), as a teacher (hosted) or everything (admin). */
  schedule(userId: string, scope: 'student' | 'teacher' | 'all', from: Date, to: Date) {
    const who =
      scope === 'student'
        ? { batch: { enrollments: { some: { userId, status: 'ACTIVE' as const } } } }
        : scope === 'teacher'
          ? { OR: [{ hostId: userId }, { batch: { teacherId: userId } }] }
          : {};
    return this.db.liveSession.findMany({
      where: { ...who, startsAt: { gte: from, lt: to } },
      include: sessionInclude,
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
  }

  async enrollments(userId: string, now: Date) {
    const rows = await this.db.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        batch: {
          select: {
            id: true,
            code: true,
            status: true,
            language: true,
            timezone: true,
            startsOn: true,
            endsOn: true,
            capacity: true,
            course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, category: true } },
            teacher: { select: { id: true, name: true, image: true } },
            schedule: { select: { weekdays: true, startTime: true, durationMin: true, sessionCount: true } },
            sessions: {
              where: { status: { not: 'CANCELLED' } },
              select: { id: true, number: true, title: true, startsAt: true, endsAt: true, status: true },
              orderBy: { number: 'asc' },
            },
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, reference: true, status: true, method: true, totalFils: true, expiresAt: true, createdAt: true },
        },
      },
    });
    const attended = await this.db.attendance.groupBy({
      by: ['sessionId'],
      where: { userId, session: { batchId: { in: rows.map((r) => r.batchId) } } },
    });
    const attendedIds = new Set(attended.map((a) => a.sessionId));

    return rows.map(({ batch, orders, ...e }) => {
      const { sessions, ...batchRest } = batch;
      const done = sessions.filter((s) => s.status === 'ENDED');
      const next = sessions.find((s) => s.status !== 'ENDED' && s.endsAt > now) ?? null;
      return {
        ...e,
        batch: batchRest,
        latestOrder: orders[0] ?? null,
        nextSession: next,
        progress: {
          sessionsDone: done.length,
          sessionsTotal: sessions.length,
          sessionsAttended: done.filter((s) => attendedIds.has(s.id)).length,
          percent: sessions.length ? Math.round((done.length / sessions.length) * 100) : 0,
        },
      };
    });
  }
}

export type MeRepository = PrismaMeRepository;
