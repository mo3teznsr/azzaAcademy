import { describe, expect, test } from 'bun:test';
import type { AppError } from '../src/core/errors';
import { BatchService } from '../src/modules/batches/batch.service';
import type { BatchRepository } from '../src/modules/batches/batch.repository';
import { ScheduleGenerator } from '../src/modules/batches/schedule-generator';
import type { BatchAccessPolicy } from '../src/modules/batches/batch-access';
import type { CourseRepository } from '../src/modules/courses/course.repository';
import { RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-06T10:00:00Z');
const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const lina = { id: 'lina', role: 'TEACHER' as const };

function setup(status = 'RUNNING', busy: Array<{ startsAt: Date; endsAt: Date; batchCode: string }> = []) {
  const added: Array<{ title: string; startsAt: Date; endsAt: Date }> = [];
  const repo = {
    findById: async () => ({ id: 'b7', code: 'B07', status, teacherId: 'lina', course: { titleEn: 'Product Design' } }),
    teacherBusy: async () => busy,
    addSession: async (_id: string, d: { title: string; startsAt: Date; endsAt: Date }) => {
      added.push(d);
      return { id: 's13', number: 13, ...d };
    },
    activeStudentIds: async () => ['sara'],
  } as unknown as BatchRepository;
  const notifier = new RecordingNotifier();
  const service = new BatchService(repo, {} as CourseRepository, new ScheduleGenerator(), {} as BatchAccessPolicy, notifier, { now: () => now });
  return { service, notifier, added };
}

const input = { startsAt: '2026-11-20T15:00:00.000Z', durationMin: 90, title: 'Portfolio review', notifyStudents: true };

describe('add a session to a batch', () => {
  test('the batch teacher adds a session; students are told', async () => {
    const { service, notifier, added } = setup();
    const s = await service.addSession('b7', input, lina);
    expect(s.number).toBe(13);
    expect(added[0]!.endsAt.toISOString()).toBe('2026-11-20T16:30:00.000Z');
    expect(notifier.sent).toMatchObject([{ userIds: ['sara'], notice: { type: 'SESSION_ADDED' } }]);
  });

  test('refuses other teachers, past times, clashes and closed batches', async () => {
    expect(await codeOf(setup().service.addSession('b7', input, { id: 'omar', role: 'TEACHER' }))).toBe('FORBIDDEN');
    expect(await codeOf(setup().service.addSession('b7', { ...input, startsAt: '2026-11-01T15:00:00.000Z' }, lina))).toBe('START_IN_PAST');
    const busy = [{ startsAt: new Date('2026-11-20T16:00:00Z'), endsAt: new Date('2026-11-20T17:00:00Z'), batchCode: 'B02' }];
    expect(await codeOf(setup('RUNNING', busy).service.addSession('b7', input, lina))).toBe('CONFLICT');
    expect(await codeOf(setup('COMPLETED').service.addSession('b7', input, lina))).toBe('BATCH_CLOSED');
  });
});
