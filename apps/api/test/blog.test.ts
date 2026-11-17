import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { BlogPostStatus, Role } from '@azza/shared';
import type { AppError } from '../src/core/errors';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { adminBlogRoutes, blogRoutes } from '../src/modules/blog/blog.routes';
import { BlogService, type BlogPostData, type BlogPostRecord, type BlogRelatedCourse, type BlogRepository } from '../src/modules/blog/blog.service';

const codeOf = (p: Promise<unknown>) => p.then(() => null, (e: AppError) => e.code);
const NOW = new Date('2026-11-18T09:00:00Z');

const course = (id: string, status = 'PUBLISHED'): BlogRelatedCourse => ({
  id,
  slug: `${id}-slug`,
  titleEn: id,
  titleAr: null,
  coverStyle: 'sun',
  coverImageUrl: null,
  category: 'design',
  categoryRef: { slug: 'design', nameEn: 'Design', nameAr: 'تصميم', icon: null, imageUrl: null },
  level: 'BEGINNER',
  type: 'LIVE',
  status,
  ratingAvg: 0,
  ratingCount: 0,
});

class MemBlog implements BlogRepository {
  rows: BlogPostRecord[] = [];
  courses = new Map([
    ['c1', course('c1')],
    ['c2', course('c2', 'ARCHIVED')],
  ]);
  users: Record<string, Role> = { lina: 'TEACHER', sara: 'STUDENT' };
  private live = (p: BlogPostRecord, now: Date) => p.status === 'PUBLISHED' && !!p.publishedAt && p.publishedAt <= now;
  async listPublished(o: { now: Date; category?: string; skip: number; take: number }) {
    const items = this.rows
      .filter((p) => this.live(p, o.now) && (!o.category || p.categorySlug === o.category))
      .sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime());
    return { items: items.slice(o.skip, o.skip + o.take), total: items.length };
  }
  async findPublishedBySlug(slug: string, now: Date) {
    return this.rows.find((p) => p.slug === slug && this.live(p, now)) ?? null;
  }
  async publishedSlugs(now: Date) {
    return this.rows.filter((p) => this.live(p, now)).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt, hasEn: !!p.titleEn && !!p.bodyEn, categorySlug: p.categorySlug }));
  }
  async listAll(o: { status?: BlogPostStatus; skip: number; take: number }) {
    const items = this.rows.filter((p) => !o.status || p.status === o.status);
    return { items: items.slice(o.skip, o.skip + o.take), total: items.length };
  }
  async find(id: string) {
    return this.rows.find((p) => p.id === id) ?? null;
  }
  async slugOwner(slug: string) {
    return this.rows.find((p) => p.slug === slug)?.id ?? null;
  }
  async categoryExists(slug: string) {
    return slug === 'design';
  }
  async userRole(id: string) {
    return this.users[id] ?? null;
  }
  async existingCourseIds(ids: string[]) {
    return ids.filter((i) => this.courses.has(i));
  }
  private hydrate(p: BlogPostRecord, courseIds?: string[]) {
    p.category = p.categorySlug ? { slug: p.categorySlug, nameEn: 'Design', nameAr: 'تصميم' } : null;
    p.author = p.authorId ? { id: p.authorId, name: 'Lina Haddad', image: null } : null;
    if (courseIds) p.courses = courseIds.map((c) => this.courses.get(c)!);
    return p;
  }
  async create(data: BlogPostData, courseIds: string[]) {
    const row = { ...data, id: `p${this.rows.length + 1}`, createdAt: NOW, updatedAt: NOW, category: null, author: null, courses: [] } as BlogPostRecord;
    this.rows.push(row);
    return this.hydrate(row, courseIds);
  }
  async update(id: string, data: Partial<BlogPostData>, courseIds?: string[]) {
    return this.hydrate(Object.assign((await this.find(id))!, data), courseIds);
  }
  async delete(id: string) {
    this.rows = this.rows.filter((p) => p.id !== id);
  }
}

const base = { slug: 'learn-excel', titleAr: 'كيف تتعلم إكسل', titleEn: null, excerptAr: 'مقدمة قصيرة', excerptEn: null, bodyAr: '# إكسل\n\nنص المقال', bodyEn: null, coverImageUrl: null, categorySlug: null, tags: [], authorId: null, courseIds: [], status: 'DRAFT' as const };

function setup(now = NOW) {
  const repo = new MemBlog();
  let clock = now;
  const service = new BlogService(repo, () => clock);
  return { repo, service, tick: (d: Date) => (clock = d) };
}

