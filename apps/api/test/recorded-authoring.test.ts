import { describe, expect, test } from 'bun:test';
import { createCourseInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import type { PaymentGateway } from '../src/core/ports';
import { FakePaymentGateway, StripePaymentGateway } from '../src/infrastructure/payments/stripe-gateway';
import { BatchService } from '../src/modules/batches/batch.service';
import type { BatchRepository } from '../src/modules/batches/batch.repository';
import type { BatchAccessPolicy } from '../src/modules/batches/batch-access';
import { ScheduleGenerator } from '../src/modules/batches/schedule-generator';
import type { CourseFilter, CourseRecord, CourseRepository, CourseWriteData } from '../src/modules/courses/course.repository';
import { PriceCalculator } from '../src/modules/payments/price-calculator';
import { CourseService } from '../src/modules/courses/course.service';
import { RecordingNotifier } from './fakes/in-memory';

const now = new Date('2026-11-07T10:00:00Z');
const clock = { now: () => now };
const admin = { id: 'nour', role: 'ADMIN' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };
const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const errOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e);

class InMemoryCourses implements CourseRepository {
  rows: CourseRecord[] = [];
  async list(f: CourseFilter) {
    const items = this.rows.filter((c) => !f.status || c.status === f.status);
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
      type: 'LIVE', priceFils: null, monthlyPriceFils: null, yearlyPriceFils: null, teacherCutPercent: null, previewLessonId: null,
      stripeProductId: null, stripeMonthlyPriceId: null, stripeYearlyPriceId: null, appleMonthlyProductId: null, appleYearlyProductId: null,
      ...rest,
      modules: modules.map((m, i) => ({ id: `m${i}`, order: m.order, titleEn: m.titleEn, titleAr: m.titleAr ?? null, descriptionEn: null, descriptionAr: null, lessons: [] })),
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
}

class RecordingGateway extends FakePaymentGateway {
  constructor() {
    super(new PriceCalculator(5));
  }
  calls: Array<Parameters<PaymentGateway['upsertRecordedProduct']>[0]> = [];
  override async upsertRecordedProduct(args: Parameters<PaymentGateway['upsertRecordedProduct']>[0]) {
    this.calls.push(args);
    return super.upsertRecordedProduct(args);
  }
}

const recorded = createCourseInput.parse({ titleEn: 'Arabic Calligraphy', category: 'arts', level: 'BEGINNER', type: 'RECORDED' });

async function setup() {
  const repo = new InMemoryCourses();
  const gateway = new RecordingGateway();
  const service = new CourseService(repo, new RecordingNotifier(), clock, undefined, gateway);
  const course = await service.create(recorded, admin);
  /** Give the course one lesson, as the lessons module would. */
  const addLesson = (id: string, courseId = course.id) => {
    const c = repo.rows.find((r) => r.id === courseId)!;
    c.modules[0]!.lessons = [...(c.modules[0]!.lessons ?? []), { id, order: 0, titleEn: 'L', titleAr: null }];
  };
  repo.rows[0]!.modules = [{ id: 'm0', order: 0, titleEn: 'M', titleAr: null, descriptionEn: null, descriptionAr: null, lessons: [] }];
  return { repo, gateway, service, course, addLesson };
}

describe('recorded course authoring', () => {
  test('a RECORDED course cannot be published without prices', async () => {
    const { service, course, addLesson } = await setup();
    addLesson('l1');
    const e = await errOf(service.update(course.id, { status: 'PUBLISHED' }, admin));
    expect(e?.code).toBe('RECORDED_NOT_READY');
    expect(e?.status).toBe(422);
    expect(e?.details).toEqual({ missing: ['PRICES'] });
  });

  test('a RECORDED course cannot be published without lessons, and reports both gaps', async () => {
    const { service, course } = await setup();
    expect((await errOf(service.update(course.id, { status: 'PUBLISHED' }, admin)))?.details).toEqual({ missing: ['PRICES', 'LESSONS'] });
    await service.setRecordedPricing(course.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    expect((await errOf(service.update(course.id, { status: 'PUBLISHED' }, admin)))?.details).toEqual({ missing: ['LESSONS'] });
  });

  test('with prices and a lesson it publishes, and approving a proposal follows the same rule', async () => {
    const { service, course, addLesson, repo } = await setup();
    addLesson('l1');
    await service.setRecordedPricing(course.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    expect((await service.update(course.id, { status: 'PUBLISHED' }, admin)).status).toBe('PUBLISHED');
    repo.rows[0]!.status = 'PENDING_REVIEW';
    repo.rows[0]!.monthlyPriceFils = null;
    expect(await codeOf(service.review(course.id, { approve: true }))).toBe('RECORDED_NOT_READY');
  });

  test('a price change sends the old price ids to the gateway and stores the new ones', async () => {
    const { service, gateway, course, repo } = await setup();
    const first = await service.setRecordedPricing(course.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    expect(first).toMatchObject({ monthlyPriceFils: 5000 });
    expect(repo.rows[0]).toMatchObject({ stripeProductId: `prod_fake_${course.id}`, stripeMonthlyPriceId: 'price_fake_m_5250', stripeYearlyPriceId: 'price_fake_y_52500' });
    expect(gateway.calls[0]).toMatchObject({ courseId: course.id, monthlyFils: 5000, yearlyFils: 50000, productId: undefined, currentMonthlyPriceId: undefined });

    const second = await service.setRecordedPricing(course.id, { monthlyPriceFils: 6000, yearlyPriceFils: 50000 });
    expect(gateway.calls[1]).toMatchObject({
      productId: `prod_fake_${course.id}`,
      currentMonthlyPriceId: 'price_fake_m_5250',
      currentYearlyPriceId: 'price_fake_y_52500',
      monthlyFils: 6000,
    });
    expect(second).toMatchObject({ monthlyPriceFils: 6000 });
    expect(repo.rows[0]).toMatchObject({ stripeMonthlyPriceId: 'price_fake_m_6300', stripeYearlyPriceId: 'price_fake_y_52500' });
  });

  test('the "from" price of a RECORDED course is the monthly price', async () => {
    const { service, course, addLesson } = await setup();
    addLesson('l1');
    await service.setRecordedPricing(course.id, { monthlyPriceFils: 7500, yearlyPriceFils: 60000 });
    await service.update(course.id, { status: 'PUBLISHED' }, admin);
    const dto = await service.get(course.id, null);
    expect(dto).toMatchObject({ type: 'RECORDED', priceFils: 7500, monthlyPriceFils: 7500, yearlyPriceFils: 60000, previewLessonId: 'l1', appleProducts: null }); // no choice: the first lesson
    expect((await service.list({ skip: 0, take: 20 }, null)).items[0]).toMatchObject({ priceFils: 7500, monthlyPriceFils: 7500 });
  });

  test('a LIVE course has no recorded pricing', async () => {
    const { service } = await setup();
    const live = await service.create(createCourseInput.parse({ titleEn: 'Live one', category: 'arts', level: 'BEGINNER' }), admin);
    expect(live.type).toBe('LIVE');
    expect(await codeOf(service.setRecordedPricing(live.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 }))).toBe('NOT_RECORDED');
  });

  test('a preview lesson from another course is a 404; the course editor can set and clear one', async () => {
    const { service, course, addLesson, repo } = await setup();
    addLesson('l1');
    const other = await service.create(createCourseInput.parse({ titleEn: 'Another', category: 'arts', level: 'BEGINNER', type: 'RECORDED' }), admin);
    expect(other.id).not.toBe(course.id);
    expect(await codeOf(service.setPreviewLesson(course.id, { lessonId: 'nope' }, admin))).toBe('NOT_FOUND');
    expect((await service.setPreviewLesson(course.id, { lessonId: 'l1' }, admin)).previewLessonId).toBe('l1');
    expect(await codeOf(service.setPreviewLesson(other.id, { lessonId: 'l1' }, admin))).toBe('NOT_FOUND');
    // Cleared, the free lesson falls back to the first one in curriculum order.
    expect((await service.setPreviewLesson(course.id, { lessonId: null }, admin)).previewLessonId).toBe('l1');
    // A teacher who did not propose the course cannot change it.
    repo.rows[0]!.createdById = 'someone';
    expect(await codeOf(service.setPreviewLesson(course.id, { lessonId: 'l1' }, lina))).toBe('FORBIDDEN');
  });

  test('Apple product ids must match the course slug', async () => {
    const { service, course } = await setup();
    const monthly = `com.futuretech.azza.rec.${course.slug}.monthly`;
    const yearly = `com.futuretech.azza.rec.${course.slug}.yearly`;
    expect(await codeOf(service.setAppleProducts(course.id, { monthly: 'com.example.wrong' }))).toBe('APPLE_PRODUCT_MISMATCH');
    expect(await codeOf(service.setAppleProducts(course.id, { yearly: monthly }))).toBe('APPLE_PRODUCT_MISMATCH');
    const ok = await service.setAppleProducts(course.id, { monthly, yearly });
    expect(ok).toMatchObject({ appleMonthlyProductId: monthly, appleYearlyProductId: yearly });
    expect((await service.get(course.id, admin)).appleProducts).toEqual({ monthly, yearly });
  });

  test('the course DTO hides Stripe ids', async () => {
    const { service, course } = await setup();
    await service.setRecordedPricing(course.id, { monthlyPriceFils: 5000, yearlyPriceFils: 50000 });
    const dto = (await service.get(course.id, admin)) as Record<string, unknown>;
    expect(dto.stripeProductId).toBeUndefined();
    expect(dto.stripeMonthlyPriceId).toBeUndefined();
  });
});

describe('batches on recorded courses', () => {
  test('creating a batch on a RECORDED course fails with RECORDED_HAS_NO_BATCHES', async () => {
    const { repo, course } = await setup();
    const batches = new BatchService({} as BatchRepository, repo, new ScheduleGenerator(), {} as BatchAccessPolicy, new RecordingNotifier(), clock);
    const input = { courseId: course.id, code: 'B1' } as unknown as Parameters<BatchService['create']>[0];
    const e = await errOf(batches.create(input, admin));
    expect(e?.code).toBe('RECORDED_HAS_NO_BATCHES');
    expect(e?.status).toBe(422);
  });
});

describe('Stripe Price rotation (upsertRecordedProduct)', () => {
  /** A Stripe client stand-in: just the product and price calls, in order. */
  const stripeWith = (opts: { failCreateAt?: number } = {}) => {
    const calls: string[] = [];
    let creates = 0;
    const prices: Record<string, { id: string; active: boolean; unit_amount: number; tax_behavior: string; recurring: { interval: string } }> = {
      price_m_old: { id: 'price_m_old', active: true, unit_amount: 5250, tax_behavior: 'inclusive', recurring: { interval: 'month' } },
      price_y_old: { id: 'price_y_old', active: true, unit_amount: 52500, tax_behavior: 'inclusive', recurring: { interval: 'year' } },
    };
    const client = {
      products: { update: async (id: string) => ({ id }), create: async () => ({ id: 'prod_new' }) },
      prices: {
        retrieve: async (id: string) => prices[id],
        create: async (p: { recurring: { interval: string }; unit_amount: number }) => {
          creates++;
          calls.push(`create:${p.recurring.interval}`);
          if (creates === opts.failCreateAt) throw new Error('stripe 500');
          return { id: `price_${p.recurring.interval}_${p.unit_amount}` };
        },
        update: async (id: string, data: { active: boolean }) => {
          calls.push(`archive:${id}:${data.active}`);
          return { id };
        },
      },
    };
    const gateway = new StripePaymentGateway('sk_test_dummy', undefined, new PriceCalculator(5));
    (gateway as unknown as { stripe: unknown }).stripe = client;
    return { gateway, calls };
  };
  const both = { name: 'C', courseId: 'c1', productId: 'prod_1', currentMonthlyPriceId: 'price_m_old', currentYearlyPriceId: 'price_y_old', monthlyFils: 6000, yearlyFils: 60000 };

  test('both new Prices are created before either old one is archived', async () => {
    const { gateway, calls } = stripeWith();
    const out = await gateway.upsertRecordedProduct(both);
    expect(out).toEqual({ productId: 'prod_1', monthlyPriceId: 'price_month_6300', yearlyPriceId: 'price_year_63000' });
    expect(calls).toEqual(['create:month', 'create:year', 'archive:price_m_old:false', 'archive:price_y_old:false']);
  });

  test('if the second create fails, nothing is archived', async () => {
    const { gateway, calls } = stripeWith({ failCreateAt: 2 });
    expect(await gateway.upsertRecordedProduct(both).then(() => null, (e: Error) => e.message)).toBe('stripe 500');
    expect(calls).toEqual(['create:month', 'create:year']);
  });

  test('an unchanged Price is kept and not archived', async () => {
    const { gateway, calls } = stripeWith();
    const out = await gateway.upsertRecordedProduct({ ...both, monthlyFils: 5000 });
    expect(out.monthlyPriceId).toBe('price_m_old');
    expect(calls).toEqual(['create:year', 'archive:price_y_old:false']);
  });
});
