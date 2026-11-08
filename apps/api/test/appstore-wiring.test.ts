import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { createCourseInput } from '@azza/shared';
import { loadConfig, resolveAppStoreConnect } from '../src/core/config';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv } from '../src/http/types';
import { BatchService } from '../src/modules/batches/batch.service';
import type { BatchRepository } from '../src/modules/batches/batch.repository';
import type { BatchAccessPolicy } from '../src/modules/batches/batch-access';
import { ScheduleGenerator } from '../src/modules/batches/schedule-generator';
import {
  AppStoreSyncCoordinator,
  DisabledAppStoreSync,
  type AppleSyncStore,
  type AppStoreSyncer,
  type SeatProductRow,
  type SyncLogger,
} from '../src/modules/appstore-sync/appstore-sync.coordinator';
import { adminAppStoreRoutes } from '../src/modules/appstore-sync/appstore-sync.routes';
import { AppStoreSyncService, fitDisplayName } from '../src/modules/appstore-sync/appstore-sync.service';
import type { CourseFilter, CourseRecord, CourseRepository, CourseWriteData } from '../src/modules/courses/course.repository';
import { CourseService } from '../src/modules/courses/course.service';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { InMemoryAppStoreCatalog } from './fakes/in-memory-appstore';
import { RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-08T10:00:00Z');
const clock = { now: () => now };
const admin = { id: 'nour', role: 'ADMIN' as const };
const prices = new PriceCalculator(5);

class MemCourses implements CourseRepository {
  rows: CourseRecord[] = [];
  async list(f: CourseFilter) {
    const items = this.rows.filter((c) => (!f.status || c.status === f.status) && (!f.type || c.type === f.type));
    return { items: items.slice(f.skip, f.skip + f.take), total: items.length };
  }
  async findById(id: string) {
    return this.rows.find((c) => c.id === id) ?? null;
  }
  async findBySlug(slug: string) {
    return this.rows.find((c) => c.slug === slug) ?? null;
  }
  async create(d: Parameters<CourseRepository['create']>[0]) {
    const { modules: _m, ...rest } = d;
    const row = {
      id: `c${this.rows.length + 1}`, titleAr: null, status: 'DRAFT', createdById: null, type: 'LIVE', priceFils: null, monthlyPriceFils: null,
      yearlyPriceFils: null, teacherCutPercent: null, stripeProductId: null, stripeMonthlyPriceId: null, stripeYearlyPriceId: null,
      appleMonthlyProductId: null, appleYearlyProductId: null, appleSyncStatus: null, appleSyncDetail: null, appleSyncedAt: null,
      ...rest, modules: [],
    } as unknown as CourseRecord;
    this.rows.push(row);
    return row;
  }
  async update(id: string, { modules: _m, ...d }: CourseWriteData) {
    const row = this.rows.find((c) => c.id === id)!;
    Object.assign(row, d);
    return row;
  }
  async countActiveBatches() {
    return 0;
  }
  async related() {
    return [];
  }
  async refreshFromPrice() {}
  recorded(slug: string, status: CourseRecord['status'] = 'PUBLISHED', monthly = 5000, yearly = 50000) {
    const row = {
      id: `r-${slug}`, slug, titleEn: `Course ${slug}`, titleAr: null, type: 'RECORDED', status, monthlyPriceFils: monthly, yearlyPriceFils: yearly,
      appleSyncStatus: null, appleSyncDetail: null, appleSyncedAt: null, appleMonthlyProductId: null, appleYearlyProductId: null, modules: [],
    } as unknown as CourseRecord;
    this.rows.push(row);
    return row;
  }
}

class MemStore implements AppleSyncStore {
  rows = new Map<number, SeatProductRow>();
  open: number[] = [];
  async upsertSeat(r: SeatProductRow) {
    this.rows.set(r.priceFils, r);
  }
  async seats() {
    return [...this.rows.values()];
  }
  async openBatchPrices() {
    return this.open;
  }
}

const silent: SyncLogger & { errors: string[]; warns: string[] } = {
  errors: [],
  warns: [],
  info() {},
  warn(m) {
    this.warns.push(m);
  },
  error(m) {
    this.errors.push(m);
  },
};

function setup(opts: { catalog?: InMemoryAppStoreCatalog | null } = {}) {
  const catalog = opts.catalog === undefined ? new InMemoryAppStoreCatalog() : opts.catalog;
  const engine = catalog ? new AppStoreSyncService(catalog, prices) : null;
  const syncer: AppStoreSyncer = engine
    ? { configured: true, syncSeatPrice: (p) => engine.syncSeatPrice(p), syncRecordedCourse: (c) => engine.syncRecordedCourse(c) }
    : new DisabledAppStoreSync();
  const repo = new MemCourses();
  const store = new MemStore();
  const sync = new AppStoreSyncCoordinator(syncer, store, repo, clock, silent);
  return { catalog, repo, store, sync };
}

describe('config', () => {
  const base = { ASC_ISSUER_ID: 'iss', ASC_KEY_ID: 'KEY1', APPLE_APP_APPLE_ID: 6758939735 } as const;
  const PEM = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n';

  test('is disabled without the variables, with an unreadable key file, or without the Apple id', () => {
    expect(resolveAppStoreConnect({})).toBeNull();
    expect(resolveAppStoreConnect({ ...base, ASC_PRIVATE_KEY_PATH: '/nope.p8' }, () => { throw new Error('ENOENT'); })).toBeNull();
    expect(resolveAppStoreConnect({ ASC_ISSUER_ID: 'iss', ASC_KEY_ID: 'K', ASC_PRIVATE_KEY: PEM })).toBeNull();
  });

  test('reads the key from a file, or inline with literal \\n sequences', () => {
    expect(resolveAppStoreConnect({ ...base, ASC_PRIVATE_KEY_PATH: '/k.p8' }, () => PEM)?.privateKey).toBe(PEM);
    const inline = resolveAppStoreConnect({ ...base, ASC_PRIVATE_KEY: PEM.trim().replace(/\n/g, '\\n') });
    expect(inline?.privateKey).toBe(PEM.trim());
    expect(inline?.appAppleId).toBe('6758939735');
  });

  test('loadConfig never fails because of the App Store key', () => {
    const env = { DATABASE_URL: 'postgres://x', BETTER_AUTH_SECRET: 'x'.repeat(32), ASC_ISSUER_ID: 'i', ASC_KEY_ID: 'k', ASC_PRIVATE_KEY_PATH: '/missing.p8' };
    expect(loadConfig(env).appStoreConnect).toBeNull();
  });
});

describe('not configured', () => {
  test('reports configured:false, and the triggers and the job do nothing', async () => {
    const { sync, repo, store } = setup({ catalog: null });
    const course = repo.recorded('logo');
    store.open = [45_000];
    sync.recordedPricingChanged(course.id);
    sync.seatPriceChanged(45_000);
    await sync.idle();
    expect(await sync.syncAppStoreCatalog()).toEqual({ seats: 0, courses: 0, failed: 0 });
    expect(course.appleSyncStatus).toBeNull();
    expect(await sync.status()).toEqual({ configured: false, seats: [], courses: [] });
    expect(await new DisabledAppStoreSync().syncSeatPrice()).toEqual({ status: 'SKIPPED', detail: 'not configured' });
  });
});

describe('setRecordedPricing trigger', () => {
  test('syncs the course and stores the product ids and status', async () => {
    const { sync, repo, catalog } = setup();
    const service = new CourseService(repo, new RecordingNotifier(), clock, undefined, undefined, sync);
    const created = await service.create(createCourseInput.parse({ titleEn: 'Logo design', category: 'arts', level: 'BEGINNER', type: 'RECORDED' }), admin);
    const dto = await service.setRecordedPricing(created.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    expect(dto.appleSyncStatus).toBeNull(); // the request does not wait for Apple
    await sync.idle();
    const row = repo.rows[0]!;
    expect(row.appleSyncStatus).toBe('SYNCED');
    expect(row.appleSyncedAt).toEqual(now);
    expect(row.appleMonthlyProductId).toBe('com.futuretech.azza.rec.logo-design.monthly');
    expect(row.appleYearlyProductId).toBe('com.futuretech.azza.rec.logo-design.yearly');
    expect(catalog!.count('createSubscription')).toBe(2);
    // admin sees the status; the public does not
    const admins = await service.get(created.id, admin);
    expect(admins.appleSyncStatus).toBe('SYNCED');
    expect('appleSyncDetail' in admins).toBe(false);
    row.status = 'PUBLISHED';
    const pub = (await service.get(created.id, null)) as unknown as Record<string, unknown>;
    expect('appleSyncStatus' in pub || 'appleSyncedAt' in pub || 'appleSyncDetail' in pub).toBe(false);
  });

  test('a failing sync is stored as FAILED, ids are untouched, and the request still succeeds', async () => {
    const catalog = new InMemoryAppStoreCatalog();
    catalog.createSubscriptionGroup = async () => { throw new Error('boom'); };
    const { sync, repo } = setup({ catalog });
    const service = new CourseService(repo, new RecordingNotifier(), clock, undefined, undefined, sync);
    const created = await service.create(createCourseInput.parse({ titleEn: 'Logo design', category: 'arts', level: 'BEGINNER', type: 'RECORDED' }), admin);
    await service.setRecordedPricing(created.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    await sync.idle();
    expect(repo.rows[0]!.appleSyncStatus).toBe('FAILED');
    expect(repo.rows[0]!.appleSyncDetail).toBe('boom');
    expect(repo.rows[0]!.appleMonthlyProductId).toBeNull();
  });

  test('a throwing store never escapes the fire-and-forget trigger', async () => {
    const { sync, repo, store } = setup();
    const course = repo.recorded('x');
    repo.update = async () => { throw new Error('db down'); };
    sync.recordedPricingChanged(course.id);
    sync.seatPriceChanged(45_000);
    store.upsertSeat = async () => { throw new Error('db down'); };
    await sync.idle();
    expect(silent.errors.some((e) => e.includes('db down'))).toBe(true);
  });
});

describe('batch price trigger', () => {
  test('a new batch price and a price change sync the seat product and upsert the row', async () => {
    const { sync, store, catalog } = setup();
    sync.seatPriceChanged(45_000);
    await sync.idle();
    expect(catalog!.iaps.has('com.futuretech.azza.seat.aed450')).toBe(true);
    expect(store.rows.get(45_000)).toMatchObject({ productId: 'com.futuretech.azza.seat.aed450', status: 'SYNCED', syncedAt: now });
    sync.seatPriceChanged(45_000);
    await sync.idle();
    expect(catalog!.count('createConsumable')).toBe(1);
    // a price that is not whole dirhams is skipped and not remembered
    sync.seatPriceChanged(45_050);
    await sync.idle();
    expect(store.rows.has(45_050)).toBe(false);
  });

  test('BatchService.update calls the trigger on a price change only', async () => {
    const calls: number[] = [];
    const batch = { id: 'b1', courseId: 'c1', status: 'DRAFT', teacherId: 't', capacity: 10, code: 'A' };
    const repo = { findById: async () => batch, update: async () => batch, activeEnrollmentCount: async () => 0 } as unknown as BatchRepository;
    const courses = { refreshFromPrice: async () => {} } as unknown as CourseRepository;
    const svc = new BatchService(repo, courses, new ScheduleGenerator(), {} as BatchAccessPolicy, new RecordingNotifier(), clock, { seatPriceChanged: (p) => void calls.push(p) });
    await svc.update('b1', { capacity: 12 }, admin);
    expect(calls).toEqual([]);
    await svc.update('b1', { priceAed: 520 }, admin);
    expect(calls).toEqual([52_000]);
  });
});

describe('syncAppStoreCatalog', () => {
  test('covers distinct open seat prices and published recorded courses, one call at a time', async () => {
    const catalog = new InMemoryAppStoreCatalog();
    let active = 0;
    let maxActive = 0;
    const order: string[] = [];
    const engine = new AppStoreSyncService(catalog, prices);
    const syncer: AppStoreSyncer = {
      configured: true,
      syncSeatPrice: async (p) => {
        active++; maxActive = Math.max(maxActive, active); order.push(`seat:${p}`);
        await new Promise((r) => setTimeout(r, 2));
        const r = await engine.syncSeatPrice(p);
        active--;
        return r;
      },
      syncRecordedCourse: async (c) => {
        active++; maxActive = Math.max(maxActive, active); order.push(`course:${c.slug}`);
        await new Promise((r) => setTimeout(r, 2));
        const r = await engine.syncRecordedCourse(c);
        active--;
        return r;
      },
    };
    const repo = new MemCourses();
    const store = new MemStore();
    const sync = new AppStoreSyncCoordinator(syncer, store, repo, clock, silent);
    store.open = [45_000, 45_000, 65_000, 45_050];
    repo.recorded('alpha');
    repo.recorded('beta');
    repo.recorded('draft-one', 'DRAFT');
    repo.rows.push({ ...repo.rows[0]!, id: 'live', slug: 'live', type: 'LIVE' } as CourseRecord);

    const totals = await sync.syncAppStoreCatalog();
    expect(totals).toEqual({ seats: 2, courses: 2, failed: 0 });
    expect(order).toEqual(['seat:45000', 'seat:65000', 'course:alpha', 'course:beta']);
    expect(maxActive).toBe(1);
    const status = await sync.status();
    expect(status.configured).toBe(true);
    expect(status.seats.map((s) => s.priceFils)).toEqual([45_000, 65_000]);
    expect(status.courses.map((c) => c.slug)).toEqual(['alpha', 'beta']);
    expect(status.courses[0]).toEqual({ id: 'r-alpha', slug: 'alpha', titleEn: 'Course alpha', titleAr: null, status: 'SYNCED', detail: expect.any(String), syncedAt: now });
  });

  test('a course without prices is SKIPPED, and one failure does not stop the rest', async () => {
    const catalog = new InMemoryAppStoreCatalog();
    const real = catalog.createSubscriptionGroup.bind(catalog);
    catalog.createSubscriptionGroup = async (name) => {
      if (name === 'rec.bad') throw new Error('nope');
      return real(name);
    };
    const { sync, repo } = setup({ catalog });
    repo.recorded('bad');
    repo.recorded('good');
    const noPrice = repo.recorded('free');
    noPrice.monthlyPriceFils = null;
    const totals = await sync.syncAppStoreCatalog();
    expect(totals.failed).toBe(1);
    expect(repo.rows.map((r) => [r.slug, r.appleSyncStatus])).toEqual([['bad', 'FAILED'], ['good', 'SYNCED'], ['free', 'SKIPPED']]);
  });
});

describe('single-flight sync', () => {
  test('a second "Sync now" while one runs does not start another', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const syncer: AppStoreSyncer = {
      configured: true,
      syncSeatPrice: async () => { calls++; await gate; return { status: 'SYNCED', detail: 'ok' }; },
      syncRecordedCourse: async () => ({ status: 'SYNCED', detail: 'ok', monthly: 'm', yearly: 'y' }),
    };
    const store = new MemStore();
    store.open = [45_000];
    const sync = new AppStoreSyncCoordinator(syncer, store, new MemCourses(), clock, silent);
    expect(sync.startSync()).toEqual({ started: true });
    expect(sync.startSync()).toEqual({ started: true });
    await new Promise((r) => setTimeout(r, 5));
    expect(calls).toBe(1);
    expect(sync.syncing).toBe(true);
    release();
    await sync.idle();
    expect(sync.syncing).toBe(false);
    sync.startSync();
    await sync.idle();
    expect(calls).toBe(2); // a new run is allowed once the first is done
  });
});

describe('admin routes', () => {
  function app(role: 'ADMIN' | 'TEACHER' | 'STUDENT' | null) {
    const { sync, repo, store } = setup();
    store.open = [45_000];
    repo.recorded('alpha');
    const a = new Hono<AppEnv>();
    a.onError(errorHandler);
    a.use('*', async (c, next) => {
      c.set('user', role ? { id: 'u', name: 'U', email: 'u@x.co', role, locale: 'en', timezone: 'Asia/Dubai' } : null);
      await next();
    });
    a.route('/admin', adminAppStoreRoutes(sync));
    return { a, sync };
  }

  test('GET /admin/app-store/status has the contract shape', async () => {
    const { a, sync } = app('ADMIN');
    await sync.syncAppStoreCatalog();
    const res = await a.request('/admin/app-store/status');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Object.keys(body).sort()).toEqual(['configured', 'courses', 'seats']);
    expect(body.configured).toBe(true);
    expect(Object.keys(body.seats[0]).sort()).toEqual(['detail', 'priceFils', 'productId', 'status', 'syncedAt']);
    expect(Object.keys(body.courses[0]).sort()).toEqual(['detail', 'id', 'slug', 'status', 'syncedAt', 'titleAr', 'titleEn']);
    expect(body.seats[0]).toMatchObject({ priceFils: 45_000, productId: 'com.futuretech.azza.seat.aed450', status: 'SYNCED' });
  });

  test('POST /admin/app-store/sync answers started:true and runs in the background', async () => {
    const { a, sync } = app('ADMIN');
    const res = await a.request('/admin/app-store/sync', { method: 'POST' });
    expect(await res.json()).toEqual({ started: true });
    await sync.idle();
    expect((await sync.status()).seats).toHaveLength(1);
  });

  test('is admin only: 403 for a teacher and a student, 401 when signed out', async () => {
    for (const [role, status] of [['TEACHER', 403], ['STUDENT', 403], [null, 401]] as const) {
      const { a } = app(role);
      expect((await a.request('/admin/app-store/status')).status).toBe(status);
      expect((await a.request('/admin/app-store/sync', { method: 'POST' })).status).toBe(status);
    }
  });
});

describe('engine hardening', () => {
  test('fitDisplayName never exceeds the limit, even when the suffix leaves no room', () => {
    expect([...fitDisplayName('Logo design', 'Monthly')].length).toBeLessThanOrEqual(30);
    const tight = fitDisplayName('Logo design', 'a very very long suffix indeed, longer than the room', 30);
    expect([...tight].length).toBeLessThanOrEqual(30);
    expect(fitDisplayName('x', 'y', 3)).toBe('· y');
  });
});

describe('publish trigger and boot behaviour', () => {
  test('publishing (update or approve) a priced recorded course syncs it; a live or unpriced one does not', async () => {
    const { sync, repo } = setup();
    const service = new CourseService(repo, new RecordingNotifier(), clock, undefined, undefined, sync);
    const priced = repo.recorded('priced', 'PENDING_REVIEW');
    priced.modules = [{ id: 'm', order: 0, titleEn: 'M', lessons: [{ id: 'l' }] }] as never;
    await service.update(priced.id, { status: 'PUBLISHED' }, admin);
    await sync.idle();
    expect(priced.appleSyncStatus).toBe('SYNCED');

    const viaReview = repo.recorded('review', 'PENDING_REVIEW');
    viaReview.modules = priced.modules;
    await service.review(viaReview.id, { approve: true });
    await sync.idle();
    expect(viaReview.appleSyncStatus).toBe('SYNCED');

    const unpriced = repo.recorded('unpriced', 'PENDING_REVIEW', 0, 0);
    unpriced.modules = priced.modules;
    await service.review(unpriced.id, { approve: true }).catch(() => null);
    await sync.idle();
    expect(unpriced.appleSyncStatus).toBeNull();

    repo.rows.push({ ...repo.rows[0]!, id: 'live2', slug: 'live2', type: 'LIVE', status: 'PENDING_REVIEW', appleSyncStatus: null } as CourseRecord);
    await service.review('live2', { approve: true });
    await sync.idle();
    expect(repo.rows.find((r) => r.id === 'live2')!.appleSyncStatus).toBeNull();
  });

  test('the scheduler skips runAtBoot:false jobs at start and still runs them on the interval', async () => {
    const { JobScheduler } = await import('../src/jobs/scheduler');
    const ran: string[] = [];
    const scheduler = new JobScheduler([
      { name: 'boot', everyMs: 20, run: async () => void ran.push('boot') },
      { name: 'later', everyMs: 20, runAtBoot: false, run: async () => void ran.push('later') },
    ]);
    scheduler.start();
    await new Promise((r) => setTimeout(r, 5));
    expect(ran).toEqual(['boot']);
    await new Promise((r) => setTimeout(r, 40));
    scheduler.stop();
    expect(ran).toContain('later');
  });
});

describe('single-flight and per-key serialization', () => {
  function gated() {
    const gates: Array<() => void> = [];
    const log: string[] = [];
    let active = 0;
    let maxActive = 0;
    const syncer: AppStoreSyncer = {
      configured: true,
      syncSeatPrice: async (p) => {
        log.push(`seat:${p}`);
        active++; maxActive = Math.max(maxActive, active);
        await new Promise<void>((r) => gates.push(r));
        active--;
        return { status: 'SYNCED', detail: 'ok' };
      },
      syncRecordedCourse: async (c) => {
        log.push(`course:${c.slug}`);
        active++; maxActive = Math.max(maxActive, active);
        await new Promise<void>((r) => gates.push(r));
        active--;
        return { status: 'SYNCED', detail: 'ok', monthly: 'm', yearly: 'y' };
      },
    };
    const repo = new MemCourses();
    const store = new MemStore();
    const sync = new AppStoreSyncCoordinator(syncer, store, repo, clock, silent);
    const tick = () => new Promise((r) => setTimeout(r, 3));
    const release = async () => { gates.shift()?.(); await tick(); };
    return { sync, repo, store, log, tick, release, gates, max: () => maxActive };
  }

  test('the job and "Sync now" share one run, in both orders', async () => {
    const t = gated();
    t.store.open = [45_000];
    const job = t.sync.syncAppStoreCatalog();
    await t.tick();
    expect(t.sync.startSync()).toEqual({ started: true });
    expect(t.sync.syncAppStoreCatalog()).toBe(job);
    await t.tick();
    expect(t.log).toEqual(['seat:45000']);
    await t.release();
    await job;
    expect(t.log).toEqual(['seat:45000']);

    const t2 = gated();
    t2.store.open = [45_000];
    t2.sync.startSync();
    await t2.tick();
    const job2 = t2.sync.syncAppStoreCatalog();
    await t2.tick();
    expect(t2.log).toEqual(['seat:45000']);
    await t2.release();
    await job2;
    expect(t2.log).toEqual(['seat:45000']);
  });

  test('triggers for one course never overlap: later ones coalesce into a single follow-up', async () => {
    const t = gated();
    const c = t.repo.recorded('alpha');
    t.sync.recordedPricingChanged(c.id);
    await t.tick();
    t.sync.recordedPricingChanged(c.id);
    t.sync.recordedPricingChanged(c.id);
    await t.tick();
    expect(t.log).toEqual(['course:alpha']);
    await t.release();
    expect(t.log).toEqual(['course:alpha', 'course:alpha']);
    await t.release();
    await t.sync.idle();
    expect(t.log).toHaveLength(2);
    expect(t.max()).toBe(1);
  });

  test('seat triggers serialize per price, while different prices are independent', async () => {
    const t = gated();
    t.sync.seatPriceChanged(45_000);
    t.sync.seatPriceChanged(45_000);
    t.sync.seatPriceChanged(65_000);
    await t.tick();
    expect(t.log).toEqual(['seat:45000', 'seat:65000']);
    await t.release();
    await t.release();
    await t.release();
    await t.sync.idle();
    expect(t.log).toEqual(['seat:45000', 'seat:65000', 'seat:45000']);
  });
});

describe('nightly timing', () => {
  test('msUntilUtcHour lands on the next 23:00 UTC (03:00 UAE)', async () => {
    const { msUntilUtcHour } = await import('../src/jobs/scheduler');
    expect(msUntilUtcHour(new Date('2026-11-08T10:00:00Z'), 23)).toBe(13 * 3_600_000);
    expect(msUntilUtcHour(new Date('2026-11-08T23:00:00Z'), 23)).toBe(24 * 3_600_000);
    expect(msUntilUtcHour(new Date('2026-11-08T23:30:00Z'), 23)).toBe(23.5 * 3_600_000);
  });

  test('firstRunInMs delays the first run and then repeats', async () => {
    const { JobScheduler } = await import('../src/jobs/scheduler');
    let n = 0;
    const s = new JobScheduler([{ name: 'j', everyMs: 15, firstRunInMs: 20, run: async () => void n++ }]);
    s.start();
    await new Promise((r) => setTimeout(r, 8));
    expect(n).toBe(0);
    await new Promise((r) => setTimeout(r, 40));
    s.stop();
    expect(n).toBeGreaterThanOrEqual(2);
  });
});