describe('blog: admin writing rules', () => {
  test('drafts are hidden from the public; publishing without a date means now', async () => {
    const { service } = setup();
    const draft = await service.create(base);
    expect(draft.live).toBe(false);
    expect(draft.publishedAt).toBeNull();
    expect(await codeOf(service.get('learn-excel'))).toBe('NOT_FOUND');
    expect((await service.list({ page: 1, pageSize: 12 })).items).toHaveLength(0);

    const pub = await service.update(draft.id, { status: 'PUBLISHED' });
    expect(pub.publishedAt).toEqual(NOW);
    expect(pub.live).toBe(true);
    expect((await service.get('learn-excel')).titleAr).toBe('كيف تتعلم إكسل');
  });

  test('a future date schedules the post; it goes live when the date passes', async () => {
    const { service, tick } = setup();
    await service.create({ ...base, status: 'PUBLISHED', publishedAt: new Date('2026-11-20T06:00:00Z') });
    expect(await codeOf(service.get('learn-excel'))).toBe('NOT_FOUND');
    expect((await service.sitemap()).items).toHaveLength(0);
    tick(new Date('2026-11-20T06:00:01Z'));
    expect((await service.get('learn-excel')).slug).toBe('learn-excel');
  });

  test('editing or republishing keeps the first publish date; unpublishing hides the post', async () => {
    const { service, tick } = setup();
    const p = await service.create({ ...base, status: 'PUBLISHED' });
    tick(new Date('2026-12-01T00:00:00Z'));
    expect((await service.update(p.id, { titleAr: 'عنوان أوضح للمقال' })).publishedAt).toEqual(NOW);
    await service.update(p.id, { status: 'DRAFT' });
    expect(await codeOf(service.get('learn-excel'))).toBe('NOT_FOUND');
    expect((await service.update(p.id, { status: 'PUBLISHED' })).publishedAt).toEqual(NOW);
  });

  test('slug, category, author and related courses are checked', async () => {
    const { service } = setup();
    const first = await service.create(base);
    expect(await codeOf(service.create(base))).toBe('BLOG_SLUG_TAKEN');
    expect((await service.update(first.id, { slug: 'learn-excel' })).slug).toBe('learn-excel'); // its own slug
    expect(await codeOf(service.create({ ...base, slug: 'b', categorySlug: 'cooking' }))).toBe('BLOG_CATEGORY_UNKNOWN');
    expect(await codeOf(service.create({ ...base, slug: 'c', authorId: 'sara' }))).toBe('BLOG_AUTHOR_NOT_TEACHER');
    expect(await codeOf(service.create({ ...base, slug: 'd', courseIds: ['c1', 'ghost'] }))).toBe('BLOG_COURSE_UNKNOWN');
    expect(await codeOf(service.create({ ...base, slug: 'e', titleEn: 'How to learn Excel' }))).toBe('BLOG_ENGLISH_INCOMPLETE');
    const ok = await service.create({ ...base, slug: 'f', authorId: 'lina', categorySlug: 'design', courseIds: ['c1'] });
    expect(ok.author?.name).toBe('Lina Haddad');
    expect(await codeOf(service.update('nope', {}))).toBe('NOT_FOUND');
    expect(await service.delete(ok.id)).toEqual({ ok: true });
    expect(await codeOf(service.delete(ok.id))).toBe('NOT_FOUND');
  });
});

describe('blog: public pages', () => {
  test('list is newest first, filters by category, omits bodies and says which posts have English', async () => {
    const { service, tick } = setup();
    await service.create({ ...base, slug: 'one', status: 'PUBLISHED', categorySlug: 'design' });
    tick(new Date('2026-11-18T10:00:00Z'));
    await service.create({ ...base, slug: 'two', status: 'PUBLISHED', titleEn: 'Two', bodyEn: 'Body' });
    const all = await service.list({ page: 1, pageSize: 12 });
    expect(all.items.map((p) => p.slug)).toEqual(['two', 'one']);
    expect(all.items.map((p) => p.hasEn)).toEqual([true, false]);
    expect(all.items[0]).not.toHaveProperty('bodyAr');
    expect(all.pageCount).toBe(1);
    expect((await service.list({ page: 1, pageSize: 12, category: 'design' })).items.map((p) => p.slug)).toEqual(['one']);
    expect((await service.list({ page: 2, pageSize: 1 })).items.map((p) => p.slug)).toEqual(['one']);
  });

  test('a post shows only its published related courses, in order', async () => {
    const { service } = setup();
    await service.create({ ...base, status: 'PUBLISHED', courseIds: ['c2', 'c1'] });
    expect((await service.get('learn-excel')).courses.map((c) => c.id)).toEqual(['c1']);
  });

  test('routes: public reads are open, writing needs an admin', async () => {
    const make = (who: CurrentUser | null) => {
      const { service } = setup();
      const app = new Hono<AppEnv>();
      app.onError(errorHandler);
      app.use('*', async (c, next) => (c.set('user', who), next()));
      app.route('/blog', blogRoutes(service));
      app.route('/admin', adminBlogRoutes(service));
      return app;
    };
    const user = (role: CurrentUser['role']): CurrentUser => ({ id: 'u1', name: 'U', email: 'u@x.test', role, locale: 'ar', timezone: 'Asia/Dubai' });
    const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const post = { slug: 'Learn-Excel', titleAr: 'كيف تتعلم إكسل', bodyAr: 'نص', status: 'PUBLISHED' };

    expect((await make(null).request('/admin/blog', json(post))).status).toBe(401);
    expect((await make(user('TEACHER')).request('/admin/blog', json(post))).status).toBe(403);
    const admin = make(user('ADMIN'));
    expect((await admin.request('/admin/blog', json({ ...post, slug: 'لا' }))).status).toBe(400);
    const created = await admin.request('/admin/blog', json(post));
    expect(created.status).toBe(201);
    expect((await created.json()).slug).toBe('learn-excel');
    const list = await (await admin.request('/blog?pageSize=5')).json();
    expect(list.items.map((p: { slug: string }) => p.slug)).toEqual(['learn-excel']);
    expect((await admin.request('/blog/learn-excel')).status).toBe(200);
    expect((await admin.request('/blog/missing')).status).toBe(404);
    expect((await (await admin.request('/blog/sitemap')).json()).items).toHaveLength(1);
  });
});
