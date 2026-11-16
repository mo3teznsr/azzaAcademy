import type { AttendanceMark, BatchStatus, OrganizationInput, OrganizationRole, SessionStatus } from '@azza/shared';
import type { Db } from '../../infrastructure/db';
import { SEAT_PACK_LIVE, type SeatPackStatus } from './seat-pack-policy';

export interface OrganizationRecord {
  id: string;
  name: string;
  legalName: string;
  trn: string | null;
  address: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  billingEmail: string;
  createdAt: Date;
}

export interface MemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  user: { id: string; name: string; email: string };
  createdAt: Date;
}

export interface PackBatch {
  id: string;
  code: string;
  status: BatchStatus;
  capacity: number;
  startsOn: Date;
  firstSessionAt: Date | null;
  courseTitle: string;
}

export interface PackCourse {
  id: string;
  titleEn: string;
  titleAr: string | null;
  type: 'LIVE' | 'RECORDED';
}

export interface SeatPackRecord {
  id: string;
  reference: string;
  organizationId: string;
  batchId: string | null;
  courseId: string | null;
  seats: number;
  /** ACTIVE assignments. */
  used: number;
  unitPriceFils: number;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  refundedFils: number;
  status: SeatPackStatus;
  paymentReference: string | null;
  paidAt: Date | null;
  invoicedAt: Date;
  accessEndsAt: Date | null;
  note: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  /** "Course · class code" for live packs, the course title for recorded ones. */
  title: string;
  batchCode: string | null;
}

export interface NewSeatPack {
  reference: string;
  organizationId: string;
  batchId: string | null;
  courseId: string | null;
  seats: number;
  unitPriceFils: number;
  subtotalFils: number;
  discountFils: number;
  vatFils: number;
  totalFils: number;
  status: SeatPackStatus;
  paymentReference: string | null;
  paidAt: Date | null;
  invoicedAt: Date;
  accessEndsAt: Date | null;
  note: string | null;
  createdById: string | null;
}

export type SeatPackPatch = Partial<Pick<SeatPackRecord, 'status' | 'paymentReference' | 'paidAt' | 'refundedFils' | 'cancelledAt'>>;

export interface AssignmentRecord {
  id: string;
  seatPackId: string;
  userId: string;
  user: { id: string; name: string; email: string };
  enrollmentId: string | null;
  subscriptionId: string | null;
  status: 'ACTIVE' | 'REVOKED';
  assignedAt: Date;
  revokedAt: Date | null;
}

/** Raw data for the organization report: active seats with what the learner did. */
export interface ReportData {
  live: {
    learner: { id: string; name: string; email: string };
    packReference: string;
    title: string;
    code: string;
    batchId: string;
    batchStatus: BatchStatus;
    sessions: { id: string; status: SessionStatus }[];
    certificateCode: string | null;
  }[];
  recorded: {
    learner: { id: string; name: string; email: string };
    packReference: string;
    title: string;
    lessonIds: string[];
    completedLessonIds: string[];
    certificateCode: string | null;
  }[];
  joins: { userId: string; sessionId: string }[];
  marks: { userId: string; sessionId: string; mark: AttendanceMark }[];
}

export interface OrganizationRepository {
  createOrganization(input: OrganizationInput): Promise<OrganizationRecord>;
  updateOrganization(id: string, input: OrganizationInput): Promise<OrganizationRecord>;
  findOrganization(id: string): Promise<OrganizationRecord | null>;
  listOrganizations(q: string | undefined, skip: number, take: number): Promise<{ items: (OrganizationRecord & { members: number; packs: number })[]; total: number }>;

  findUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null>;
  members(organizationId: string): Promise<MemberRecord[]>;
  findMember(organizationId: string, userId: string): Promise<MemberRecord | null>;
  upsertMember(organizationId: string, userId: string, role: OrganizationRole): Promise<MemberRecord>;
  removeMember(organizationId: string, userId: string): Promise<void>;
  /** Organizations the user manages. */
  managedBy(userId: string): Promise<OrganizationRecord[]>;

  findBatch(batchId: string): Promise<PackBatch | null>;
  findCourse(courseId: string): Promise<PackCourse | null>;

  referenceExists(reference: string): Promise<boolean>;
  createPack(data: NewSeatPack): Promise<SeatPackRecord>;
  findPack(id: string): Promise<SeatPackRecord | null>;
  packsOf(organizationId: string): Promise<SeatPackRecord[]>;
  updatePack(id: string, patch: SeatPackPatch): Promise<SeatPackRecord>;

