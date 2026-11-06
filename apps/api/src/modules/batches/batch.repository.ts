import type { BatchStatus, SessionLanguage } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import type { PlannedSession } from './schedule-generator';

export interface BatchFilter {
  courseId?: string;
  teacherId?: string;
  status?: BatchStatus;
  statuses?: BatchStatus[];
  language?: SessionLanguage;
  skip: number;
  take: number;
}

export interface NewBatchData {
  courseId: string;
  code: string;
  teacherId: string;
  capacity: number;
  language: SessionLanguage;
  timezone: string;
  priceFils?: number;
  waitlistEnabled: boolean;
  minStudents: number;
  enrollmentOpensOn?: Date;
  enrollmentClosesOn?: Date;
  startsOn: Date;
  endsOn: Date;
  rule: { weekdays: number[]; startTime: string; durationMin: number; sessionCount: number; skipDates: string[] };
  sessions: Array<PlannedSession & { title: string }>;
}

export type BatchUpdateData = Partial<
  Pick<NewBatchData, 'code' | 'teacherId' | 'capacity' | 'language' | 'timezone' | 'priceFils' | 'waitlistEnabled' | 'minStudents' | 'enrollmentOpensOn' | 'enrollmentClosesOn'>
> & { status?: BatchStatus; reviewNote?: string | null; submittedAt?: Date | null };

export interface TeacherBusySlot {
  sessionId: string;
  batchCode: string;
  startsAt: Date;
  endsAt: Date;
}

const summary = {
  course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, introVideoUrl: true, priceFils: true, category: true } },
  teacher: { select: { id: true, name: true, image: true } },
  schedule: true,
  _count: { select: { enrollments: { where: { status: 'ACTIVE' as const } }, sessions: true } },
};

export class PrismaBatchRepository {
  constructor(private readonly db: Db) {}

  async list(f: BatchFilter) {
    const where = {
      ...(f.courseId && { courseId: f.courseId }),
      ...(f.teacherId && { teacherId: f.teacherId }),
      ...(f.language && { language: f.language }),
      ...(f.status ? { status: f.status } : f.statuses ? { status: { in: f.statuses } } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.batch.findMany({ where, include: summary, skip: f.skip, take: f.take, orderBy: { startsOn: 'asc' } }),
      this.db.batch.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.db.batch.findUnique({
      where: { id },
      include: { ...summary, sessions: { orderBy: { number: 'asc' } } },
    });
  }

  existsCode(courseId: string, code: string) {
    return this.db.batch.findUnique({ where: { courseId_code: { courseId, code } }, select: { id: true } });
  }

  create(d: NewBatchData) {
    return this.db.batch.create({
      data: {
        courseId: d.courseId,
        code: d.code,
        teacherId: d.teacherId,
        capacity: d.capacity,
        language: d.language,
        timezone: d.timezone,
        priceFils: d.priceFils,
        waitlistEnabled: d.waitlistEnabled,
        minStudents: d.minStudents,
        enrollmentOpensOn: d.enrollmentOpensOn,
        enrollmentClosesOn: d.enrollmentClosesOn,
        startsOn: d.startsOn,
        endsOn: d.endsOn,
        schedule: { create: d.rule },
        sessions: {
          create: d.sessions.map((s) => ({
            number: s.number,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            hostId: d.teacherId,
            roomName: `${d.code.toLowerCase()}-s${String(s.number).padStart(2, '0')}-${crypto.randomUUID().slice(0, 8)}`,
          })),
        },
      },
      include: { ...summary, sessions: { orderBy: { number: 'asc' } } },
    });
  }

  update(id: string, data: BatchUpdateData) {
    return this.db.batch.update({ where: { id }, data, include: summary });
  }

  activeEnrollmentCount(batchId: string) {
    return this.db.enrollment.count({ where: { batchId, status: { in: ['ACTIVE', 'AWAITING_TRANSFER', 'VERIFYING', 'PENDING_PAYMENT'] } } });
  }

  /** Teacher's sessions overlapping [from, to) — used for conflict detection. */
  async teacherBusy(teacherId: string, from: Date, to: Date, excludeBatchId?: string): Promise<TeacherBusySlot[]> {
    const rows = await this.db.liveSession.findMany({
      where: {
        status: { not: 'CANCELLED' },
        startsAt: { lt: to },
        endsAt: { gt: from },
        OR: [{ hostId: teacherId }, { batch: { teacherId } }],
        ...(excludeBatchId && { batchId: { not: excludeBatchId } }),
      },
      select: { id: true, startsAt: true, endsAt: true, batch: { select: { code: true } } },
    });
    return rows.map((r) => ({ sessionId: r.id, batchCode: r.batch.code, startsAt: r.startsAt, endsAt: r.endsAt }));
  }

  async roster(batchId: string) {
    const [enrollments, ended] = await Promise.all([
      this.db.enrollment.findMany({
        where: { batchId, status: 'ACTIVE' },
        include: { user: { select: { id: true, name: true, email: true, image: true, phone: true, locale: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      this.db.liveSession.findMany({ where: { batchId, status: 'ENDED' }, select: { id: true } }),
    ]);
    const sessionIds = ended.map((s) => s.id);
    const [attendance, marks] = ended.length
      ? await Promise.all([
          this.db.attendance.groupBy({
            by: ['userId', 'sessionId'],
            where: { sessionId: { in: sessionIds } },
            _sum: { seconds: true },
          }),
          this.db.attendanceMark.findMany({ where: { sessionId: { in: sessionIds } }, select: { userId: true, sessionId: true, mark: true } }),
        ])
      : [[], []];
    return { enrollments, endedSessions: ended.length, attendance, marks };
  }

  enrollments(batchId: string) {
    return this.db.enrollment.findMany({
      where: { batchId },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        orders: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, reference: true, method: true, status: true, totalFils: true, refundedFils: true, paidAt: true, createdAt: true },
        },
      },
    });
  }

  scheduledFrom(batchId: string, fromNumber: number) {
    return this.db.liveSession.findMany({
      where: { batchId, number: { gte: fromNumber }, status: 'SCHEDULED' },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, startsAt: true, endsAt: true },
    });
  }

  async applyShift(batchId: string, moves: Array<{ id: string; startsAt: Date; endsAt: Date; movedFrom: Date }>, reason: string) {
    await this.db.$transaction(async (tx) => {
      for (const m of moves) {
        const current = await tx.liveSession.findUnique({ where: { id: m.id }, select: { movedFrom: true } });
        await tx.liveSession.update({
          where: { id: m.id },
          data: { startsAt: m.startsAt, endsAt: m.endsAt, movedFrom: current?.movedFrom ?? m.movedFrom, moveReason: reason },
        });
      }
      const bounds = await tx.liveSession.aggregate({
        where: { batchId, status: { not: 'CANCELLED' } },
        _min: { startsAt: true },
        _max: { endsAt: true },
      });
      if (bounds._min.startsAt && bounds._max.endsAt) {
        await tx.batch.update({ where: { id: batchId }, data: { startsOn: bounds._min.startsAt, endsOn: bounds._max.endsAt } });
      }
    });
    return this.findById(batchId);
  }

  async activeStudentIds(batchId: string) {
    return (await this.db.enrollment.findMany({ where: { batchId, status: 'ACTIVE' }, select: { userId: true } })).map((e) => e.userId);
  }
}

export type BatchRepository = PrismaBatchRepository;
