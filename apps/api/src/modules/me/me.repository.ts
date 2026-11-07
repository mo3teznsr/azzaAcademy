import type { Platform, UpdateProfileInput } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { deletedEmail } from './account-deletion';

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
  headline: true,
  bio: true,
  createdAt: true,
} as const;

const sessionInclude = {
  batch: {
    select: {
      id: true,
      code: true,
      language: true,
      timezone: true,
      course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, introVideoUrl: true } },
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

  setImage(userId: string, image: string) {
    return this.db.user.update({ where: { id: userId }, data: { image }, select: profileSelect });
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

  /** Inputs for `canDeleteAccount`. */
  async deletionFacts(userId: string, now: Date) {
    const [activeBatches, upcomingHosted, earnings, payouts, ordersUnderReview] = await this.db.$transaction([
      this.db.batch.count({ where: { teacherId: userId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.db.liveSession.count({ where: { hostId: userId, status: { in: ['SCHEDULED', 'LIVE'] }, endsAt: { gt: now } } }),
      this.db.earning.count({ where: { teacherId: userId, status: { in: ['PENDING', 'AVAILABLE'] } } }),
      this.db.payout.count({ where: { teacherId: userId, status: { in: ['READY', 'HELD'] } } }),
      this.db.order.count({ where: { userId, status: { in: ['VERIFYING', 'AMOUNT_MISMATCH'] } } }),
    ]);
    return { activeTeaching: activeBatches + upcomingHosted, unpaidEarnings: earnings + payouts, ordersUnderReview };
  }

  /**
   * Erases the account in one transaction. The `user` row itself is kept as an anonymous tombstone:
   * orders, earnings and payouts reference it without cascade (and `Enrollment → Order` cascades), so a
   * hard delete would either fail or destroy accounting records. Everything personal is removed or blanked;
   * attendance rows stay (session counts, teacher reports) but point at the tombstone only.
   * Returns the batches whose seats were freed so the caller can promote their waitlists.
   */
  async eraseAccount(userId: string) {
    return this.db.$transaction(async (tx) => {
      const held = await tx.enrollment.findMany({
        where: { userId, status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'AWAITING_TRANSFER', 'VERIFYING', 'WAITLISTED'] } },
        select: { batchId: true },
      });
      await tx.enrollment.updateMany({ where: { userId, status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'AWAITING_TRANSFER', 'VERIFYING', 'WAITLISTED'] } }, data: { status: 'CANCELLED' } });
      // Unpaid holds can never complete now; paid/refunded/failed orders are kept for accounting.
      await tx.order.updateMany({ where: { userId, status: { in: ['AWAITING_PAYMENT', 'AWAITING_RECEIPT'] } }, data: { status: 'EXPIRED' } });

      await tx.authSession.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      // better-auth keys verification rows by the address, password-reset rows carry the user id as value.
      const { email } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
      await tx.verification.deleteMany({ where: { OR: [{ identifier: email }, { value: userId }] } });
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.teacherBankDetails.deleteMany({ where: { userId } });
      await tx.chatMessage.deleteMany({ where: { userId } });
      await tx.sessionFeedback.deleteMany({ where: { userId } });
      await tx.submission.deleteMany({ where: { userId } });
      await tx.quizAttempt.deleteMany({ where: { userId } });
      // Chat: their messages everywhere, their private chats (with the teacher's replies) and read markers.
      await tx.message.deleteMany({ where: { senderId: userId } });
      await tx.conversation.deleteMany({ where: { studentId: userId } });
      await tx.conversationRead.deleteMany({ where: { userId } });
      // Support: their tickets (messages cascade) and anything they wrote elsewhere.
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.supportMessage.deleteMany({ where: { authorId: userId } });
      await tx.certificate.deleteMany({ where: { userId } });
      await tx.rescheduleRequest.deleteMany({ where: { requestedById: userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted user',
          email: deletedEmail(userId),
          emailVerified: false,
          image: null,
          phone: null,
          headline: null,
          bio: null,
          role: 'STUDENT',
          banned: true,
        },
      });
      return [...new Set(held.map((e) => e.batchId))];
    });
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
            course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, introVideoUrl: true, category: true } },
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