  assignments(seatPackId: string): Promise<AssignmentRecord[]>;
  findAssignment(id: string): Promise<AssignmentRecord | null>;
  findActiveAssignment(seatPackId: string, userId: string): Promise<AssignmentRecord | null>;
  /**
   * Takes one seat of a live pack for the learner, atomically: null when the pack has no seat left (or is not live).
   * Two managers assigning the last seat at once cannot both get it.
   */
  claimSeat(seatPackId: string, userId: string, assignedById: string | null): Promise<AssignmentRecord | null>;
  /** Undoes a claim whose enrollment or access could not be created. */
  dropClaim(assignmentId: string): Promise<void>;
  linkAssignment(id: string, link: { enrollmentId?: string; subscriptionId?: string }): Promise<void>;
  revokeAssignment(id: string, revokedById: string | null, at: Date): Promise<void>;

  /** The learner can read the recorded course now through a plan of their own (or another seat). */
  hasLivePlan(userId: string, courseId: string, now: Date): Promise<boolean>;
  createSeatSubscription(userId: string, courseId: string, endsAt: Date): Promise<string>;
  endSeatSubscription(subscriptionId: string, at: Date): Promise<void>;
  /** Job: ORGANIZATION subscriptions past their end → EXPIRED. */
  expireSeatSubscriptions(now: Date): Promise<number>;
  completedLessons(userId: string, courseId: string): Promise<number>;

  enrollmentOf(enrollmentId: string): Promise<{ id: string; userId: string; batchId: string; status: import('@azza/shared').EnrollmentStatus; updatedAt: Date } | null>;

  reportData(organizationId: string): Promise<ReportData>;
}

const orgSelect = {
  id: true, name: true, legalName: true, trn: true, address: true, contactName: true, contactEmail: true, contactPhone: true, billingEmail: true, createdAt: true,
} as const;

const memberSelect = { id: true, organizationId: true, userId: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } } as const;

const packSelect = {
  id: true, reference: true, organizationId: true, batchId: true, courseId: true, seats: true, unitPriceFils: true, subtotalFils: true,
  discountFils: true, vatFils: true, totalFils: true, refundedFils: true, status: true, paymentReference: true, paidAt: true, invoicedAt: true,
  accessEndsAt: true, note: true, cancelledAt: true, createdAt: true,
  batch: { select: { code: true, course: { select: { titleEn: true } } } },
  course: { select: { titleEn: true } },
  _count: { select: { assignments: { where: { status: 'ACTIVE' as const } } } },
} as const;

type PackRow = {
  batch: { code: string; course: { titleEn: string } } | null;
  course: { titleEn: string } | null;
  _count: { assignments: number };
} & Omit<SeatPackRecord, 'used' | 'title' | 'batchCode'>;

const toPack = ({ batch, course, _count, ...p }: PackRow): SeatPackRecord => ({
  ...p,
  used: _count.assignments,
  title: batch ? `${batch.course.titleEn} · ${batch.code}` : (course?.titleEn ?? ''),
  batchCode: batch?.code ?? null,
});

