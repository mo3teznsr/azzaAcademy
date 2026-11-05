import { describe, expect, test } from 'bun:test';
import type { RealtimeBroadcaster, VideoGrant, VideoProvider } from '../src/core/ports';
import { AppError } from '../src/core/errors';
import { ClassroomState } from '../src/modules/sessions/classroom-state';
import { DemoReviewers, demoRoomName } from '../src/modules/sessions/demo-reviewers';
import { JoinPolicy, type JoinContext } from '../src/modules/sessions/join-policy';
import type { SessionCore, SessionRepository } from '../src/modules/sessions/session.repository';
import { SessionService, type EarningsAccrual, type RescheduleRequestLog } from '../src/modules/sessions/session.service';
import type { Notifier } from '../src/modules/notifications/notification.types';

const policy = new JoinPolicy();
const startsAt = new Date('2026-11-24T15:00:00Z');
const base: JoinContext = {
  session: { status: 'SCHEDULED', startsAt, endsAt: new Date('2026-11-24T16:30:00Z'), hostId: 'lina', batchTeacherId: 'lina' },
  user: { id: 'sara', role: 'STUDENT' },
  enrollmentStatus: 'ACTIVE',
  now: new Date('2026-11-24T14:50:00Z'),
};
const daysEarly = new Date('2026-11-20T09:00:00Z');
const daysLate = new Date('2026-12-02T09:00:00Z');

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as AppError).code;
  }
  return null;
};

describe('DemoReviewers', () => {
  test('parses a comma-separated list, case- and space-insensitive', () => {
    const r = DemoReviewers.fromCsv(' AppReview@Azza.academy , second@x.com,,');
    expect(r.isDemo('appreview@azza.academy')).toBe(true);
    expect(r.isDemo('SECOND@x.com ')).toBe(true);
    expect(r.isDemo('sara@x.com')).toBe(false);
    expect(r.isDemo(undefined)).toBe(false);
    expect(r.isDemo('')).toBe(false);
  });

  test('unset / empty env means nobody is a demo user', () => {
    expect(DemoReviewers.fromCsv(undefined).isDemo('appreview@azza.academy')).toBe(false);
    expect(DemoReviewers.fromCsv('').isDemo('')).toBe(false);
    expect(DemoReviewers.none().isDemo('appreview@azza.academy')).toBe(false);
  });
});

describe('JoinPolicy.plan — real users are unaffected', () => {
  const contexts: JoinContext[] = [
    base,
    { ...base, now: new Date('2026-11-24T14:45:00Z') },
    { ...base, allowedToSpeak: true },
    { ...base, session: { ...base.session, status: 'LIVE' }, now: daysLate },
    { ...base, user: { id: 'lina', role: 'TEACHER' }, enrollmentStatus: null },
    { ...base, user: { id: 'nour', role: 'ADMIN' }, enrollmentStatus: null },
  ];

  test('same decision as decide(), always the real room', () => {
    for (const ctx of contexts) {
      expect(policy.plan(ctx)).toEqual({ ...policy.decide(ctx), room: 'session' });
      expect(policy.plan({ ...ctx, demoReviewer: false })).toEqual({ ...policy.decide(ctx), room: 'session' });
    }
  });

  test('lobby clock, late grace and closed sessions still refuse real students', () => {
    expect(codeOf(() => policy.plan({ ...base, now: daysEarly }))).toBe('LOBBY_NOT_OPEN');
    expect(codeOf(() => policy.plan({ ...base, now: new Date('2026-11-24T14:44:59Z') }))).toBe('LOBBY_NOT_OPEN');
    expect(codeOf(() => policy.plan({ ...base, now: daysLate }))).toBe('SESSION_ENDED');
    expect(codeOf(() => policy.plan({ ...base, session: { ...base.session, status: 'ENDED' } }))).toBe('SESSION_ENDED');
    expect(codeOf(() => policy.plan({ ...base, session: { ...base.session, status: 'CANCELLED' } }))).toBe('SESSION_CANCELLED');
    expect(codeOf(() => policy.plan({ ...base, enrollmentStatus: null }))).toBe('FORBIDDEN');
  });

  test('a real student sees the stored status', () => {
    expect(policy.viewStatus('SCHEDULED', 'student', false)).toBe('SCHEDULED');
    expect(policy.viewStatus('LIVE', 'student', false)).toBe('LIVE');
  });
});

