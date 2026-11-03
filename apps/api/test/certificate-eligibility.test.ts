import { describe, expect, test } from 'bun:test';
import type { SessionStatus } from '@azza/shared';
import { CERTIFICATE_ALPHABET, CertificateCodeGenerator, normalizeCertificateCode } from '../src/modules/certificates/certificate-code';
import { certificateProgress, requiredSessions } from '../src/modules/certificates/certificate-eligibility';
import { attendanceByUser, attendedSessionIds } from '../src/modules/sessions/attended-sessions';

const sessions = (statuses: SessionStatus[]) => statuses.map((status, i) => ({ id: `s${i + 1}`, status }));
const ids = (...n: number[]) => new Set(n.map((i) => `s${i}`));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const allEnded = sessions(Array(12).fill('ENDED'));

describe('requiredSessions (80 %, rounded up)', () => {
  test('10 of 12, 8 of 10, 5 of 6, 1 of 1', () => {
    expect(requiredSessions(12)).toBe(10);
    expect(requiredSessions(10)).toBe(8);
    expect(requiredSessions(6)).toBe(5);
    expect(requiredSessions(1)).toBe(1);
    expect(requiredSessions(0)).toBe(0);
  });
});

describe('certificateProgress', () => {
  const base = { enrollmentStatus: 'ACTIVE' as const, batchStatus: 'RUNNING' as const };

  test('eligible once every session ended and ≥ 80 % attended', () => {
    const p = certificateProgress({ ...base, sessions: allEnded, attendedSessionIds: ids(...range(1, 10)) });
    expect(p).toMatchObject({ total: 12, attended: 10, required: 10, needed: 0, finished: true, eligible: true });
  });

  test('9 of 12 is not enough', () => {
    const p = certificateProgress({ ...base, sessions: allEnded, attendedSessionIds: ids(...range(1, 9)) });
    expect(p).toMatchObject({ attended: 9, needed: 1, finished: true, reachable: false, eligible: false });
  });

  test('not eligible while sessions remain, even with perfect attendance', () => {
    const s = sessions([...Array(10).fill('ENDED'), 'LIVE', 'SCHEDULED']);
    const p = certificateProgress({ ...base, sessions: s, attendedSessionIds: ids(...range(1, 10)) });
    expect(p).toMatchObject({ finished: false, needed: 0, reachable: true, eligible: false });
  });

  test('a COMPLETED batch counts as finished', () => {
    const s = sessions([...Array(11).fill('ENDED'), 'SCHEDULED']);
    const p = certificateProgress({ ...base, batchStatus: 'COMPLETED', sessions: s, attendedSessionIds: ids(...range(1, 10)) });
    expect(p).toMatchObject({ finished: true, eligible: true });
  });

  test('cancelled sessions are left out of the total', () => {
    const s = sessions([...Array(10).fill('ENDED'), 'CANCELLED', 'CANCELLED']);
    const p = certificateProgress({ ...base, sessions: s, attendedSessionIds: ids(...range(1, 8)) });
    expect(p).toMatchObject({ total: 10, attended: 8, required: 8, finished: true, eligible: true });
  });

  test('attendance on a cancelled session does not count', () => {
    const s = sessions(['ENDED', 'ENDED', 'CANCELLED']);
    expect(certificateProgress({ ...base, sessions: s, attendedSessionIds: ids(1, 3) }).attended).toBe(1);
  });

  test('only ACTIVE enrollments qualify', () => {
    const p = certificateProgress({ ...base, enrollmentStatus: 'REFUNDED', sessions: allEnded, attendedSessionIds: ids(...range(1, 12)) });
    expect(p.eligible).toBe(false);
  });

  test('a batch without sessions never issues', () => {
    const p = certificateProgress({ ...base, batchStatus: 'COMPLETED', sessions: [], attendedSessionIds: new Set() });
    expect(p.eligible).toBe(false);
  });

  test('progress: needed counts down, reachable while enough sessions remain', () => {
    const s = sessions([...Array(4).fill('ENDED'), ...Array(8).fill('SCHEDULED')]);
    const p = certificateProgress({ ...base, sessions: s, attendedSessionIds: ids(1, 3) });
    expect(p).toMatchObject({ total: 12, attended: 2, required: 10, needed: 8, reachable: true });
    expect(certificateProgress({ ...base, sessions: s, attendedSessionIds: ids(1) }).reachable).toBe(false);
  });
});

describe('attendedSessionIds', () => {
  test('join log, corrected by marks (ABSENT removes, anything else adds)', () => {
    const got = attendedSessionIds(['s1', 's2'], [
      { sessionId: 's2', mark: 'ABSENT' },
      { sessionId: 's3', mark: 'LATE' },
    ]);
    expect([...got].sort()).toEqual(['s1', 's3']);
  });

  test('grouped per student', () => {
    const by = attendanceByUser(
      [
        { userId: 'sara', sessionId: 's1' },
        { userId: 'omar', sessionId: 's1' },
      ],
      [{ userId: 'sara', sessionId: 's2', mark: 'PRESENT' }],
    );
    expect([...by.get('sara')!].sort()).toEqual(['s1', 's2']);
    expect([...by.get('omar')!]).toEqual(['s1']);
  });
});

describe('CertificateCodeGenerator', () => {
  test('AZ-CERT- + 4 characters from the unambiguous alphabet', () => {
    const code = new CertificateCodeGenerator().next();
    expect(code).toMatch(/^AZ-CERT-[23456789ABCDEFGHJKMNPQRSTWXYZ]{4}$/);
  });

  test('deterministic with an injected random source', () => {
    let i = 0;
    const seq = [5, 23, 2, 17];
    expect(new CertificateCodeGenerator(() => seq[i++]!).next()).toBe(
      `AZ-CERT-${seq.map((n) => CERTIFICATE_ALPHABET[n]).join('')}`,
    );
  });

  test('alphabet has no look-alikes', () => {
    for (const c of '01OIL') expect(CERTIFICATE_ALPHABET).not.toContain(c);
  });

  test('typed codes are normalized', () => {
    expect(normalizeCertificateCode('  az-cert-7q4k ')).toBe('AZ-CERT-7Q4K');
  });
});
