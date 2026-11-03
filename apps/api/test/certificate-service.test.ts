import { describe, expect, test } from 'bun:test';
import type { BatchStatus, SessionStatus } from '@azza/shared';
import { AppError } from '../src/core/errors';
import { CertificateCodeGenerator } from '../src/modules/certificates/certificate-code';
import type { CertificateRepository } from '../src/modules/certificates/certificate.repository';
import { CertificateService } from '../src/modules/certificates/certificate.service';

const course = { id: 'pdf', slug: 'product-design-foundations', titleEn: 'Product Design Foundations', titleAr: null, coverImageUrl: null };
const teacher = { id: 'lina', name: 'Lina Haddad' };
const day = (d: number) => new Date(Date.UTC(2026, 7, d));

function batch(id: string, code: string, status: BatchStatus, statuses: SessionStatus[]) {
  return { id, code, status, startsOn: day(4), endsOn: day(30), course, teacher, sessions: statuses.map((s, i) => ({ id: `${id}-s${i + 1}`, status: s })) };
}

/** Just enough of the Prisma repository for the service. */
function fakeRepo() {
  const b06 = batch('b06', 'B06', 'COMPLETED', Array(12).fill('ENDED'));
  const b07 = batch('b07', 'B07', 'RUNNING', [...Array(4).fill('ENDED'), ...Array(8).fill('SCHEDULED')]);
  const certs: { id: string; code: string; userId: string; batchId: string; attended: number; total: number; issuedAt: Date }[] = [];
  const joins = [...b06.sessions.slice(0, 10), ...b07.sessions.slice(0, 3)].map((s) => ({ userId: 'sara', sessionId: s.id }));
  const repo = {
    activeEnrollments: async () => [b06, b07].map((b) => ({ status: 'ACTIVE' as const, batch: b })),
    attendance: async () => ({ joins, marks: [] }),
    codesInUse: async (codes: string[]) => certs.filter((c) => codes.includes(c.code)).map((c) => ({ code: c.code })),
    issue: async (rows: Omit<(typeof certs)[number], 'id' | 'issuedAt'>[]) => {
      for (const r of rows) if (!certs.some((c) => c.userId === r.userId && c.batchId === r.batchId)) certs.push({ ...r, id: `c${certs.length + 1}`, issuedAt: day(31) });
      return rows.length;
    },
    listForUser: async (userId: string) =>
      certs.filter((c) => c.userId === userId).map((c) => ({ ...c, user: { id: 'sara', name: 'Sara Kamal' }, batch: [b06, b07].find((b) => b.id === c.batchId)! })),
    findByCode: async (code: string) => (await repo.listForUser('sara')).find((c) => c.code === code) ?? null,
  };
  return { repo: repo as unknown as CertificateRepository, certs };
}

describe('CertificateService', () => {
  test('issues once for the finished batch and reports progress on the running one', async () => {
    const { repo, certs } = fakeRepo();
    const service = new CertificateService(repo, new CertificateCodeGenerator());
    const first = await service.mine('sara');
    expect(first.items).toHaveLength(1);
    expect(first.items[0]).toMatchObject({ batchCode: 'B06', attended: 10, total: 12, courseTitle: 'Product Design Foundations', teacherName: 'Lina Haddad' });
    expect(first.inProgress).toEqual([
      expect.objectContaining({ batchCode: 'B07', attended: 3, total: 12, required: 10, needed: 7, sessionsEnded: 4, reachable: true }),
    ]);

    const again = await service.mine('sara');
    expect(certs).toHaveLength(1);
    expect(again.items[0]!.code).toBe(first.items[0]!.code);
  });

  test('verify by code (case-insensitive), 404 when unknown', async () => {
    const { repo } = fakeRepo();
    const service = new CertificateService(repo, new CertificateCodeGenerator());
    const { items } = await service.mine('sara');
    const v = await service.verify(items[0]!.code.toLowerCase());
    expect(v).toMatchObject({ valid: true, holderName: 'Sara Kamal', batchCode: 'B06', attended: 10, total: 12 });
    expect(service.verify('AZ-CERT-0000')).rejects.toBeInstanceOf(AppError);
  });
});