describe('JoinPolicy.plan — demo reviewer', () => {
  const demo = { ...base, demoReviewer: true };

  test('enters a scheduled session at any time into a private demo room with camera/mic', () => {
    for (const now of [daysEarly, base.now, daysLate]) {
      expect(policy.plan({ ...demo, now })).toEqual({
        role: 'student',
        isHost: false,
        canPublish: true,
        canPublishData: true,
        hidden: false,
        room: 'demo',
      });
    }
  });

  test('a session that is really live is joined like any student, in the real room', () => {
    const live = { ...demo, session: { ...base.session, status: 'LIVE' as const } };
    expect(policy.plan(live)).toEqual({ role: 'student', isHost: false, canPublish: false, canPublishData: true, hidden: false, room: 'session' });
  });

  test('still needs an ACTIVE enrollment; cancelled and ended sessions stay closed', () => {
    expect(codeOf(() => policy.plan({ ...demo, enrollmentStatus: 'VERIFYING' }))).toBe('FORBIDDEN');
    expect(codeOf(() => policy.plan({ ...demo, enrollmentStatus: null }))).toBe('FORBIDDEN');
    expect(codeOf(() => policy.plan({ ...demo, session: { ...base.session, status: 'CANCELLED' } }))).toBe('SESSION_CANCELLED');
    expect(codeOf(() => policy.plan({ ...demo, session: { ...base.session, status: 'ENDED' } }))).toBe('SESSION_ENDED');
  });

  test('only applies to students (a demo-listed teacher keeps the host rules)', () => {
    const teacher = { ...demo, user: { id: 'lina', role: 'TEACHER' as const }, enrollmentStatus: null, now: daysEarly };
    expect(codeOf(() => policy.plan(teacher))).toBe('LOBBY_NOT_OPEN');
  });

  test('sees a scheduled session as live, everything else as stored', () => {
    expect(policy.viewStatus('SCHEDULED', 'student', true)).toBe('LIVE');
    expect(policy.viewStatus('ENDED', 'student', true)).toBe('ENDED');
    expect(policy.viewStatus('CANCELLED', 'student', true)).toBe('CANCELLED');
    expect(policy.viewStatus('SCHEDULED', 'host', true)).toBe('SCHEDULED');
  });
});

// ───────── SessionService wiring ─────────

const session: SessionCore = {
  id: 's1',
  batchId: 'b1',
  number: 1,
  title: 'Opening',
  status: 'SCHEDULED',
  startsAt,
  endsAt: new Date('2026-11-24T16:30:00Z'),
  hostId: null,
  roomName: 'room-s1',
  egressId: null,
  movedFrom: null,
  startedAt: null,
  endedAt: null,
  recordingUrl: null,
  batch: {
    id: 'b1',
    code: 'B1',
    teacherId: 'lina',
    capacity: 10,
    timezone: 'Asia/Dubai',
    status: 'RUNNING',
    course: { id: 'c1', titleEn: 'Course', titleAr: 'دورة' },
  },
} as SessionCore;

