import { describe, expect, test } from 'bun:test';
import type { CategoryInput } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { CategoryService, type CategoryRecord, type CategoryRepository } from '../src/modules/categories/category.service';
import { ReviewService, firstName, type ReviewRecord, type ReviewRepository, type ReviewWrite, type TestimonialRecord } from '../src/modules/reviews/review.service';
import { RecordingNotifier } from './fakes/in-memory';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const sara = { id: 'sara', role: 'STUDENT' as const };
const omar = { id: 'omar', role: 'STUDENT' as const };
const lina = { id: 'lina', role: 'TEACHER' as const };
const admin = { id: 'nour', role: 'ADMIN' as const };

class InMemoryReviews implements ReviewRepository {
  rows: ReviewRecord[] = [];
  eligible = new Set(['sara']);
  names: Record<string, string> = {};
  coursePublished = true;
  aggregate = { ratingAvg: 0, ratingCount: 0 };
  async courseExists(id: string) {
    return id === 'c1' || id === 'ux-basics' ? { id: 'c1', titleEn: 'UX Basics' } : null;
  }
  async list(courseId: string, o: { includeHidden: boolean; skip: number; take: number }) {
    const items = this.rows.filter((r) => r.courseId === courseId && (o.includeHidden || !r.hidden));
    return { items: items.slice(o.skip, o.skip + o.take), total: items.length };
  }
  async distribution(courseId: string) {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of this.rows) if (r.courseId === courseId && !r.hidden) d[r.rating as 1]++;
    return d;
  }
  async find(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findMine(courseId: string, userId: string) {
    return this.rows.find((r) => r.courseId === courseId && r.userId === userId) ?? null;
  }
  async canReview(_c: string, userId: string) {
    return this.eligible.has(userId);
  }
  async upsert(courseId: string, userId: string, input: ReviewWrite) {
    const mine = await this.findMine(courseId, userId);
    if (mine) return Object.assign(mine, input);
    const at = new Date();
    const { featuredAt: _f, ...create } = input;
    const row: ReviewRecord = {
      id: `r${this.rows.length + 1}`,
      courseId,
      userId,
      quoteConsent: false,
      featuredAt: null,
      ...create,
      teacherReply: null,
      repliedAt: null,
      hidden: false,
      createdAt: at,
      updatedAt: at,
      user: { id: userId, name: this.names[userId] ?? userId, image: null },
    };
    this.rows.push(row);
    return row;
  }
  private withCourse(r: ReviewRecord): TestimonialRecord {
    return { ...r, course: { id: 'c1', slug: 'ux-basics', titleEn: 'UX Basics', titleAr: 'أساسيات تجربة المستخدم' } };
  }
  async featured(o: { courseId?: string; take: number }) {
    if (!this.coursePublished) return [];
    return this.rows
      .filter((r) => r.featuredAt && r.quoteConsent && !r.hidden && (!o.courseId || r.courseId === o.courseId))
      .slice(0, o.take)
      .map((r) => this.withCourse(r));
  }
  async consented(o: { featured?: boolean; courseId?: string; skip: number; take: number }) {
    const items = this.rows.filter((r) => r.quoteConsent && (o.featured === undefined || !!r.featuredAt === o.featured));
    return { items: items.slice(o.skip, o.skip + o.take).map((r) => this.withCourse(r)), total: items.length };
  }
  async delete(id: string) {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
  async update(id: string, d: Partial<ReviewRecord>) {
    return Object.assign((await this.find(id))!, d);
  }
  async refreshAggregate(courseId: string) {
    const v = this.rows.filter((r) => r.courseId === courseId && !r.hidden);
    this.aggregate = { ratingAvg: v.length ? v.reduce((a, r) => a + r.rating, 0) / v.length : 0, ratingCount: v.length };
    return this.aggregate;
  }
  async teacherIds() {
    return ['lina'];
  }
}

function setup() {
  const repo = new InMemoryReviews();
  const notifier = new RecordingNotifier();
  return { repo, notifier, service: new ReviewService(repo, notifier, () => new Date('2026-11-06T10:00:00Z')) };
}

describe('course reviews', () => {
  test('only students who attended a session may review; one review each, editable', async () => {
    const { repo, service, notifier } = setup();
    expect(await codeOf(service.upsert('c1', { rating: 5, body: '' }, omar))).toBe('REVIEW_NOT_ELIGIBLE');
    expect(await codeOf(service.upsert('c1', { rating: 5, body: '' }, lina))).toBe('FORBIDDEN');
    await service.upsert('ux-basics', { rating: 4, body: 'Clear and practical' }, sara);
    await service.upsert('c1', { rating: 5, body: 'Even better after S06' }, sara);
    expect(repo.rows).toHaveLength(1);
    expect(repo.aggregate).toEqual({ ratingAvg: 5, ratingCount: 1 });
    expect(notifier.sent).toMatchObject([{ userIds: ['lina'], notice: { type: 'COURSE_REVIEWED' } }]);
  });

  test('list returns the summary, my review and whether I can review', async () => {
    const { repo, service } = setup();
    repo.eligible.add('omar');
    await service.upsert('c1', { rating: 5, body: '' }, sara);
    await service.upsert('c1', { rating: 3, body: '' }, omar);
    const res = await service.list('c1', 1, 20, sara);
    expect(res.summary).toEqual({ ratingAvg: 4, ratingCount: 2, distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 } });
    expect(res.mine?.rating).toBe(5);
    expect(res.canReview).toBe(true);
    expect((await service.list('c1', 1, 20, null)).canReview).toBe(false);
    expect(await codeOf(service.list('nope', 1, 20, null))).toBe('NOT_FOUND');
  });

  test('teacher of the course replies and the student is told; others cannot', async () => {
    const { service, notifier } = setup();
    const r = await service.upsert('c1', { rating: 2, body: 'Too fast' }, sara);
    expect(await codeOf(service.reply(r.id, 'Thanks', { id: 'someone', role: 'TEACHER' }))).toBe('FORBIDDEN');
    expect((await service.reply(r.id, 'We slowed S03 down', lina)).teacherReply).toBe('We slowed S03 down');
    expect(notifier.types()).toContain('COURSE_REVIEW_REPLIED');
  });

  test('hidden reviews drop out of the average and the public list, admins still see them', async () => {
    const { repo, service } = setup();
    const r = await service.upsert('c1', { rating: 1, body: 'spam' }, sara);
    await service.moderate(r.id, true);
    expect(repo.aggregate.ratingCount).toBe(0);
    expect((await service.list('c1', 1, 20, null)).items).toHaveLength(0);
    expect((await service.list('c1', 1, 20, admin)).items).toHaveLength(1);
  });
});

