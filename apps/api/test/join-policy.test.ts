import { describe, expect, test } from 'bun:test';
import { AppError } from '../src/core/errors';
import { JoinPolicy, type JoinContext } from '../src/modules/sessions/join-policy';

const policy = new JoinPolicy();
const startsAt = new Date('2026-11-24T15:00:00Z');
const base: JoinContext = {
  session: { status: 'SCHEDULED', startsAt, endsAt: new Date('2026-11-24T16:30:00Z'), hostId: 'lina', batchTeacherId: 'lina' },
  user: { id: 'sara', role: 'STUDENT' },
  enrollmentStatus: 'ACTIVE',
  now: new Date('2026-11-24T14:50:00Z'),
};

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as AppError).code;
  }
  return null;
};

describe('JoinPolicy', () => {
  test('active student inside the lobby window joins without publish rights', () => {
    expect(policy.decide(base)).toEqual({ role: 'student', isHost: false, canPublish: false, canPublishData: true, hidden: false });
  });

  test('lobby opens exactly 15 minutes before start', () => {
    expect(codeOf(() => policy.decide({ ...base, now: new Date('2026-11-24T14:44:59Z') }))).toBe('LOBBY_NOT_OPEN');
    expect(policy.decide({ ...base, now: new Date('2026-11-24T14:45:00Z') }).role).toBe('student');
  });

  test('students need an ACTIVE enrollment', () => {
    expect(codeOf(() => policy.decide({ ...base, enrollmentStatus: 'VERIFYING' }))).toBe('FORBIDDEN');
    expect(codeOf(() => policy.decide({ ...base, enrollmentStatus: null }))).toBe('FORBIDDEN');
  });

  test('batch teacher or session host is the host', () => {
    const asTeacher = policy.decide({ ...base, user: { id: 'lina', role: 'TEACHER' }, enrollmentStatus: null });
    expect(asTeacher).toMatchObject({ role: 'host', isHost: true, canPublish: true });
    const substitute = policy.decide({
      ...base,
      session: { ...base.session, hostId: 'omar' },
      user: { id: 'omar', role: 'TEACHER' },
      enrollmentStatus: null,
    });
    expect(substitute.role).toBe('host');
    // another teacher with no link to the batch is refused
    expect(codeOf(() => policy.decide({ ...base, user: { id: 'maya', role: 'TEACHER' }, enrollmentStatus: null }))).toBe('FORBIDDEN');
  });

  test('admins join hidden as observers who cannot publish', () => {
    expect(policy.decide({ ...base, user: { id: 'nour', role: 'ADMIN' }, enrollmentStatus: null })).toEqual({
      role: 'observer',
      isHost: false,
      canPublish: false,
      canPublishData: false,
      hidden: true,
    });
  });

  test('a student the host gave the floor rejoins with publish rights', () => {
    expect(policy.decide({ ...base, allowedToSpeak: true }).canPublish).toBe(true);
  });

  test('cancelled / ended sessions are closed; LIVE ignores the lobby clock', () => {
    expect(codeOf(() => policy.decide({ ...base, session: { ...base.session, status: 'CANCELLED' } }))).toBe('SESSION_CANCELLED');
    expect(codeOf(() => policy.decide({ ...base, session: { ...base.session, status: 'ENDED' } }))).toBe('SESSION_ENDED');
    expect(codeOf(() => policy.decide({ ...base, now: new Date('2026-11-24T17:01:00Z') }))).toBe('SESSION_ENDED');
    const live = { ...base, session: { ...base.session, status: 'LIVE' as const }, now: new Date('2026-11-24T17:30:00Z') };
    expect(policy.decide(live).role).toBe('student');
  });
});
