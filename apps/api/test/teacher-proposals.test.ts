import { describe, expect, test } from 'bun:test';
import { createCourseInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import type { CourseFilter, CourseRecord, CourseRepository, CourseWriteData } from '../src/modules/courses/course.repository';
import { CourseService, slugify } from '../src/modules/courses/course.service';
import { BatchService } from '../src/modules/batches/batch.service';
import type { BatchRepository } from '../src/modules/batches/batch.repository';
import { ScheduleGenerator } from '../src/modules/batches/schedule-generator';
import type { BatchAccessPolicy } from '../src/modules/batches/batch-access';
import { RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-06T10:00:00Z');
const clock = { now: () => now };
const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };
const omar = { id: 'omar', role: 'TEACHER' as const };
const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);

class InMemoryCourses implements CourseRepository {
  rows: CourseRecord[] = [];
  async list(f: CourseFilter) {
    const items = this.rows.filter((c) => (!f.status || c.status === f.status) && (!f.createdById || c.createdById === f.createdById));
    return { items, total: items.length };
  }
  async findById(id: string) {
    return this.rows.find((c) => c.id === id) ?? null;
  }
  async findBySlug(slug: string) {
    return this.rows.find((c) => c.slug === slug) ?? null;
  }
  async create(d: Parameters<CourseRepository['create']>[0]) {
    const { modules = [], ...rest } = d;
    const row = {
      id: `c${this.rows.length + 1}`,
      titleAr: null, descriptionEn: '', descriptionAr: null, coverStyle: 'sun', coverImageUrl: null, introVideoUrl: null,
      status: 'DRAFT', createdById: null, reviewNote: null, submittedAt: null, createdAt: now,
      ...rest,
      modules: modules.map((m, i) => ({ id: `m${i}`, order: m.order, titleEn: m.titleEn, titleAr: m.titleAr ?? null, descriptionEn: null, descriptionAr: null })),
    } as CourseRecord;
    this.rows.push(row);
    return row;
  }
  async update(id: string, { modules, ...d }: CourseWriteData) {
    const row = this.rows.find((c) => c.id === id)!;
    Object.assign(row, d);
    if (modules) row.modules = modules.map((m, i) => ({ id: `m${i}`, order: m.order, titleEn: m.titleEn, titleAr: m.titleAr ?? null, descriptionEn: null, descriptionAr: null }));
    return row;
  }
  async countActiveBatches() {
    return 0;
  }
  async related() {
    return [];
  }
}

const draft = createCourseInput.parse({ titleEn: 'Arabic Calligraphy Basics', category: 'arts', level: 'BEGINNER', priceAed: 900 });
const complete = { descriptionEn: 'Twelve live sessions on the Naskh script.', modules: [{ titleEn: 'Tools and posture', order: 0 }] };

function courses() {
  const repo = new InMemoryCourses();
  const notifier = new RecordingNotifier();
  return { repo, notifier, service: new CourseService(repo, notifier, clock) };
}

describe('teacher course proposals', () => {
  test('a teacher creates a private DRAFT with a slug from the title', async () => {
    const { service } = courses();
    const c = await service.create(draft, lina);
    expect(c).toMatchObject({ status: 'DRAFT', createdById: 'lina', slug: 'arabic-calligraphy-basics' });
    expect((await service.create(draft, lina)).slug).toBe('arabic-calligraphy-basics-2');
    expect(await codeOf(service.get(c.id, null))).toBe('NOT_FOUND');
    expect(await codeOf(service.get(c.id, omar))).toBe('NOT_FOUND');
    expect((await service.get(c.id, lina)).id).toBe(c.id);
    expect((await service.list({ mine: true, skip: 0, take: 20 }, lina)).items).toHaveLength(2);
    expect((await service.list({ skip: 0, take: 20 }, lina)).items).toHaveLength(0);
  });

  test('submit needs a description and a module, then alerts the admins', async () => {
    const { service, notifier } = courses();
    const c = await service.create(draft, lina);
    expect(await codeOf(service.submit(c.id, lina))).toBe('COURSE_INCOMPLETE');
    await service.update(c.id, complete, lina);
    expect((await service.submit(c.id, lina)).status).toBe('PENDING_REVIEW');
    expect(notifier.sent).toMatchObject([{ userIds: ['role:ADMIN'], notice: { type: 'COURSE_SUBMITTED' } }]);
    expect(await codeOf(service.submit(c.id, lina))).toBe('ALREADY_SUBMITTED');
  });

  test('teachers cannot publish themselves, edit others, or edit after approval', async () => {
    const { service } = courses();
    const c = await service.create(createCourseInput.parse({ ...draft, ...complete }), lina);
    expect(await codeOf(service.update(c.id, { status: 'PUBLISHED' }, lina))).toBe('FORBIDDEN');
    expect(await codeOf(service.update(c.id, { titleEn: 'Mine now' }, omar))).toBe('FORBIDDEN');
    await service.submit(c.id, lina);
    await service.review(c.id, { approve: true });
    expect(await codeOf(service.update(c.id, { priceAed: 1 }, lina))).toBe('COURSE_LOCKED');
  });

  test('admin sends back with a note (→ DRAFT) or approves (→ PUBLISHED); the teacher is told', async () => {
    const { service, notifier } = courses();
    const c = await service.create(createCourseInput.parse({ ...draft, ...complete }), lina);
    await service.submit(c.id, lina);
    expect(await service.review(c.id, { approve: false, note: 'Add Arabic title' })).toMatchObject({ status: 'DRAFT', reviewNote: 'Add Arabic title' });
    await service.submit(c.id, lina);
    expect(await service.review(c.id, { approve: true })).toMatchObject({ status: 'PUBLISHED', reviewNote: null });
    expect(notifier.types()).toEqual(['COURSE_SUBMITTED', 'COURSE_CHANGES_REQUESTED', 'COURSE_SUBMITTED', 'COURSE_APPROVED']);
    expect(await codeOf(service.review(c.id, { approve: true }))).toBe('NOT_PENDING_REVIEW');
  });

  test('slugify keeps ascii words and falls back for Arabic-only titles', () => {
    expect(slugify('  UX: Research & Design! ')).toBe('ux-research-design');
    expect(slugify('الخط العربي')).toBe('course');
  });
});