const assignmentSelect = {
  id: true, seatPackId: true, userId: true, enrollmentId: true, subscriptionId: true, status: true, assignedAt: true, revokedAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: Db) {}

  createOrganization(input: OrganizationInput) {
    return this.db.organization.create({ data: input, select: orgSelect });
  }

  updateOrganization(id: string, input: OrganizationInput) {
    return this.db.organization.update({ where: { id }, data: input, select: orgSelect });
  }

  findOrganization(id: string) {
    return this.db.organization.findUnique({ where: { id }, select: orgSelect });
  }

  async listOrganizations(q: string | undefined, skip: number, take: number) {
    const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { legalName: { contains: q, mode: 'insensitive' as const } }] } : {};
    const [rows, total] = await this.db.$transaction([
      this.db.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { ...orgSelect, _count: { select: { members: true, seatPacks: true } } },
      }),
      this.db.organization.count({ where }),
    ]);
    return { items: rows.map(({ _count, ...o }) => ({ ...o, members: _count.members, packs: _count.seatPacks })), total };
  }

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, name: true, email: true } });
  }

  members(organizationId: string) {
    return this.db.organizationMember.findMany({ where: { organizationId }, orderBy: [{ role: 'desc' }, { createdAt: 'asc' }], select: memberSelect });
  }

  findMember(organizationId: string, userId: string) {
    return this.db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } }, select: memberSelect });
  }

  upsertMember(organizationId: string, userId: string, role: OrganizationRole) {
    return this.db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, role },
      update: { role },
      select: memberSelect,
    });
  }

  async removeMember(organizationId: string, userId: string) {
    await this.db.organizationMember.deleteMany({ where: { organizationId, userId } });
  }

  managedBy(userId: string) {
    return this.db.organization.findMany({ where: { members: { some: { userId, role: 'MANAGER' } } }, orderBy: { name: 'asc' }, select: orgSelect });
  }

  async findBatch(batchId: string) {
    const b = await this.db.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true, code: true, status: true, capacity: true, startsOn: true,
        course: { select: { titleEn: true } },
        sessions: { where: { status: { not: 'CANCELLED' } }, orderBy: { startsAt: 'asc' }, take: 1, select: { startsAt: true } },
      },
    });
    if (!b) return null;
    const { course, sessions, ...rest } = b;
    return { ...rest, courseTitle: course.titleEn, firstSessionAt: sessions[0]?.startsAt ?? null };
  }

  findCourse(courseId: string) {
    return this.db.course.findUnique({ where: { id: courseId }, select: { id: true, titleEn: true, titleAr: true, type: true } });
  }

  async referenceExists(reference: string) {
    return (await this.db.seatPack.count({ where: { reference } })) > 0;
  }

  async createPack(data: NewSeatPack) {
    return toPack(await this.db.seatPack.create({ data, select: packSelect }));
  }

  async findPack(id: string) {
    const row = await this.db.seatPack.findUnique({ where: { id }, select: packSelect });
    return row ? toPack(row) : null;
  }

  async packsOf(organizationId: string) {
    return (await this.db.seatPack.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, select: packSelect })).map(toPack);
  }

  async updatePack(id: string, patch: SeatPackPatch) {
    return toPack(await this.db.seatPack.update({ where: { id }, data: patch, select: packSelect }));
  }

  assignments(seatPackId: string) {
    return this.db.seatAssignment.findMany({ where: { seatPackId }, orderBy: [{ status: 'asc' }, { assignedAt: 'asc' }], select: assignmentSelect });
  }

  findAssignment(id: string) {
    return this.db.seatAssignment.findUnique({ where: { id }, select: assignmentSelect });
  }

  findActiveAssignment(seatPackId: string, userId: string) {
    return this.db.seatAssignment.findFirst({ where: { seatPackId, userId, status: 'ACTIVE' }, select: assignmentSelect });
  }

  async claimSeat(seatPackId: string, userId: string, assignedById: string | null) {
    return this.db.$transaction(async (tx) => {
      // Row lock on the pack: concurrent claims on the same pack run one after the other.
      const locked = await tx.$queryRaw<{ seats: number; status: string }[]>`SELECT "seats", "status"::text AS "status" FROM "SeatPack" WHERE "id" = ${seatPackId} FOR UPDATE`;
      const pack = locked[0];
      if (!pack || !SEAT_PACK_LIVE.includes(pack.status as SeatPackStatus)) return null;
      const used = await tx.seatAssignment.count({ where: { seatPackId, status: 'ACTIVE' } });
      if (used >= pack.seats) return null;
      return tx.seatAssignment.create({ data: { seatPackId, userId, assignedById }, select: assignmentSelect });
    });
  }

  async dropClaim(assignmentId: string) {
    await this.db.seatAssignment.delete({ where: { id: assignmentId } });
  }

  async linkAssignment(id: string, link: { enrollmentId?: string; subscriptionId?: string }) {
    await this.db.seatAssignment.update({ where: { id }, data: link });
  }

  async revokeAssignment(id: string, revokedById: string | null, at: Date) {
    await this.db.seatAssignment.update({ where: { id }, data: { status: 'REVOKED', revokedById, revokedAt: at } });
  }

  async hasLivePlan(userId: string, courseId: string, now: Date) {
    const n = await this.db.subscription.count({
      where: { userId, courseId, status: { in: ['ACTIVE', 'CANCELLING', 'PAST_DUE'] }, OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] },
    });
    return n > 0;
  }

  async createSeatSubscription(userId: string, courseId: string, endsAt: Date) {
    const row = await this.db.subscription.create({
      data: { userId, courseId, plan: 'YEARLY', provider: 'ORGANIZATION', status: 'ACTIVE', currentPeriodEnd: endsAt, priceFils: 0 },
      select: { id: true },
    });
    return row.id;
  }

  async endSeatSubscription(subscriptionId: string, at: Date) {
    await this.db.subscription.updateMany({ where: { id: subscriptionId, provider: 'ORGANIZATION' }, data: { status: 'EXPIRED', currentPeriodEnd: at } });
  }

  async expireSeatSubscriptions(now: Date) {
    const r = await this.db.subscription.updateMany({ where: { provider: 'ORGANIZATION', status: 'ACTIVE', currentPeriodEnd: { lte: now } }, data: { status: 'EXPIRED' } });
    return r.count;
  }

  completedLessons(userId: string, courseId: string) {
    return this.db.lessonProgress.count({ where: { userId, lesson: { module: { courseId } } } });
  }

  enrollmentOf(enrollmentId: string) {
    return this.db.enrollment.findUnique({ where: { id: enrollmentId }, select: { id: true, userId: true, batchId: true, status: true, updatedAt: true } });
  }

  async reportData(organizationId: string): Promise<ReportData> {
    const seats = await this.db.seatAssignment.findMany({
      where: { status: 'ACTIVE', seatPack: { organizationId } },
      orderBy: { assignedAt: 'asc' },
      select: {
        user: { select: { id: true, name: true, email: true } },
        seatPack: {
          select: {
            reference: true,
            batch: { select: { id: true, code: true, status: true, course: { select: { titleEn: true } }, sessions: { select: { id: true, status: true } } } },
            course: { select: { id: true, titleEn: true, modules: { select: { lessons: { select: { id: true } } } } } },
          },
        },
      },
    });
    const userIds = [...new Set(seats.map((s) => s.user.id))];
    const batchIds = [...new Set(seats.flatMap((s) => (s.seatPack.batch ? [s.seatPack.batch.id] : [])))];
    const courseIds = [...new Set(seats.flatMap((s) => (s.seatPack.course ? [s.seatPack.course.id] : [])))];
    const sessionIds = seats.flatMap((s) => s.seatPack.batch?.sessions.map((x) => x.id) ?? []);
    const [certificates, progress, joins, marks] = await Promise.all([
      userIds.length
        ? this.db.certificate.findMany({
            where: { userId: { in: userIds }, OR: [{ batchId: { in: batchIds } }, { courseId: { in: courseIds } }] },
            select: { userId: true, batchId: true, courseId: true, code: true },
          })
        : [],
      userIds.length && courseIds.length
        ? this.db.lessonProgress.findMany({ where: { userId: { in: userIds }, lesson: { module: { courseId: { in: courseIds } } } }, select: { userId: true, lessonId: true } })
        : [],
      sessionIds.length && userIds.length
        ? this.db.attendance.groupBy({ by: ['userId', 'sessionId'], where: { sessionId: { in: sessionIds }, userId: { in: userIds } } })
        : [],
      sessionIds.length && userIds.length
        ? this.db.attendanceMark.findMany({ where: { sessionId: { in: sessionIds }, userId: { in: userIds } }, select: { userId: true, sessionId: true, mark: true } })
        : [],
    ]);
    const certOf = (userId: string, key: { batchId?: string; courseId?: string }) =>
      certificates.find((c) => c.userId === userId && (key.batchId ? c.batchId === key.batchId : c.courseId === key.courseId))?.code ?? null;
    const live: ReportData['live'] = [];
    const recorded: ReportData['recorded'] = [];
    for (const s of seats) {
      const { batch, course, reference } = s.seatPack;
      if (batch) {
        live.push({
          learner: s.user,
          packReference: reference,
          title: batch.course.titleEn,
          code: batch.code,
          batchId: batch.id,
          batchStatus: batch.status,
          sessions: batch.sessions,
          certificateCode: certOf(s.user.id, { batchId: batch.id }),
        });
      } else if (course) {
        const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const own = new Set(lessonIds);
        recorded.push({
          learner: s.user,
          packReference: reference,
          title: course.titleEn,
          lessonIds,
          completedLessonIds: progress.filter((p) => p.userId === s.user.id && own.has(p.lessonId)).map((p) => p.lessonId),
          certificateCode: certOf(s.user.id, { courseId: course.id }),
        });
      }
    }
    return { live, recorded, joins, marks };
  }
}
