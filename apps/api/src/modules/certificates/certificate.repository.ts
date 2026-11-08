import type { Db } from '../../infrastructure/db';
import { percentOf } from '../quizzes/quiz-grader';

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
  course: { select: { id: true, slug: true, titleEn: true, titleAr: true, coverImageUrl: true, introVideoUrl: true, createdBy: { select: { id: true, name: true } } } },
} as const;

/** A certificate is either a batch one (live) or a course one (recorded); anything else is a broken row and is hidden. */
const hasTarget = <T extends { batch: unknown; course: unknown }>(row: T) => row.batch != null || row.course != null;

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

  /** Batch and recorded-course certificates, newest first. */
  async listForUser(userId: string) {
    const rows = await this.db.certificate.findMany({ where: { userId }, include: certificateInclude, orderBy: { issuedAt: 'desc' } });
    return rows.filter(hasTarget);
  }

  async findByCode(code: string) {
    const row = await this.db.certificate.findUnique({ where: { code }, include: certificateInclude });
    return row && hasTarget(row) ? row : null;
  }

  /** RECORDED courses the user has lesson progress or a course-quiz attempt in. */
  async recordedCourseIds(userId: string): Promise<string[]> {
    const [lessons, quizzes] = await Promise.all([
      this.db.lesson.findMany({ where: { progress: { some: { userId } }, module: { course: { type: 'RECORDED' } } }, select: { module: { select: { courseId: true } } } }),
      this.db.quiz.findMany({ where: { courseId: { not: null }, course: { type: 'RECORDED' }, attempts: { some: { userId } } }, select: { courseId: true } }),
    ]);
    return [...new Set([...lessons.map((l) => l.module.courseId), ...quizzes.map((q) => q.courseId!)])];
  }

  /** What `recordedEligible` needs: the course's current lessons, the user's completed ones, published quizzes with the best attempt. */
  async recordedFacts(userId: string, courseId: string) {
    const course = await this.db.course.findUnique({ where: { id: courseId }, select: { type: true } });
    if (!course || course.type !== 'RECORDED') return null;
    const [lessons, quizzes] = await Promise.all([
      this.db.lesson.findMany({ where: { module: { courseId } }, select: { id: true } }),
      this.db.quiz.findMany({
        where: { courseId, status: 'PUBLISHED' },
        select: { passPercent: true, attempts: { where: { userId, submittedAt: { not: null } }, select: { score: true, maxScore: true } } },
      }),
    ]);
    const lessonIds = lessons.map((l) => l.id);
    const done = lessonIds.length ? await this.db.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true } }) : [];
    return {
      lessonIds,
      completedIds: new Set(done.map((d) => d.lessonId)),
      quizzes: quizzes.map((q) => ({
        passPercent: q.passPercent,
        bestPercent: q.attempts.length ? Math.max(...q.attempts.map((a) => percentOf(a.score, a.maxScore))) : null,
      })),
    };
  }

  /** Idempotent on (userId, courseId). Returns whether a row was created. */
  async issueRecorded(row: { userId: string; courseId: string; code: string; attended: number; total: number }) {
    return (await this.db.certificate.createMany({ data: [row], skipDuplicates: true })).count > 0;
  }
}

export type CertificateRepository = PrismaCertificateRepository;
export type CertificateRecord = NonNullable<Awaited<ReturnType<PrismaCertificateRepository['findByCode']>>>;
