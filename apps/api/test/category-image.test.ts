import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { CategoryInput, UpdateCategoryInput } from '@azza/shared';
import { errorHandler } from '../src/http/error-handler';
import type { AppEnv, CurrentUser } from '../src/http/types';
import { MemoryFileStorage } from '../src/infrastructure/storage/local-disk-storage';
import { MAX_COURSE_COVER_BYTES } from '../src/modules/admin/course-media-file';
import { adminCategoryImageRoutes, categoryRoutes } from '../src/modules/categories/category.routes';
import { CategoryService, type CategoryRecord, type CategoryRepository } from '../src/modules/categories/category.service';

class MemCategories implements CategoryRepository {
  rows: CategoryRecord[] = [{ slug: 'design', nameEn: 'Design', nameAr: 'تصميم', icon: 'pen-tool', imageUrl: null, order: 0, active: true }];
  async list(all: boolean) {
    return this.rows.filter((r) => all || r.active).map((r) => ({ ...r, courseCount: 0 }));
  }
  async find(slug: string) {
    return this.rows.find((r) => r.slug === slug) ?? null;
  }
  async create(i: CategoryInput) {
    this.rows.push({ ...i, nameAr: i.nameAr ?? null, icon: i.icon ?? null, imageUrl: null });
    return this.rows.at(-1)!;
  }
  async update(slug: string, i: UpdateCategoryInput) {
    return Object.assign((await this.find(slug))!, i);
  }
  async delete(slug: string) {
    this.rows = this.rows.filter((r) => r.slug !== slug);
  }
  async setImage(slug: string, imageUrl: string | null) {
    return Object.assign((await this.find(slug))!, { imageUrl });
  }
  async courseCount() {
    return 0;
  }
}

const user = (role: CurrentUser['role']): CurrentUser => ({ id: 'u1', name: 'U', email: 'u@x.test', role, locale: 'en', timezone: 'Asia/Dubai' });

function make(who: CurrentUser | null) {
  const repo = new MemCategories();
  const storage = new MemoryFileStorage();
  const service = new CategoryService(repo, storage, () => {});
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.use('*', async (c, next) => (c.set('user', who), next()));
  app.route('/admin', adminCategoryImageRoutes(service));
  app.route('/categories', categoryRoutes(service));
  return { app, repo, storage, service };
}

const upload = (type = 'image/png', size = 16) => {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(size)], `tile.${type.split('/')[1]!.replace('svg+xml', 'svg')}`, { type }));
  return { method: 'POST', body: form };
};

describe('category images', () => {
  test('upload stores under category-images/ and the public list shows imageUrl', async () => {
    const { app, storage } = make(user('ADMIN'));
    const res = await app.request('/admin/categories/design/image', upload());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toMatch(/^http:\/\/files\.test\/category-images\/[0-9a-f]{32}\.png$/);
    expect([...storage.files.keys()]).toEqual([body.imageUrl.replace('http://files.test/', '')]);
    const list = await (await app.request('/categories')).json();
    expect(list.items[0]).toMatchObject({ slug: 'design', icon: 'pen-tool', imageUrl: body.imageUrl });
  });

  test('replacing deletes the previous stored file', async () => {
    const { app, storage } = make(user('ADMIN'));
    const first = (await (await app.request('/admin/categories/design/image', upload())).json()).imageUrl;
    const second = (await (await app.request('/admin/categories/design/image', upload('image/webp'))).json()).imageUrl;
    expect(second).not.toBe(first);
    expect(second.endsWith('.webp')).toBe(true);
    expect([...storage.files.keys()]).toEqual([second.replace('http://files.test/', '')]);
  });

  test('a replaced or removed image that is not ours (e.g. bundled /media) is left alone', async () => {
    const { app, repo, storage } = make(user('ADMIN'));
    repo.rows[0]!.imageUrl = 'https://cdn.example.com/art.png';
    expect((await app.request('/admin/categories/design/image', upload())).status).toBe(200);
    expect(storage.files.size).toBe(1);
  });

  test('delete clears imageUrl and removes the stored file', async () => {
    const { app, repo, storage } = make(user('ADMIN'));
    await app.request('/admin/categories/design/image', upload());
    const res = await app.request('/admin/categories/design/image', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect((await res.json()).imageUrl).toBeNull();
    expect(repo.rows[0]!.imageUrl).toBeNull();
    expect(storage.files.size).toBe(0);
    expect((await app.request('/admin/categories/design/image', { method: 'DELETE' })).status).toBe(200); // idempotent
  });

  test('cover rules: JPG/PNG/WEBP only, size limit, missing file, unknown category', async () => {
    const { app, storage } = make(user('ADMIN'));
    expect((await app.request('/admin/categories/design/image', upload('image/svg+xml'))).status).toBe(422);
    expect((await app.request('/admin/categories/design/image', upload('image/png', MAX_COURSE_COVER_BYTES + 1))).status).toBe(422);
    expect((await app.request('/admin/categories/design/image', { method: 'POST', body: new FormData() })).status).toBe(422);
    expect((await app.request('/admin/categories/nope/image', upload())).status).toBe(404);
    expect((await app.request('/admin/categories/nope/image', { method: 'DELETE' })).status).toBe(404);
    expect(storage.files.size).toBe(0);
  });

  test('admin-only', async () => {
    for (const [who, status] of [[null, 401], [user('STUDENT'), 403], [user('TEACHER'), 403]] as const) {
      const { app, storage } = make(who);
      expect((await app.request('/admin/categories/design/image', upload())).status).toBe(status);
      expect((await app.request('/admin/categories/design/image', { method: 'DELETE' })).status).toBe(status);
      expect(storage.files.size).toBe(0);
    }
  });

  test('deleting a category removes its stored image', async () => {
    const { service, storage } = make(user('ADMIN'));
    await service.create({ slug: 'art', nameEn: 'Art', order: 1, active: true });
    await service.uploadImage('art', { type: 'image/jpeg', size: 4, bytes: async () => new Uint8Array(4) });
    expect(storage.files.size).toBe(1);
    await service.delete('art');
    expect(storage.files.size).toBe(0);
  });
});
