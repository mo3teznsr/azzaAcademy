import type { Db } from '../../infrastructure/db';

const certificateInclude = {
  user: { select: { id: true, name: true } },
  batch: {
    select: {
      id: true,
      code: true,
      startsOn: true,
      endsOn: true,
      course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverImageUrl: true, introVideoUrl: true } },
      teacher: { select: { id: true, name: true } },
    },
  },
} as const;

export class PrismaCertificateRepository {
  constructor(private readonly db: Db) {}

  /** ACTIVE enrollments with what the eligibility rule needs: batch status + every session's status. */
  activeEnrollments(userId: string) {
    return this.db.enrollment.findMany({
      where: { userId, status: 'ACTIVE', batch: { status: { not: 'CANCELLED' } } },
      orderBy: { createdAt: 'asc' },
      select: {
        status: true,
        batch: {
          select: {
            ...certificateInclude.batch.select,
            status: true,
            sessions: { select: { id: true, status: true }, orderBy: { number: 'asc' } },
          },
        },
      },
    });
  }

  /** The student's join log (one row per session) and attendance corrections over `sessionIds`. */
  async attendance(userId: string, sessionIds: string[]) {
    if (!sessionIds.length) return { joins: [], marks: [] };
    const [joins, marks] = await Promise.all([
      this.db.attendance.groupBy({ by: ['userId', 'sessionId'], where: { userId, sessionId: { in: sessionIds } } }),
      this.db.attendanceMark.findMany({ where: { userId, sessionId: { in: sessionIds } }, select: { userId: true, sessionId: true, mark: true } }),
    ]);
    return { joins, marks };
  }

  codesInUse(codes: string[]) {
    return this.db.certificate.findMany({ where: { code: { in: codes } }, select: { code: true } });
  }

  /** Idempotent on (userId, batchId): an already issued certificate is kept as is. */
  async issue(rows: { userId: string; batchId: string; code: string; attended: number; total: number }[]) {
    if (!rows.length) return 0;
    return (await this.db.certificate.createMany({ data: rows, skipDuplicates: true })).count;
  }

  listForUser(userId: string) {
    return this.db.certificate.findMany({ where: { userId }, include: certificateInclude, orderBy: { issuedAt: 'desc' } });
  }

  findByCode(code: string) {
    return this.db.certificate.findUnique({ where: { code }, include: certificateInclude });
  }
}

export type CertificateRepository = PrismaCertificateRepository;
export type CertificateRecord = NonNullable<Awaited<ReturnType<PrismaCertificateRepository['findByCode']>>>;