describe('testimonials', () => {
  const long = 'The teacher explained every step and checked our work each week.';

  test('a new review starts without consent; leaving it out on an edit keeps the choice', async () => {
    const { service } = setup();
    const r = await service.upsert('c1', { rating: 5, body: long }, sara);
    expect(r.quoteConsent).toBe(false);
    await service.upsert('c1', { rating: 5, body: long, quoteConsent: true }, sara);
    const kept = await service.upsert('c1', { rating: 4, body: long }, sara);
    expect(kept.quoteConsent).toBe(true);
  });

  test('admins feature only consented, visible reviews with enough text from learners still enrolled', async () => {
    const { repo, service } = setup();
    repo.eligible.add('omar');
    const noConsent = await service.upsert('c1', { rating: 5, body: long }, sara);
    expect(await codeOf(service.feature(noConsent.id, true))).toBe('TESTIMONIAL_NO_CONSENT');

    const short = await service.upsert('c1', { rating: 5, body: 'Great', quoteConsent: true }, omar);
    expect(await codeOf(service.feature(short.id, true))).toBe('TESTIMONIAL_TOO_SHORT');

    const ok = await service.upsert('c1', { rating: 4, body: long, quoteConsent: true }, sara);
    await service.moderate(ok.id, true);
    expect(await codeOf(service.feature(ok.id, true))).toBe('TESTIMONIAL_HIDDEN');
    await service.moderate(ok.id, false);

    repo.eligible.delete('sara'); // refunded or removed from the class since writing
    expect(await codeOf(service.feature(ok.id, true))).toBe('TESTIMONIAL_NOT_ELIGIBLE');
    repo.eligible.add('sara');

    const featured = await service.feature(ok.id, true);
    expect(featured.featuredAt).toEqual(new Date('2026-11-06T10:00:00Z'));
    expect(await codeOf(service.feature('missing', true))).toBe('NOT_FOUND');
    expect((await service.feature(ok.id, false)).featuredAt).toBeNull();
  });

  test('withdrawing consent, cutting the text or hiding the review unfeatures it', async () => {
    const { repo, service } = setup();
    const r = await service.upsert('c1', { rating: 5, body: long, quoteConsent: true }, sara);
    await service.feature(r.id, true);
    await service.upsert('c1', { rating: 5, body: long, quoteConsent: false }, sara);
    expect(repo.rows[0]!.featuredAt).toBeNull();

    await service.upsert('c1', { rating: 5, body: long, quoteConsent: true }, sara);
    await service.feature(r.id, true);
    await service.upsert('c1', { rating: 5, body: 'ok' }, sara);
    expect(repo.rows[0]!.featuredAt).toBeNull();

    await service.upsert('c1', { rating: 5, body: long }, sara);
    await service.feature(r.id, true);
    await service.moderate(r.id, true);
    expect(repo.rows[0]!.featuredAt).toBeNull();
  });

  test('the public list shows the first name, the course and the text only', async () => {
    const { repo, service } = setup();
    repo.names.sara = 'Sara Al Mansoori';
    const r = await service.upsert('c1', { rating: 5, body: `  ${long}  `, quoteConsent: true }, sara);
    expect((await service.testimonials(undefined, 6)).items).toEqual([]);
    await service.feature(r.id, true);
    const { items } = await service.testimonials('ux-basics', 6);
    expect(items).toEqual([{ id: r.id, firstName: 'Sara', body: long, course: { slug: 'ux-basics', titleEn: 'UX Basics', titleAr: 'أساسيات تجربة المستخدم' } }]);
    expect(JSON.stringify(items)).not.toContain('Mansoori');
    expect(JSON.stringify(items)).not.toContain('rating');
    expect((await service.testimonials('unknown-course', 6)).items).toEqual([]);
    repo.coursePublished = false;
    expect((await service.testimonials(undefined, 6)).items).toEqual([]);
  });

  test('admin list marks which consented reviews can be featured', async () => {
    const { repo, service } = setup();
    repo.eligible.add('omar');
    await service.upsert('c1', { rating: 5, body: long, quoteConsent: true }, sara);
    await service.upsert('c1', { rating: 5, body: 'Short', quoteConsent: true }, omar);
    await service.upsert('c1', { rating: 5, body: long }, { id: 'omar', role: 'STUDENT' });
    const res = await service.consented({ page: 1, pageSize: 10 });
    expect(res.total).toBe(2);
    expect(res.items.map((i) => [i.userId, i.quotable])).toEqual([
      ['sara', true],
      ['omar', true],
    ]);
  });

  test('first names keep Arabic compound names whole', () => {
    expect(firstName('عبد الله الكعبي')).toBe('عبد الله');
    expect(firstName('  مريم   سالم ')).toBe('مريم');
    expect(firstName('Abdul Rahman Khan')).toBe('Abdul Rahman');
    expect(firstName('Lina')).toBe('Lina');
  });
});

