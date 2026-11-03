import { NotFoundError } from '../../core/errors';
import { attendanceByUser } from '../sessions/attended-sessions';
import { normalizeCertificateCode, type CertificateCodeGenerator } from './certificate-code';
import { certificateProgress } from './certificate-eligibility';
import type { CertificateRecord, CertificateRepository } from './certificate.repository';

const present = (c: CertificateRecord) => ({
  id: c.id,
  code: c.code,
  issuedAt: c.issuedAt,
  attended: c.attended,
  total: c.total,
  batchId: c.batch.id,
  batchCode: c.batch.code,
  course: c.batch.course,
  courseTitle: c.batch.course.titleEn,
  teacherName: c.batch.teacher.name,
  startsOn: c.batch.startsOn,
  endsOn: c.batch.endsOn,
});

export class CertificateService {
  constructor(
    private readonly repo: CertificateRepository,
    private readonly codes: CertificateCodeGenerator,
  ) {}

  /** `GET /me/certificates` — issues any newly earned certificates (idempotent), then lists them + progress on running batches. */
  async mine(userId: string) {
    const enrollments = await this.repo.activeEnrollments(userId);
    const sessionIds = enrollments.flatMap((e) => e.batch.sessions.map((s) => s.id));
    const { joins, marks } = await this.repo.attendance(userId, sessionIds);
    const attended = attendanceByUser(joins, marks).get(userId) ?? new Set<string>();

    const progress = enrollments.map((e) => ({
      batch: e.batch,
      ...certificateProgress({ enrollmentStatus: e.status, batchStatus: e.batch.status, sessions: e.batch.sessions, attendedSessionIds: attended }),
    }));
    const issued = await this.repo.listForUser(userId);
    const has = new Set(issued.map((c) => c.batch.id));
    const toIssue = progress.filter((p) => p.eligible && !has.has(p.batch.id));
    if (toIssue.length) {
      const codes = await this.freshCodes(toIssue.length);
      await this.repo.issue(toIssue.map((p, i) => ({ userId, batchId: p.batch.id, code: codes[i]!, attended: p.attended, total: p.total })));
    }
    const certificates = toIssue.length ? await this.repo.listForUser(userId) : issued;

    const inProgress = progress
      .filter((p) => !p.finished)
      .map((p) => ({
        batchId: p.batch.id,
        batchCode: p.batch.code,
        course: p.batch.course,
        courseTitle: p.batch.course.titleEn,
        teacherName: p.batch.teacher.name,
        startsOn: p.batch.startsOn,
        endsOn: p.batch.endsOn,
        attended: p.attended,
        total: p.total,
        required: p.required,
        needed: p.needed,
        sessionsEnded: p.batch.sessions.filter((s) => s.status === 'ENDED').length,
        reachable: p.reachable,
      }));
    return { items: certificates.map(present), inProgress };
  }

  /** `GET /certificates/:code` — public verification. */
  async verify(code: string) {
    const c = await this.repo.findByCode(normalizeCertificateCode(code));
    if (!c) throw new NotFoundError('Certificate', code);
    const { id: _id, ...rest } = present(c);
    return { valid: true as const, ...rest, holderName: c.user.name };
  }

  /** Codes not used by any certificate yet (and distinct from each other). */
  private async freshCodes(count: number): Promise<string[]> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const codes = [...new Set(Array.from({ length: count * 2 }, () => this.codes.next()))];
      const taken = new Set((await this.repo.codesInUse(codes)).map((c) => c.code));
      const free = codes.filter((c) => !taken.has(c));
      if (free.length >= count) return free.slice(0, count);
    }
    throw new Error('Could not allocate certificate codes');
  }
}
