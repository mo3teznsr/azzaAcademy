import { describe, expect, test } from 'bun:test';
import type { RescheduleRequestStatus, RescheduleSessionInput } from "@azza/shared";
import { AppError } from '../src/core/errors';
import type {
  NewRescheduleRequest,
  RescheduleDecision,
  RescheduleRequestRecord,
  RescheduleRequestRepository,
} from '../src/modules/sessions/reschedule-request.repository';
import { RescheduleRequestService, type SessionMover } from '../src/modules/sessions/reschedule-request.service';
import { RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-20T10:00:00Z');
const admin = { id: 'nour', name: 'Nour', role: 'ADMIN' as const };
const lina = { id: 'lina', name: 'Lina', role: 'TEACHER' as const };
const omar = { id: 'omar', name: 'Omar', role: 'TEACHER' as const };

class InMemoryRequests implements RescheduleRequestRepository {
  rows: RescheduleRequestRecord[] = [];
  private seq = 0;

  async create(input: NewRescheduleRequest, at: Date) {
    for (const r of this.rows) {
      if (r.sessionId === input.sessionId && r.status === 'PENDING') Object.assign(r, { status: 'DECLINED', decidedAt: at, decisionNote: 'Superseded' });
    }
    const row = {
      id: `rr_${++this.seq}`,
      ...input,
      status: 'PENDING',
      decidedById: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: at,
      updatedAt: at,
      requestedBy: { id: input.requestedById, name: input.requestedById, image: null },
      decidedBy: null,
      session: {
        id: input.sessionId,
        number: 5,
        title: 'Information architecture',
        status: 'SCHEDULED',
        startsAt: new Date('2026-11-24T15:00:00Z'),
        endsAt: new Date('2026-11-24T16:30:00Z'),
        batch: { id: 'b07', code: 'B07', timezone: 'Asia/Dubai', course: { id: 'c', titleEn: 'PDF', titleAr: null }, teacher: { id: 'lina', name: 'Lina' } },
      },
    } as unknown as RescheduleRequestRecord;
    this.rows.push(row);
    return row;
  }
  async find(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async list(f: { status?: RescheduleRequestStatus; requestedById?: string }) {
    return this.rows.filter((r) => (!f.status || r.status === f.status) && (!f.requestedById || r.requestedById === f.requestedById));
  }
  async decide(id: string, d: RescheduleDecision) {
    const row = this.rows.find((r) => r.id === id)!;
    Object.assign(row, d);
    return row;
  }
}

class FakeMover implements SessionMover {
  calls: Array<{ id: string; input: RescheduleSessionInput }> = [];
  fail?: AppError;
  async reschedule(id: string, input: RescheduleSessionInput) {
    if (this.fail) throw this.fail;
    this.calls.push({ id, input });
    return { requested: false, session: { id, startsAt: input.startsAt } };
  }
}

function setup() {
  const repo = new InMemoryRequests();
  const mover = new FakeMover();
  const notifier = new RecordingNotifier();
  const service = new RescheduleRequestService(repo, mover, notifier, { now: () => now });
  return { repo, mover, notifier, service };
}

const request = (repo: InMemoryRequests, by = lina.id, sessionId = 's5') =>
  repo.create({ sessionId, requestedById: by, startsAt: new Date('2026-11-25T15:00:00Z'), endsAt: new Date('2026-11-25T16:30:00Z'), reason: 'Travel' }, now);

const codeOf = async (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);

describe('RescheduleRequestService', () => {
  test('teachers only list their own requests; admins see all', async () => {
    const { repo, service } = setup();
    await request(repo, lina.id, 's5');
    await request(repo, omar.id, 's9');
    expect((await service.list(lina)).items.map((r) => r.requestedById)).toEqual(['lina']);
    expect((await service.list(admin)).items).toHaveLength(2);
    expect((await service.list(admin, 'APPROVED')).items).toHaveLength(0);
  });

  test('a newer request supersedes the pending one for the same session', async () => {
    const { repo } = setup();
    const first = await request(repo);
    await request(repo);
    expect(first.status).toBe('DECLINED');
    expect(repo.rows.filter((r) => r.status === 'PENDING')).toHaveLength(1);
  });

  test('approve moves the session with the requested time and duration, then notifies the teacher', async () => {
    const { repo, mover, notifier, service } = setup();
    const r = await request(repo);
    const res = await service.approve(r.id, { notifyStudents: true }, admin);
    expect(mover.calls).toEqual([
      { id: 's5', input: { startsAt: '2026-11-25T15:00:00.000Z', durationMin: 90, reason: 'Travel', notifyStudents: true } },
    ]);
    expect(res.request.status).toBe('APPROVED');
    expect(res.request.decidedById).toBe('nour');
    expect(notifier.sent).toMatchObject([{ userIds: ['lina'], notice: { type: 'SESSION_RESCHEDULE_APPROVED' } }]);
  });

  test('a failed move (e.g. teacher clash) leaves the request pending', async () => {
    const { repo, mover, service } = setup();
    const r = await request(repo);
    mover.fail = new AppError('Teacher is double-booked at that time', 409, 'CONFLICT');
    expect(await codeOf(service.approve(r.id, { notifyStudents: true }, admin))).toBe('CONFLICT');
    expect(r.status).toBe('PENDING');
  });

  test('decline keeps the session and tells the teacher why', async () => {
    const { repo, mover, notifier, service } = setup();
    const r = await request(repo);
    const res = await service.decline(r.id, { reason: 'No room that day', notifyStudents: true }, admin);
    expect(res.request).toMatchObject({ status: 'DECLINED', decisionNote: 'No room that day' });
    expect(mover.calls).toHaveLength(0);
    expect(notifier.types()).toEqual(['SESSION_RESCHEDULE_DECLINED']);
  });

  test('decided requests cannot be decided again; unknown ids are 404', async () => {
    const { repo, service } = setup();
    const r = await request(repo);
    await service.decline(r.id, { notifyStudents: true }, admin);
    expect(await codeOf(service.approve(r.id, { notifyStudents: true }, admin))).toBe('REQUEST_ALREADY_DECIDED');
    expect(await codeOf(service.decline('nope', { notifyStudents: true }, admin))).toBe('NOT_FOUND');
  });
});
