import type { Role } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { SEAT_HOLDING } from '../payments/enrollment-state';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  locale: true,
  timezone: true,
  image: true,
  banned: true,
  emailVerified: true,
  createdAt: true,
} as const;

export class PrismaAdminRepository {
  constructor(private readonly db: Db) {}

  async dashboardCounts(dayStart: Date, dayEnd: Date, monthStart: Date, soon: Date, now: Date) {
    const [liveSessions, sessionsToday, activeBatches, seatsHeld, transfersToVerify, bankUnverified, heldPayouts, holdsExpiringSoon, revenue] =
      await Promise.all([
        this.db.liveSession.count({ where: { status: 'LIVE' } }),
        this.db.liveSession.findMany({
          where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            startsAt: true,
            endsAt: true,
            movedFrom: true,
            batch: { select: { id: true, code: true, course: { select: { titleEn: true } }, teacher: { select: { id: true, name: true } } } },
          },
        }),
        this.db.batch.findMany({ where: { status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } }, select: { id: true, capacity: true, status: true } }),
        this.db.enrollment.count({ where: { status: { in: SEAT_HOLDING }, batch: { status: { in: ['ENROLLING', 'FULL', 'RUNNING'] } } } }),
        this.db.order.count({ where: { method: 'BANK_TRANSFER', status: { in: ['VERIFYING', 'AMOUNT_MISMATCH'] } } }),
        this.db.teacherBankDetails.count({ where: { verified: false } }),
        this.db.payout.count({ where: { status: 'HELD', run: { status: { in: ['DRAFT', 'APPROVED'] } } } }),
        this.db.order.count({ where: { status: 'AWAITING_RECEIPT', expiresAt: { gte: now, lt: soon } } }),
        this.db.order.aggregate({
          where: { status: { in: ['PAID', 'REFUNDED'] }, paidAt: { gte: monthStart } },
          _sum: { totalFils: true, refundedFils: true, vatFils: true },
          _count: true,
        }),
      ]);
    return { liveSessions, sessionsToday, activeBatches, seatsHeld, transfersToVerify, bankUnverified, heldPayouts, holdsExpiringSoon, revenue };
  }

  async listUsers(f: { role?: Role; q?: string; skip: number; take: number }) {
    const where = {
      ...(f.role && { role: f.role }),
      ...(f.q && {
        OR: [{ name: { contains: f.q, mode: 'insensitive' as const } }, { email: { contains: f.q, mode: 'insensitive' as const } }],
      }),
    };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: { ...userSelect, _count: { select: { enrollments: { where: { status: 'ACTIVE' } }, teaching: true } } },
        orderBy: { createdAt: 'desc' },
        skip: f.skip,
        take: f.take,
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total };
  }

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  }

  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, select: userSelect });
  }

  updateUser(id: string, data: { name?: string; role?: Role; banned?: boolean }) {
    return this.db.user.update({ where: { id }, data, select: userSelect });
  }

  async revokeLogins(userId: string) {
    await this.db.authSession.deleteMany({ where: { userId } });
  }

  sessionsByRoom(roomNames: string[]) {
    return this.db.liveSession.findMany({
      where: { OR: [{ roomName: { in: roomNames } }, { status: 'LIVE' }] },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        roomName: true,
        startsAt: true,
        endsAt: true,
        startedAt: true,
        batch: {
          select: {
            id: true,
            code: true,
            capacity: true,
            course: { select: { titleEn: true, titleAr: true } },
            teacher: { select: { id: true, name: true } },
            _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
          },
        },
      },
    });
  }
}

export type AdminRepository = PrismaAdminRepository;