describe('teacher batch proposals', () => {
  function batches(courseStatus: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED', createdById: string | null = null) {
    const courseRepo = new InMemoryCourses();
    courseRepo.rows.push({ id: 'c1', slug: 'ux', titleEn: 'UX', status: courseStatus, createdById, modules: [] } as unknown as CourseRecord);
    const rows: Array<Record<string, unknown>> = [];
    const repo = {
      existsCode: async () => null,
      teacherBusy: async () => [],
      create: async (d: Record<string, unknown>) => {
        const row = { id: `b${rows.length + 1}`, status: 'DRAFT', ...d, course: { titleEn: 'UX' }, teacher: { name: String(d.teacherId) } };
        rows.push(row);
        return row;
      },
      findById: async (id: string) => rows.find((r) => r.id === id) ?? null,
      update: async (id: string, d: Record<string, unknown>) => Object.assign(rows.find((r) => r.id === id)!, d),
    } as unknown as BatchRepository;
    const notifier = new RecordingNotifier();
    const service = new BatchService(repo, courseRepo, new ScheduleGenerator(), {} as BatchAccessPolicy, notifier, clock);
    return { service, notifier, courseRepo };
  }
  const input = {
    courseId: 'c1', code: 'B12', teacherId: 'someone-else', capacity: 12, language: 'EN' as const, timezone: 'Asia/Dubai',
    waitlistEnabled: true, minStudents: 0,
    schedule: { weekdays: [2, 4], startTime: '19:00', durationMin: 90, sessionCount: 4, startsOn: '2026-12-01', skipDates: [] },
  };

  test('a teacher always proposes for themselves; submit → review → ENROLLING', async () => {
    const { service, notifier } = batches();
    const b = (await service.create(input, lina)) as { id: string; teacherId: string; status: string };
    expect(b).toMatchObject({ teacherId: 'lina', status: 'DRAFT' });
    expect(await codeOf(service.update(b.id, { status: 'ENROLLING' }, lina))).toBe('FORBIDDEN');
    expect(await codeOf(service.submit(b.id, omar))).toBe('FORBIDDEN');
    await service.submit(b.id, lina);
    expect(await service.review(b.id, { approve: true })).toMatchObject({ status: 'ENROLLING' });
    expect(notifier.types()).toEqual(['BATCH_SUBMITTED', 'BATCH_APPROVED']);
    expect(await codeOf(service.update(b.id, { capacity: 20 }, lina))).toBe('BATCH_LOCKED');
  });

  test("a batch on the teacher's own unpublished course waits for the course to be approved", async () => {
    const { service } = batches('DRAFT', 'lina');
    const b = (await service.create(input, lina)) as { id: string };
    await service.submit(b.id, lina);
    expect(await codeOf(service.review(b.id, { approve: true }))).toBe('COURSE_NOT_PUBLISHED');
    expect(await service.review(b.id, { approve: false, note: 'Wait for the course' })).toMatchObject({ status: 'DRAFT' });
  });

  test("teachers cannot add batches to someone else's unpublished course; admins must pick a teacher", async () => {
    expect(await codeOf(batches('DRAFT', 'omar').service.create(input, lina))).toBe('NOT_FOUND');
    expect(await codeOf(batches().service.create({ ...input, teacherId: undefined }, admin))).toBe('TEACHER_REQUIRED');
  });
});