describe('categories', () => {
  class InMemoryCategories implements CategoryRepository {
    rows: CategoryRecord[] = [{ slug: 'design', nameEn: 'Design', nameAr: 'تصميم', icon: 'pen-tool', imageUrl: null, order: 0, active: true }];
    used = new Set(['design']);
    async list(all: boolean) {
      return this.rows.filter((r) => all || r.active).map((r) => ({ ...r, courseCount: this.used.has(r.slug) ? 1 : 0 }));
    }
    async find(slug: string) {
      return this.rows.find((r) => r.slug === slug) ?? null;
    }
    async create(i: CategoryInput) {
      this.rows.push({ ...i, nameAr: i.nameAr ?? null, icon: i.icon ?? null, imageUrl: null });
      return this.rows.at(-1)!;
    }
    async update(slug: string, i: Partial<CategoryRecord>) {
      return Object.assign((await this.find(slug))!, i);
    }
    async delete(slug: string) {
      this.rows = this.rows.filter((r) => r.slug !== slug);
    }
    async setImage(slug: string, imageUrl: string | null) {
      return Object.assign((await this.find(slug))!, { imageUrl });
    }
    async courseCount(slug: string) {
      return this.used.has(slug) ? 1 : 0;
    }
  }

  test('create, hide and delete only when empty', async () => {
    const service = new CategoryService(new InMemoryCategories());
    await service.create({ slug: 'languages', nameEn: 'Languages', order: 1, active: true });
    expect(await codeOf(service.create({ slug: 'languages', nameEn: 'Again', order: 1, active: true }))).toBe('CONFLICT');
    expect(await codeOf(service.delete('design'))).toBe('CONFLICT');
    await service.update('design', { active: false });
    expect((await service.list()).items.map((c) => c.slug)).toEqual(['languages']);
    expect((await service.list(true)).items).toHaveLength(2);
    expect(await service.delete('languages')).toEqual({ ok: true });
    expect(await service.exists('languages')).toBe(false);
  });
});
