import { NotFoundError } from '../../core/errors';
import type { Notifier } from '../notifications/notification.types';
import { attendanceByUser } from '../sessions/attended-sessions';
import { normalizeCertificateCode, type CertificateCodeGenerator } from './certificate-code';
import { certificateProgress, recordedEligible } from './certificate-eligibility';
import type { CertificateRecord, CertificateRepository } from './certificate.repository';

const present = (c: CertificateRecord) => {
  const base = { id: c.id, code: c.code, issuedAt: c.issuedAt };
  if (c.batch) {
    return {
      ...base,
      kind: 'LIVE' as const,
      attended: c.attended,
      total: c.total,
      batchId: c.batch.id as string | null,
      batchCode: c.batch.code as string | null,
      course: c.batch.course,
      courseTitle: c.batch.course.titleEn,
      teacherName: c.batch.teacher.name as string | null,
      startsOn: c.batch.startsOn as Date | null,
      endsOn: c.batch.endsOn as Date | null,
    };
  }
  // Recorded course: no batch, no sessions, so no attendance to show (attended/total stay 0).
  const course = c.course!;
  const { createdBy, ...courseFields } = course;
  return {
    ...base,
    kind: 'RECORDED' as const,
    attended: 0,
    total: 0,
    batchId: null as string | null,
    batchCode: null as string | null,
    course: courseFields,
    courseTitle: course.titleEn,
    teacherName: (createdBy?.name ?? null) as string | null,
    startsOn: null as Date | null,
    endsOn: null as Date | null,
  };
};

export class CertificateService {
  constructor(
    private readonly repo: CertificateRepository,
    private readonly codes: CertificateCodeGenerator,
    private readonly log: (message: string, error: unknown) => void = (m, e) => console.error(m, e),
    /** Tells the learner a certificate was issued (with share links); omitted in tests that don't care. */
    private readonly notifier: Notifier | null = null,
    private readonly webUrl = '',
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
    const has = new Set(issued.flatMap((c) => (c.batch ? [c.batch.id] : [])));
    const toIssue = progress.filter((p) => p.eligible && !has.has(p.batch.id));
    if (toIssue.length) {
      const codes = await this.freshCodes(toIssue.length);
      await this.repo.issue(toIssue.map((p, i) => ({ userId, batchId: p.batch.id, code: codes[i]!, attended: p.attended, total: p.total })));
    }
    // Recorded courses the learner has touched: issue anything newly earned (also when the plan has lapsed).
    let issuedRecorded = false;
    for (const courseId of await this.repo.recordedCourseIds(userId)) {
      // One course that fails to check must not take the whole certificates page down; it is tried again next time.
      try {
        if (await this.issueRecordedIfEligible(userId, courseId)) issuedRecorded = true;
      } catch (e) {
        this.log(`[certificates] recorded check for user ${userId}, course ${courseId} failed`, e);
      }
    }
    const certificates = toIssue.length || issuedRecorded ? await this.repo.listForUser(userId) : issued;
    if (toIssue.length) {
      // Batch certificates issued just now (recorded ones announce themselves in issueRecordedIfEligible).
      const before = new Set(issued.map((c) => c.code));
      await this.announce(userId, certificates.filter((c) => c.batch && !before.has(c.code)));
    }

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

  /**
   * Issues the course certificate when every current lesson is completed and every published quiz's best attempt passes.
   * Idempotent per (user, course), needs no active plan, and is never revoked: later course changes don't touch it.
   * Returns true when a certificate was created by this call.
   */
  async issueRecordedIfEligible(userId: string, courseId: string): Promise<boolean> {
    const facts = await this.repo.recordedFacts(userId, courseId);
    if (!facts || !recordedEligible(facts)) return false;
    const [code] = await this.freshCodes(1);
    const created = await this.repo.issueRecorded({ userId, courseId, code: code!, attended: 0, total: 0 });
    if (created && this.notifier) {
      const record = await this.repo.findByCode(code!);
      if (record) await this.announce(userId, [record]);
    }
    return created;
  }

  /** One CERTIFICATE_ISSUED notice per new certificate: in-app, push and realtime, linking to its public verify page. */
  private async announce(userId: string, fresh: CertificateRecord[]) {
    if (!this.notifier) return;
    for (const c of fresh) {
      const course = c.batch?.course ?? c.course;
      if (!course) continue;
      const titleAr = course.titleAr ?? course.titleEn;
      try {
        await this.notifier.notify(
          [userId],
          {
            type: 'CERTIFICATE_ISSUED',
            title: `Your certificate is ready: ${course.titleEn}`,
            body: 'Well done! Share it on LinkedIn or send the verify link to anyone.',
            ar: { title: `شهادتك جاهزة: ${titleAr}`, body: 'أحسنت! شاركها على LinkedIn أو أرسل رابط التحقق لمن تريد.' },
            data: { certificateCode: c.code, verifyUrl: `${this.webUrl}/verify/${c.code}` },
          },
          { channels: ['in-app', 'push', 'realtime'] },
        );
      } catch (e) {
        this.log(`[certificates] notice for ${c.code} failed`, e);
      }
    }
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
