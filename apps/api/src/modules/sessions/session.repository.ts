import type { AttendanceMark, BatchStatus, SessionStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';

const coreSelect = {
  id: true,
  batchId: true,
  number: true,
  title: true,
  status: true,
  startsAt: true,
  endsAt: true,
  hostId: true,
  roomName: true,
  egressId: true,
  movedFrom: true,
  startedAt: true,
  endedAt: true,
  recordingUrl: true,
  batch: {
    select: {
      id: true,
      code: true,
      teacherId: true,
      capacity: true,
      timezone: true,
      status: true,
      course: { select: { id: true, titleEn: true, titleAr: true } },
    },
  },
} as const;

export interface SessionUpdate {
  title?: string;
  agenda?: unknown;
  notes?: string;
  status?: SessionStatus;
  startsAt?: Date;
  endsAt?: Date;
  movedFrom?: Date | null;
  moveReason?: string | null;
  startedAt?: Date;
  endedAt?: Date;
  egressId?: string | null;
  recordingUrl?: string;
}

export class PrismaSessionRepository {
  constructor(private readonly db: Db) {}

  findCore(id: string) {
    return this.db.liveSession.findUnique({ where: { id }, select: coreSelect });
  }

  findByRoomName(roomName: string) {
    return this.db.liveSession.findUnique({ where: { roomName }, select: coreSelect });
  }

  findByEgressId(egressId: string) {
    return this.db.liveSession.findFirst({ where: { egressId }, select: coreSelect });
  }

  findDetail(id: string) {
    return this.db.liveSession.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, image: true } },
        materials: { orderBy: { createdAt: 'asc' } },
        assignments: { select: { id: true, title: true, dueAt: true, maxScore: true } },
        batch: {
          select: {
            id: true,
            code: true,
            teacherId: true,
            timezone: true,
            language: true,
            status: true,
            course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverStyle: true, coverImageUrl: true, introVideoUrl: true } },
            teacher: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
  }

  async update(id: string, data: SessionUpdate) {
    const { agenda, ...rest } = data;
    await this.db.liveSession.update({ where: { id }, data: { ...rest, ...(agenda !== undefined && { agenda: agenda as object }) } });
    return this.findCore(id);
  }

  async enrollmentStatus(userId: string, batchId: string) {
    return (await this.db.enrollment.findUnique({ where: { userId_batchId: { userId, batchId } }, select: { status: true } }))?.status ?? null;
  }

  async activeStudentIds(batchId: string) {
    const rows = await this.db.enrollment.findMany({ where: { batchId, status: 'ACTIVE' }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  /** Other non-cancelled sessions of this teacher overlapping [from, to). */
  async teacherOverlaps(teacherId: string, from: Date, to: Date, excludeSessionId: string) {
    return this.db.liveSession.findMany({
      where: {
        id: { not: excludeSessionId },
        status: { not: 'CANCELLED' },
        startsAt: { lt: to },
        endsAt: { gt: from },
        OR: [{ hostId: teacherId }, { batch: { teacherId } }],
      },
      select: { id: true, number: true, startsAt: true, batch: { select: { code: true } } },
    });
  }

  async remainingSessions(batchId: string) {
    return this.db.liveSession.count({ where: { batchId, status: { in: ['SCHEDULED', 'LIVE'] } } });
  }

  async setBatchStatus(batchId: string, status: BatchStatus) {
    await this.db.batch.update({ where: { id: batchId }, data: { status } });
  }

  createMessage(sessionId: string, userId: string, body: string) {
    return this.db.chatMessage.create({
      data: { sessionId, userId, body },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  listMessages(sessionId: string, before: Date | undefined, take: number) {
    return this.db.chatMessage.findMany({
      where: { sessionId, ...(before && { createdAt: { lt: before } }) },
      include: { user: { select: { id: true, name: true, role: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async attendance(sessionId: string, batchId: string) {
    const [students, rows, marks] = await Promise.all([
      this.db.enrollment.findMany({
        where: { batchId, status: 'ACTIVE' },
        select: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      this.db.attendance.findMany({ where: { sessionId }, orderBy: { joinedAt: 'asc' } }),
      this.db.attendanceMark.findMany({ where: { sessionId }, select: { userId: true, mark: true } }),
    ]);
    return { students: students.map((s) => s.user), rows, marks: marks as Array<{ userId: string; mark: AttendanceMark }> };
  }

  /** Upserts corrections; `mark: null` deletes the correction for that student. */
  async saveAttendanceMarks(sessionId: string, items: Array<{ userId: string; mark: AttendanceMark | null }>, markedById: string) {
    await this.db.$transaction(
      items.map(({ userId, mark }) =>
        mark === null
          ? this.db.attendanceMark.deleteMany({ where: { sessionId, userId } })
          : this.db.attendanceMark.upsert({
              where: { sessionId_userId: { sessionId, userId } },
              create: { sessionId, userId, mark, markedById },
              update: { mark, markedById },
            }),
      ),
    );
  }

  async userExists(id: string) {
    return (await this.db.user.count({ where: { id } })) > 0;
  }

  openAttendance(sessionId: string, userId: string, at: Date) {
    return this.db.attendance.create({ data: { sessionId, userId, joinedAt: at } });
  }

  async closeAttendance(sessionId: string, userId: string, at: Date) {
    const open = await this.db.attendance.findFirst({ where: { sessionId, userId, leftAt: null }, orderBy: { joinedAt: 'desc' } });
    if (!open) return null;
    const seconds = Math.max(0, Math.round((at.getTime() - open.joinedAt.getTime()) / 1000));
    return this.db.attendance.update({ where: { id: open.id }, data: { leftAt: at, seconds } });
  }

  /** When a room closes, everyone still marked present leaves at that instant. */
  async closeAllAttendance(sessionId: string, at: Date) {
    const open = await this.db.attendance.findMany({ where: { sessionId, leftAt: null } });
    for (const row of open) {
      const seconds = Math.max(0, Math.round((at.getTime() - row.joinedAt.getTime()) / 1000));
      await this.db.attendance.update({ where: { id: row.id }, data: { leftAt: at, seconds } });
    }
  }

  upsertFeedback(sessionId: string, userId: string, data: { rating: number; tags: string[]; comment?: string }) {
    return this.db.sessionFeedback.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, ...data },
      update: data,
    });
  }
}

export type SessionRepository = PrismaSessionRepository;
export type SessionCore = NonNullable<Awaited<ReturnType<PrismaSessionRepository['findCore']>>>;
