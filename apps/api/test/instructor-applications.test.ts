import { describe, expect, test } from 'bun:test';
import type { InstructorApplicationInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import {
  InstructorApplicationService,
  type ApplicationRecord,
  type ApplicationRepository,
  type ApplicationStatus,
} from '../src/modules/instructors/instructor-application.service';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const sara = { id: 'sara', role: 'STUDENT' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };
const admin = { id: 'nour', role: 'ADMIN' as const };
const input: InstructorApplicationInput = {
  headline: 'Calligrapher and Naskh teacher',
  bio: 'Ten years teaching Arabic calligraphy to adults in small evening groups in Sharjah.',
  categories: ['art'],
  languages: ['AR', 'EN'],
  experience: 'Taught 40+ adult cohorts at a community art centre.',
};

class InMemoryApplications implements ApplicationRepository {
  rows: ApplicationRecord[] = [];
  roles = new Map<string, string>();
  async latestFor(userId: string) {
    return [...this.rows].reverse().find((r) => r.userId === userId) ?? null;
  }
  async find(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async list(status?: ApplicationStatus) {
    return this.rows.filter((r) => !status || r.status === status);
  }
  async create(userId: string, i: InstructorApplicationInput) {
    const row = { id: `a${this.rows.length + 1}`, userId, ...i, sampleUrl: i.sampleUrl ?? null, phone: i.phone ?? null, status: 'PENDING', reviewNote: null, decidedAt: null, createdAt: new Date(), user: { id: userId, name: 'Sara', email: 's@x', image: null } } as ApplicationRecord;
    this.rows.push(row);
    return row;
  }
  async decide(id: string, d: { approve: boolean; note: string | null; at: Date }) {
    const row = (await this.find(id))!;
    Object.assign(row, { status: d.approve ? 'APPROVED' : 'REJECTED', reviewNote: d.note, decidedAt: d.at });
    if (d.approve) this.roles.set(row.userId, 'TEACHER');
    return row;
  }
}

function setup() {
  const repo = new InMemoryApplications();
  const notifier = new RecordingNotifier();
  return { repo, notifier, service: new InstructorApplicationService(repo, notifier) };
}

describe('join as instructor', () => {
  test('a learner becomes a teacher at once; they are welcomed and admins are told', async () => {
    const { service, repo, notifier } = setup();
    const a = await service.apply(input, sara);
    expect(a.status).toBe('APPROVED');
    expect(repo.roles.get('sara')).toBe('TEACHER');
    expect(notifier.sent).toMatchObject([
      { userIds: ['sara'], notice: { type: 'INSTRUCTOR_APPROVED' } },
      { userIds: ['role:ADMIN'], notice: { type: 'INSTRUCTOR_APPLIED' } },
    ]);
    expect((await service.mine(sara))?.status).toBe('APPROVED');
  });

  test('an application left pending from before is approved as it stands, not duplicated', async () => {
    const { service, repo } = setup();
    const old = await repo.create('sara', input);
    const a = await service.apply({ ...input, headline: 'Something else' }, sara);
    expect(a.id).toBe(old.id);
    expect(a.headline).toBe(input.headline);
    expect(repo.rows).toHaveLength(1);
    expect(repo.roles.get('sara')).toBe('TEACHER');
  });

  test('teachers and admins cannot apply', async () => {
    const { service } = setup();
    expect(await codeOf(service.apply(input, lina))).toBe('ALREADY_INSTRUCTOR');
    expect(await codeOf(service.apply(input, admin))).toBe('ALREADY_INSTRUCTOR');
  });

  test('admins can still decide an old pending application, once', async () => {
    const { service, repo, notifier } = setup();
    const a = await repo.create('sara', input);
    await service.review(a.id, { approve: false, note: 'Add a sample lesson video' }, admin);
    expect(repo.roles.has('sara')).toBe(false);
    expect(notifier.sent.at(-1)).toMatchObject({ userIds: ['sara'], notice: { type: 'INSTRUCTOR_DECLINED', body: 'Add a sample lesson video' } });
    expect(await codeOf(service.review(a.id, { approve: true }, admin))).toBe('APPLICATION_DECIDED');
    expect((await service.apply(input, sara)).status).toBe('APPROVED');
  });
});
