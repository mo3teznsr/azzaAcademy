import { describe, expect, test } from 'bun:test';
import type { RealtimeBroadcaster, VideoProvider } from '../src/core/ports';
import { ClassroomState } from '../src/modules/sessions/classroom-state';
import { DemoReviewers } from '../src/modules/sessions/demo-reviewers';
import { JoinPolicy } from '../src/modules/sessions/join-policy';
import type { SessionCore, SessionRepository } from '../src/modules/sessions/session.repository';
import { SessionService, type EarningsAccrual, type RescheduleRequestLog } from '../src/modules/sessions/session.service';
import { RecordingNotifier } from './fakes/in-memory';

const startsAt = new Date('2026-11-24T15:00:00Z');
const session = {
  id: 's1', batchId: 'b1', number: 3, title: 'Problem framing', status: 'SCHEDULED', startsAt,
  endsAt: new Date('2026-11-24T16:30:00Z'), hostId: 'omar', roomName: 'room-s1', egressId: 'eg-1',
  movedFrom: null, startedAt: null, endedAt: null, recordingUrl: null,
  batch: { id: 'b1', code: 'B07', teacherId: 'lina', capacity: 10, timezone: 'Asia/Dubai', status: 'RUNNING', course: { id: 'c1', titleEn: 'Product Design', titleAr: null } },
} as unknown as SessionCore;

function harness({ recordingFails = false } = {}) {
  const notifier = new RecordingNotifier();
  const repo = {
    findCore: async () => session,
    findByEgressId: async () => session,
    enrollmentStatus: async () => null,
    update: async () => session,
    setBatchStatus: async () => undefined,
    activeStudentIds: async () => ['sara', 'ali'],
  } as unknown as SessionRepository;
  const video = {
    serverUrl: 'wss://lk',
    ensureRoom: async () => undefined,
    startRecording: async () => {
      if (recordingFails) throw new Error('egress unavailable');
      return { egressId: 'eg-1' };
    },
  } as unknown as VideoProvider;
  const realtime: RealtimeBroadcaster = { toUser: () => undefined, toSession: () => undefined, toRole: () => undefined };
  const service = new SessionService(
    repo, new JoinPolicy(), new ClassroomState(), video, realtime, notifier,
    {} as EarningsAccrual, { now: () => startsAt }, {} as RescheduleRequestLog, DemoReviewers.none(),
  );
  return { service, notifier };
}

describe('recording alerts', () => {
  test('a finished recording alerts the students and, separately, the batch teacher and the host', async () => {
    const { service, notifier } = harness();
    await service.handleVideoEvent({ event: 'egress_ended', egressId: 'eg-1', fileUrl: 'https://cdn/rec.mp4', at: startsAt });
    expect(notifier.sent).toMatchObject([
      { userIds: ['sara', 'ali'], notice: { type: 'RECORDING_READY' } },
      { userIds: ['lina', 'omar'], notice: { type: 'RECORDING_READY_TEACHER', data: { sessionId: 's1', batchId: 'b1' } } },
    ]);
  });

  test('when recording cannot start, the class still goes live and the teacher is told', async () => {
    const { service, notifier } = harness({ recordingFails: true });
    const lina = { id: 'lina', name: 'Lina', role: 'TEACHER' as const };
    await service.start('s1', lina);
    expect(notifier.types()).toEqual(['RECORDING_NOT_STARTED', 'SESSION_LIVE']);
    expect(notifier.sent[0]!.userIds).toEqual(['lina']);
  });
});