function harness(now: Date, status: SessionCore['status'] = 'SCHEDULED') {
  const calls = { ensureRoom: [] as string[], tokens: [] as VideoGrant[], recordings: 0, updates: 0, messages: 0, toUser: 0, toSession: 0 };
  const repo = {
    findCore: async () => ({ ...session, status }),
    findDetail: async () => ({ ...session, status }),
    enrollmentStatus: async () => 'ACTIVE' as const,
    update: async () => {
      calls.updates++;
      return session;
    },
    createMessage: async (_s: string, userId: string, body: string) => {
      calls.messages++;
      return { id: 'm1', body, createdAt: now, user: { id: userId, name: 'Sara', role: 'STUDENT' as const } };
    },
  } as unknown as SessionRepository;
  const video = {
    serverUrl: 'wss://lk',
    ensureRoom: async (name: string) => void calls.ensureRoom.push(name),
    createJoinToken: async (g: VideoGrant) => {
      calls.tokens.push(g);
      return 'token';
    },
    startRecording: async () => {
      calls.recordings++;
      return { egressId: 'e' };
    },
  } as unknown as VideoProvider;
  const realtime: RealtimeBroadcaster = {
    toUser: () => void calls.toUser++,
    toSession: () => void calls.toSession++,
    toRole: () => undefined,
  };
  const service = new SessionService(
    repo,
    policy,
    new ClassroomState(),
    video,
    realtime,
    {} as Notifier,
    {} as EarningsAccrual,
    { now: () => now },
    {} as RescheduleRequestLog,
    DemoReviewers.fromCsv('appreview@azza.academy'),
  );
  return { service, calls };
}

const reviewer = { id: 'rev', name: 'Reviewer', role: 'STUDENT' as const, email: 'AppReview@azza.academy' };
const student = { id: 'sara', name: 'Sara', role: 'STUDENT' as const, email: 'sara@example.com' };

describe('SessionService with a demo reviewer configured', () => {
  test('real student: unchanged join rules, real room, stored status', async () => {
    const early = harness(daysEarly);
    await expect(early.service.join('s1', student)).rejects.toMatchObject({ code: 'LOBBY_NOT_OPEN' });
    expect(early.calls.ensureRoom).toEqual([]);
    expect((await early.service.get('s1', student)).status).toBe('SCHEDULED');

    const onTime = harness(base.now);
    const grant = await onTime.service.join('s1', student);
    expect(grant).toMatchObject({ roomName: 'room-s1', sessionStatus: 'SCHEDULED', canPublish: false });
    expect(onTime.calls.ensureRoom).toEqual(['room-s1']);
  });

  test('real student chat is stored and broadcast to the session', async () => {
    const h = harness(base.now);
    await h.service.postChat('s1', student, 'hi');
    expect(h.calls).toMatchObject({ messages: 1, toSession: 1, toUser: 0 });
  });

  test('reviewer days early: private demo room, no recording, real session untouched', async () => {
    const h = harness(daysEarly);
    expect((await h.service.get('s1', reviewer)).status).toBe('LIVE');
    const grant = await h.service.join('s1', reviewer);
    expect(grant).toMatchObject({ roomName: demoRoomName('room-s1', 'rev'), sessionStatus: 'LIVE', canPublish: true });
    expect(h.calls.ensureRoom).toEqual([demoRoomName('room-s1', 'rev')]);
    expect(h.calls.tokens[0]).toMatchObject({ identity: 'rev', isHost: false, hidden: false });
    expect(h.calls).toMatchObject({ recordings: 0, updates: 0 });

    await h.service.postChat('s1', reviewer, 'hello');
    await h.service.raiseHand('s1', reviewer);
    expect(h.calls).toMatchObject({ messages: 0, toSession: 0, toUser: 2 });
  });

  test('reviewer in a really live session joins the real room as a normal student', async () => {
    const h = harness(daysLate, 'LIVE');
    const grant = await h.service.join('s1', reviewer);
    expect(grant).toMatchObject({ roomName: 'room-s1', sessionStatus: 'LIVE', canPublish: false });
  });

  test('without an email (e.g. internal callers) nobody is treated as demo', async () => {
    const h = harness(daysEarly);
    await expect(h.service.join('s1', { ...reviewer, email: undefined })).rejects.toMatchObject({ code: 'LOBBY_NOT_OPEN' });
  });
});
